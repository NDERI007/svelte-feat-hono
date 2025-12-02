import { Hono } from "hono";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import type { AppContext } from "@/types/hono";
import { withAuth } from "@/middleware/auth";
import { AppError } from "@/utils/error";

const router = new Hono<AppContext>();

router.use("*", withAuth(["user"]));

// --- Crypto Helpers (Web API Standard) ---

/** Generate a random hex string of specific byte length */
function generateRandomHex(byteLength: number): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash a string using SHA-256 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------

/**
 * POST /setup
 */
router.post("/setup", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Get user email
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.userID)
    .single();

  if (error) throw error;

  if (!profile?.email) {
    throw new AppError("User email not found", 400);
  }

  // Generate Secret (20 bytes = 160 bits, standard for TOTP)
  const secret = new OTPAuth.Secret({ size: 20 });

  // Create TOTP Object
  const totp = new OTPAuth.TOTP({
    issuer: "Iura",
    label: profile.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });

  const otpUrl = totp.toString();

  // 1. Generate SVG string
  const svgString = await QRCode.toString(otpUrl, {
    type: "svg",
    color: { dark: "#000000", light: "#ffffff" }, // Optional styling
  });

  // 2. Convert to Data URI so the Frontend <img src="..."> still works
  const qrCodeUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;

  return c.json({
    secret: secret.base32, // Send Base32 string to frontend
    qrCode: qrCodeUrl,
  });
});

/**
 * POST /verify
 * Verifies code and enables 2FA
 */
router.post("/verify", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");

  const { token, secret } = await c.req.json();

  if (!token || !secret) {
    throw new AppError("Token and secret required", 400);
  }

  // Validate Token using OTPAuth
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // .validate returns null if invalid, or the delta (integer) if valid
  const delta = totp.validate({ token, window: 1 });

  if (delta === null) {
    throw new AppError("Invalid verification code", 400);
  }

  // Generate 8 Recovery Codes (4 bytes each = 8 hex chars)
  const recoveryCodes = Array.from({ length: 8 }, () => generateRandomHex(4));

  // Hash codes for storage
  const hashedCodes = await Promise.all(recoveryCodes.map(hashString));

  // Save to DB
  const { error } = await supabase.from("profiles").upsert({
    id: user.userID,
    two_factor_secret: secret,
    two_factor_enabled: true,
    recovery_codes: hashedCodes,
  });

  if (error) throw error;

  return c.json({
    success: true,
    message: "2FA enabled successfully",
    recoveryCodes, // Return raw codes to user ONCE
  });
});

/**
 * POST /login-verify
 * Validates TOTP or Backup Code during login
 */
router.post("/login-verify", async (c) => {
  const supabase = c.get("supabase");
  const cache = c.get("cache");
  const user = c.get("user");

  const { code, type } = await c.req.json();

  if (!type || (type !== "totp" && type !== "backup")) {
    throw new AppError("Invalid verification type", 400);
  }

  // Rate Limiting
  const attemptKey = `mfa-login-attempts:${user.userID}`;
  const userAttempts = await cache.incr(attemptKey);

  if (userAttempts === 1) await cache.expire(attemptKey, 60);

  if (userAttempts > 5) {
    throw new AppError("Too many attempts. Try again in a minute.", 429);
  }

  // --- TOTP Logic ---
  if (type === "totp") {
    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      throw new AppError("Invalid code format", 400);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("two_factor_secret")
      .eq("id", user.userID)
      .single();

    if (error || !data?.two_factor_secret) {
      throw new AppError("TOTP secret not found", 400);
    }

    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(data.two_factor_secret),
    });

    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      throw new AppError("Invalid code. It may have expired.", 400);
    }

    await cache.del(attemptKey);
    return c.json({ success: true });
  }

  // --- Backup Code Logic ---
  if (type === "backup") {
    if (!code || typeof code !== "string") {
      throw new AppError("Invalid backup code", 400);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("recovery_codes")
      .eq("id", user.userID)
      .single();

    if (error) throw error;

    const storedCodes: string[] | null = data?.recovery_codes ?? null;

    if (!storedCodes || storedCodes.length === 0) {
      throw new AppError("No recovery codes found", 400);
    }

    // Hash provided code to match DB
    const hashed = await hashString(code);

    if (!storedCodes.includes(hashed)) {
      throw new AppError("Invalid backup code", 400);
    }

    // Consume the used code
    const updated = storedCodes.filter((c) => c !== hashed);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ recovery_codes: updated })
      .eq("id", user.userID);

    if (updateError) throw updateError;

    await cache.del(attemptKey);
    return c.json({ success: true });
  }

  throw new AppError("Invalid flow", 400);
});

/**
 * POST /disable
 */
router.post("/disable", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");

  const { error } = await supabase
    .from("profiles")
    .update({
      two_factor_enabled: false,
      two_factor_secret: null,
      recovery_codes: null,
    })
    .eq("id", user.userID);

  if (error) throw error;

  return c.json({
    success: true,
    message: "2FA disabled successfully",
  });
});

/**
 * POST /regenerate-codes
 */
router.post("/regenerate-codes", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");

  // Check if enabled first
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("two_factor_enabled")
    .eq("id", user.userID)
    .single();

  if (fetchError) throw fetchError;

  if (!profile?.two_factor_enabled) {
    throw new AppError("2FA is not enabled", 400);
  }

  // Generate New Codes
  const recoveryCodes = Array.from({ length: 8 }, () => generateRandomHex(4));
  const hashedCodes = await Promise.all(recoveryCodes.map(hashString));

  const { error } = await supabase
    .from("profiles")
    .update({ recovery_codes: hashedCodes })
    .eq("id", user.userID);

  if (error) throw error;

  return c.json({
    success: true,
    recoveryCodes,
  });
});

export default router;
