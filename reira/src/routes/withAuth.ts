import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { z } from "zod";
import { signSessionId } from "@utils/hmac";
import { generateOTP, timingSafeEqual } from "@utils/cryptoUtil";
import type { AppContext } from "@/types/hono";
import { CacheService } from "@/config/cache";

const app = new Hono<AppContext>();

// Constants
const OTP_TTL = 600; // 10 minutes
const RESEND_COOLDOWN = 30;
const SESSION_TTL = 60 * 60 * 2; // 2 hrs
const MAX_OTP_ATTEMPTS = 5;
const MAX_SEND_ATTEMPTS = 10;
const ATTEMPT_WINDOW = 60 * 60; // 1 hour

// --- HELPER: Redis Rate Limiter ---
async function checkRateLimit(
  cache: CacheService,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; ttl: number }> {
  const current = await cache.incr(key);
  if (current === 1) {
    await cache.expire(key, windowSeconds);
  }
  const ttl = await cache.ttl(key);
  return { allowed: current <= limit, ttl };
}

// --- 1. SEND OTP ---
app.post("/send-otp", async (c) => {
  const body = await c.req.json();
  const email = body.email?.toLowerCase().trim();

  if (!email) return c.json({ error: "Email required" }, 400);

  // Use cache from context
  const cache = c.var.cache;

  // 1. Rate Limit: Send Attempts (Global Limit)
  const sendLimit = await checkRateLimit(
    cache,
    `otp_send_attempts:${email}`,
    MAX_SEND_ATTEMPTS,
    ATTEMPT_WINDOW
  );

  if (!sendLimit.allowed) {
    return c.json({ error: "Too many OTP requests. Try again later." }, 429);
  }

  // 2. Cooldown Check
  const cooldownTTL = await cache.ttl(`otp_cooldown:${email}`);
  if (cooldownTTL > 0) {
    return c.json(
      {
        error: `Please wait ${cooldownTTL}s before resending.`,
        retryAfter: cooldownTTL,
      },
      429
    );
  }

  // 3. Generate & Store
  const code = await generateOTP();

  // Store OTP
  await cache.set(`otp:${email}`, code, OTP_TTL);
  // Set Cooldown
  await cache.set(`otp_cooldown:${email}`, "1", RESEND_COOLDOWN);
  // Reset Verify Attempts on fresh send
  await cache.del(`otp_verify_attempts:${email}`);

  // 4. Send Email using resend service from context
  try {
    await c.var.resend.sendOtpEmail(email, code);
    return c.json({ message: "OTP sent!" });
  } catch (err) {
    console.error("Failed to send OTP:", err);
    return c.json({ error: "Failed to send OTP" }, 500);
  }
});

// --- 2. VERIFY OTP ---
app.post("/verify-otp", async (c) => {
  const cache = c.var.cache;
  const supabase = c.var.supabase;
  const body = await c.req.json();

  let { email, code } = body;

  // Sanitization
  email = email?.toLowerCase().trim().replace(/\s+/g, "");
  code = code?.replace(/[\s\u200B-\u200D\uFEFF]/g, "").trim();

  if (!email || !code) return c.json({ error: "Email and OTP required" }, 400);
  if (!/^\d{6}$/.test(code))
    return c.json({ error: "Invalid OTP format" }, 400);

  // 1. Rate Limit: Verify Attempts
  const verifyLimit = await checkRateLimit(
    cache,
    `otp_verify_attempts:${email}`,
    MAX_OTP_ATTEMPTS,
    OTP_TTL
  );

  if (!verifyLimit.allowed) {
    // Security: Kill the OTP if they brute force it
    await cache.del(`otp:${email}`);
    return c.json(
      {
        error: "Too many failed attempts. Request a new OTP.",
        retryAfter: verifyLimit.ttl,
      },
      429
    );
  }

  // 2. Fetch Stored OTP
  const storedCode = await cache.get<string>(`otp:${email}`);
  if (!storedCode) {
    return c.json({ error: "OTP expired or not found" }, 400);
  }

  // 3. Timing Safe Compare
  const isValid = timingSafeEqual(storedCode, code);

  if (!isValid) {
    return c.json(
      {
        error: "Invalid OTP",
        attemptsRemaining: Math.max(
          0,
          MAX_OTP_ATTEMPTS -
            ((await cache.get<number>(`otp_verify_attempts:${email}`)) || 0)
        ),
      },
      400
    );
  }

  // 4. Cleanup OTP
  await cache.del(`otp:${email}`);
  await cache.del(`otp_verify_attempts:${email}`);

  // 5. Create/Get User Profile
  const { data, error: rpcError } = await supabase.rpc(
    "ensure_profile_exists",
    {
      p_email: email,
    }
  );

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    return c.json({ error: "Profile creation failed" }, 500);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return c.json({ error: "No profile data returned" }, 500);
  }

  const { id: user_id, role, two_factor_enabled } = data[0];

  // 6. Create Session
  const userIdSchema = z.uuid();
  const userID = userIdSchema.parse(user_id);
  const sessionId = crypto.randomUUID();

  // Sign ID for Redis Key
  const signedId = await signSessionId(sessionId, c.env.SESSION_SECRET);

  const sessionData = {
    userID,
    email,
    role,
    two_factor_enabled,
    createdAt: Date.now(),
  };

  await cache.set(
    `session:${signedId}`,
    JSON.stringify(sessionData),
    SESSION_TTL
  );

  // 7. Set Cookie
  setCookie(c, "sessionId", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: SESSION_TTL,
  });

  return c.json({
    message: "Authenticated!",
    user: { email, role, two_factor_enabled },
  });
});

// --- 3. CONTEXT VERIFICATION (Me) ---
app.get("/context-verif", async (c) => {
  const sessionId = getCookie(c, "sessionId");

  if (!sessionId) {
    return c.json({ authenticated: false, user: null });
  }

  const cache = c.var.cache;

  try {
    const signedId = await signSessionId(sessionId, c.env.SESSION_SECRET);
    const key = `session:${signedId}`;

    const raw = await cache.get<string>(key);

    if (!raw) {
      deleteCookie(c, "sessionId");
      return c.json({ authenticated: false, user: null });
    }

    const sessionData = JSON.parse(raw);

    // Max Age Check
    if (Date.now() - sessionData.createdAt > SESSION_TTL * 1000) {
      await cache.del(key);
      deleteCookie(c, "sessionId");
      return c.json({ authenticated: false, user: null });
    }

    // Sliding Window Refresh (Non-blocking)
    c.executionCtx.waitUntil(cache.expire(key, SESSION_TTL));

    return c.json({
      authenticated: true,
      user: { email: sessionData.email, role: sessionData.role },
    });
  } catch (err) {
    console.error("Context verification failed:", err);
    return c.json({ authenticated: false, user: null });
  }
});

// --- 4. LOGOUT ---
app.get("/logout", async (c) => {
  const sessionId = getCookie(c, "sessionId");

  if (sessionId) {
    const cache = c.var.cache;
    try {
      const signedId = await signSessionId(sessionId, c.env.SESSION_SECRET);
      await cache.del(`session:${signedId}`);
    } catch (e) {
      console.error("Logout cleanup error", e);
    }
    deleteCookie(c, "sessionId");
  }

  return c.json({ message: "Logged out!" });
});

export default app;
