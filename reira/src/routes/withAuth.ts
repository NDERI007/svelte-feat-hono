import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { z } from "zod";

import type { AppContext } from "@/types/hono";
import { CacheService } from "@/config/cache";
import {
  base64ToUint8Array,
  constantTimeEqual,
  generateOTP,
  generateSecureRandomString,
  hashSecret,
  timingSafeEqual,
  uint8ArrayToBase64,
} from "@/utils/session";

const app = new Hono<AppContext>();

// Constants
const OTP_TTL = 600; // 10 minutes
const RESEND_COOLDOWN = 30; // 30 seconds
const INACTIVITY_TIMEOUT = 60 * 60 * 24 * 10; // 10 days
const ACTIVITY_CHECK_INTERVAL = 60 * 60; // 1 hour
const MAX_OTP_ATTEMPTS = 5;
const MAX_SEND_ATTEMPTS = 10;
const ATTEMPT_WINDOW = 60 * 60; // 1 hour

// --- HELPER: Redis Rate Limiter ---
async function checkRateLimit(
  cache: CacheService,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; ttl: number; current: number }> {
  const current = await cache.incr(key);
  if (current === 1) {
    await cache.expire(key, windowSeconds);
  }
  const ttl = await cache.ttl(key);
  return { allowed: current <= limit, ttl, current };
}

// --- SESSION TYPES ---
interface SessionData {
  userID: string;
  email: string;
  role: string;
  two_factor_enabled: boolean;
  secretHash: string;
  lastVerifiedAt: number;
  createdAt: number;
  ipAddress?: string;
  userAgent?: string;
}

interface ValidationResult {
  valid: boolean;
  session?: SessionData;
  shouldRefresh?: boolean;
  reason?: string;
}

// --- 1. SEND OTP ---
const emailSchema = z.email().toLowerCase().trim();
// Accepts number or string, converts to string, cleans whitespace
const otpSchema = z
  .union([z.string(), z.number()])
  .transform((val) => String(val).replace(/\s+/g, "").trim())
  .refine((val) => /^\d{6}$/.test(val), { message: "OTP must be 6 digits" });

// SEND OTP

app.post("/send-otp", async (c) => {
  try {
    const body = await c.req.json();
    const parse = emailSchema.safeParse(body.email);

    if (!parse.success) return c.json({ error: "Valid email required" }, 400);
    const email = parse.data;

    const cache = c.var.cache;

    // 1. Check Rate Limits
    const limit = await checkRateLimit(
      cache,
      `otp_send_attempts:${email}`,
      MAX_SEND_ATTEMPTS,
      ATTEMPT_WINDOW
    );
    if (!limit.allowed) {
      return c.json({ error: "Too many requests", retryAfter: limit.ttl }, 429);
    }

    // 2. Check Cooldown
    const cooldown = await cache.ttl(`otp_cooldown:${email}`);
    if (cooldown > 0) {
      return c.json({ error: `Wait ${cooldown}s`, retryAfter: cooldown }, 429);
    }

    // 3. Generate & Save
    const code = await generateOTP();

    // Reset verify attempts on new send
    await Promise.all([
      cache.set(`otp:${email}`, code, OTP_TTL),
      cache.set(`otp_cooldown:${email}`, "1", RESEND_COOLDOWN),
      cache.del(`otp_verify_attempts:${email}`),
    ]);

    // 4. Send Email
    await c.var.resend.sendOtpEmail(email, code);

    return c.json({ message: "OTP sent", expiresIn: OTP_TTL });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return c.json({ error: "Internal Error" }, 500);
  }
});

// VERIFY OTP

app.post("/verify-otp", async (c) => {
  const cache = c.var.cache;
  const supabase = c.var.supabase;

  try {
    const body = await c.req.json();

    // 1. Validate Inputs
    const emailParse = emailSchema.safeParse(body.email);
    const otpParse = otpSchema.safeParse(body.code);

    if (!emailParse.success) return c.json({ error: "Invalid email" }, 400);
    if (!otpParse.success) return c.json({ error: "Invalid OTP format" }, 400);

    const email = emailParse.data;
    const inputCode = otpParse.data; // This is guaranteed to be a string now

    // 2. Check Rate Limits
    const limit = await checkRateLimit(
      cache,
      `otp_verify_attempts:${email}`,
      MAX_OTP_ATTEMPTS,
      OTP_TTL
    );

    if (!limit.allowed) {
      // Security: Burn the OTP if they spam verify
      await cache.del(`otp:${email}`);
      return c.json(
        { error: "Too many failed attempts", retryAfter: limit.ttl },
        429
      );
    }

    const rawStoredCode = await cache.get<string | number>(`otp:${email}`);

    if (!rawStoredCode) {
      return c.json({ error: "OTP expired or not found" }, 400);
    }

    // Force conversion to string to prevent Type Mismatch
    const storedCode = String(rawStoredCode);

    // 4. Compare
    const isValid = timingSafeEqual(storedCode, inputCode);

    if (!isValid) {
      return c.json(
        {
          error: "Invalid OTP",
          attemptsRemaining: Math.max(0, MAX_OTP_ATTEMPTS - limit.current),
        },
        400
      );
    }

    // 5. Cleanup (Success)
    await Promise.all([
      cache.del(`otp:${email}`),
      cache.del(`otp_verify_attempts:${email}`),
      cache.del(`otp_cooldown:${email}`),
    ]);

    // Ensure Profile
    const { data, error: rpcError } = await supabase.rpc(
      "ensure_profile_exists",
      { p_email: email }
    );

    if (rpcError || !data?.[0]) {
      console.error("RPC Error:", rpcError);
      return c.json({ error: "Login failed (Profile Error)" }, 500);
    }

    const user = data[0]; // { id, role, two_factor_enabled }

    // Generate Session
    const sessionId = generateSecureRandomString();
    const sessionSecret = generateSecureRandomString();
    const sessionToken = `${sessionId}.${sessionSecret}`;

    const sessionData = {
      userID: user.id,
      email,
      role: user.role,
      two_factor_enabled: user.two_factor_enabled,
      secretHash: uint8ArrayToBase64(await hashSecret(sessionSecret)),
      lastVerifiedAt: Date.now(),
      createdAt: Date.now(),
      ipAddress: c.req.header("cf-connecting-ip"),
      userAgent: c.req.header("user-agent"),
    };

    // Save Session
    await cache.set(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      INACTIVITY_TIMEOUT
    );

    // Set Cookie
    const isProduction = c.env?.NODE_ENV === "production";
    setCookie(c, "sessionId", sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "Lax",
      path: "/",
      maxAge: INACTIVITY_TIMEOUT,
    });

    return c.json({
      message: "Authenticated",
      user: {
        email,
        role: user.role,
        two_factor_enabled: user.two_factor_enabled,
      },
    });
  } catch (err) {
    console.error("Verify Logic Error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// --- 3. VALIDATE SESSION TOKEN ---
async function validateSessionToken(
  cache: CacheService,
  token: string
): Promise<ValidationResult> {
  const now = Date.now();

  // Parse token: ID.SECRET
  const tokenParts = token.split(".");
  if (tokenParts.length !== 2) {
    return { valid: false, reason: "Invalid token format" };
  }

  const [sessionId, sessionSecret] = tokenParts;

  // Get session from Redis
  const raw = await cache.get<string>(`session:${sessionId}`);
  if (!raw) {
    return { valid: false, reason: "Session not found" };
  }

  let sessionData: SessionData;
  try {
    sessionData = JSON.parse(raw);
  } catch {
    return { valid: false, reason: "Invalid session data" };
  }

  // Verify secret hash (constant-time comparison)
  const providedSecretHash = await hashSecret(sessionSecret);
  const storedSecretHash = base64ToUint8Array(sessionData.secretHash);

  if (!constantTimeEqual(providedSecretHash, storedSecretHash)) {
    return { valid: false, reason: "Invalid session secret" };
  }

  // Check inactivity timeout
  const timeSinceLastVerified = now - sessionData.lastVerifiedAt;
  if (timeSinceLastVerified >= INACTIVITY_TIMEOUT * 1000) {
    await cache.del(`session:${sessionId}`);
    return { valid: false, reason: "Session expired" };
  }

  // Determine if we should refresh lastVerifiedAt
  const shouldRefresh = timeSinceLastVerified >= ACTIVITY_CHECK_INTERVAL * 1000;

  return {
    valid: true,
    session: sessionData,
    shouldRefresh,
  };
}

// --- 4. CONTEXT VERIFICATION (Me) ---
app.get("/context-verif", async (c) => {
  const sessionToken = getCookie(c, "sessionId");

  if (!sessionToken) {
    return c.json({ authenticated: false, user: null });
  }

  const cache = c.var.cache;

  try {
    const result = await validateSessionToken(cache, sessionToken);

    if (!result.valid) {
      deleteCookie(c, "sessionId", { path: "/" });
      return c.json({
        authenticated: false,
        user: null,
        reason: result.reason,
      });
    }

    const sessionData = result.session!;

    // Sliding window refresh (non-blocking)
    if (result.shouldRefresh) {
      const sessionId = sessionToken.split(".")[0];
      sessionData.lastVerifiedAt = Date.now();

      // Use waitUntil if available (Cloudflare Workers)
      const updatePromise = cache.set(
        `session:${sessionId}`,
        JSON.stringify(sessionData),
        INACTIVITY_TIMEOUT
      );

      if (c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(updatePromise);
      } else {
        // Fallback for non-Cloudflare environments
        updatePromise.catch((err) =>
          console.error("Session refresh failed:", err)
        );
      }
    }

    return c.json({
      authenticated: true,
      user: {
        email: sessionData.email,
        role: sessionData.role,
        two_factor_enabled: sessionData.two_factor_enabled,
      },
    });
  } catch (err) {
    console.error("Context verification failed:", err);
    return c.json({
      authenticated: false,
      user: null,
      error: "Verification failed",
    });
  }
});

// --- 5. LOGOUT ---
app.get("/logout", async (c) => {
  const sessionToken = getCookie(c, "sessionId");

  if (sessionToken) {
    const cache = c.var.cache;
    try {
      const sessionId = sessionToken.split(".")[0];
      await cache.del(`session:${sessionId}`);
    } catch (e) {
      console.error("Logout cleanup error:", e);
    }
  }

  deleteCookie(c, "sessionId", { path: "/" });
  return c.json({ message: "Logged out successfully" });
});

export default app;
