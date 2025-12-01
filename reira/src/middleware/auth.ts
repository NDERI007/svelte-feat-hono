import { createMiddleware } from "hono/factory";
import { getCookie, deleteCookie, setCookie } from "hono/cookie";
import { CacheService } from "@config/cache";
import {
  base64ToUint8Array,
  constantTimeEqual,
  hashSecret,
} from "@/utils/session";
import type { AuthUser } from "../types/authUser";
import { AppContext } from "@/types/hono";

// Session Configuration
const INACTIVITY_TIMEOUT = 60 * 60 * 24 * 10; // 10 days (max session age)
const ACTIVITY_CHECK_INTERVAL = 60 * 60; // 1 hour (refresh threshold)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 10; // 10 days

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

/**
 * Validates session token and returns session data
 */
async function validateSessionToken(
  cache: CacheService,
  token: string
): Promise<{
  valid: boolean;
  session?: SessionData;
  shouldRefresh?: boolean;
  reason?: string;
}> {
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
    sessionData = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { valid: false, reason: "Invalid session data" };
  }

  // Verify secret hash (constant-time comparison)
  const providedSecretHash = await hashSecret(sessionSecret);
  const storedSecretHash = base64ToUint8Array(sessionData.secretHash);

  if (!constantTimeEqual(providedSecretHash, storedSecretHash)) {
    return { valid: false, reason: "Invalid session secret" };
  }

  // Check inactivity timeout (absolute expiration)
  const timeSinceLastVerified = now - sessionData.lastVerifiedAt;
  if (timeSinceLastVerified >= INACTIVITY_TIMEOUT * 1000) {
    await cache.del(`session:${sessionId}`);
    return { valid: false, reason: "Session expired due to inactivity" };
  }

  // Check if session is too old (created too long ago)
  const sessionAge = now - sessionData.createdAt;
  if (sessionAge >= INACTIVITY_TIMEOUT * 1000) {
    await cache.del(`session:${sessionId}`);
    return { valid: false, reason: "Session expired (max age reached)" };
  }

  // Determine if we should refresh (sliding window)
  const shouldRefresh = timeSinceLastVerified >= ACTIVITY_CHECK_INTERVAL * 1000;

  return {
    valid: true,
    session: sessionData,
    shouldRefresh,
  };
}

/**
 * Refreshes session timestamp in Redis
 */
async function refreshSession(
  cache: CacheService,
  sessionId: string,
  sessionData: SessionData
): Promise<void> {
  const now = Date.now();
  const updatedSession = {
    ...sessionData,
    lastVerifiedAt: now,
  };

  await cache.set(
    `session:${sessionId}`,
    JSON.stringify(updatedSession),
    INACTIVITY_TIMEOUT
  );
}

/**
 * Auth Middleware with automatic session refresh
 *
 * @param requiredRoles - Optional array of roles that are allowed to access the route
 * @param options - Configuration options
 */
export function withAuth(
  requiredRoles?: string[],
  options: {
    skipRefresh?: boolean; // Skip automatic refresh for specific routes
    strictRoleCheck?: boolean; // Return 403 instead of 401 for role failures
  } = {}
) {
  return createMiddleware<AppContext>(async (c, next) => {
    const isProduction = c.env?.NODE_ENV === "production";

    // 1. Initialize Cache Service
    const cache = new CacheService(c.env);

    // 2. Get Session Token from Cookie
    const sessionToken = getCookie(c, "sessionId");
    console.log("1. Cookie Token:", sessionToken);
    if (!sessionToken) {
      return c.json(
        {
          error: "Authentication required",
          authenticated: false,
        },
        401
      );
    }

    // 3. Validate Session Token
    let validationResult;
    try {
      validationResult = await validateSessionToken(cache, sessionToken);
    } catch (err) {
      console.error("Session validation error:", err);
      deleteCookie(c, "sessionId", { path: "/" });
      return c.json(
        {
          error: "Session validation failed",
          authenticated: false,
        },
        401
      );
    }

    // 4. Handle Invalid Sessions
    if (!validationResult.valid) {
      deleteCookie(c, "sessionId", { path: "/" });
      return c.json(
        {
          error: validationResult.reason || "Invalid session",
          authenticated: false,
        },
        401
      );
    }

    const sessionData = validationResult.session!;
    const sessionId = sessionToken.split(".")[0];

    // 5. Sliding Window Session Refresh (Like Supabase)
    if (validationResult.shouldRefresh && !options.skipRefresh) {
      // Non-blocking refresh using waitUntil (Cloudflare Workers)
      const refreshPromise = refreshSession(cache, sessionId, sessionData);

      if (c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(refreshPromise);
      } else {
        // Fallback for non-Cloudflare environments
        refreshPromise.catch((err) =>
          console.error("Session refresh failed:", err)
        );
      }

      // Also refresh the cookie to extend its lifetime
      setCookie(c, "sessionId", sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "None" : "Lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }

    // 6. Attach User to Context
    const user: AuthUser = {
      userID: sessionData.userID,
      email: sessionData.email,
      sessionId: sessionId,
      role: sessionData.role,
      two_factor_enabled: sessionData.two_factor_enabled,
    };

    c.set("user", user);
    console.log("2. User Role in Session:", user.role); // DEBUG LOG
    console.log("3. Required Roles:", requiredRoles);

    // 7. Role-Based Access Control
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        const statusCode = options.strictRoleCheck ? 403 : 401;
        return c.json(
          {
            error: "Forbidden: insufficient permissions",
            required: requiredRoles,
            current: user.role,
          },
          statusCode
        );
      }
    }

    // 8. Continue to Route Handler
    await next();
  });
}

/**
 * Optional middleware for routes that need user data but don't require authentication
 * Attaches user to context if session exists, but doesn't block the request
 */
export function withOptionalAuth() {
  return createMiddleware<AppContext>(async (c, next) => {
    const cache = new CacheService(c.env);
    const sessionToken = getCookie(c, "sessionId");
    const isProduction = c.env?.NODE_ENV === "production";

    if (sessionToken) {
      try {
        const validationResult = await validateSessionToken(
          cache,
          sessionToken
        );

        if (validationResult.valid) {
          const sessionData = validationResult.session!;
          const sessionId = sessionToken.split(".")[0];

          // Attach user to context
          const user: AuthUser = {
            userID: sessionData.userID,
            email: sessionData.email,
            sessionId: sessionId,
            role: sessionData.role,
            two_factor_enabled: sessionData.two_factor_enabled,
          };

          c.set("user", user);

          // Refresh session if needed
          if (validationResult.shouldRefresh) {
            const refreshPromise = refreshSession(
              cache,
              sessionId,
              sessionData
            );

            if (c.executionCtx?.waitUntil) {
              c.executionCtx.waitUntil(refreshPromise);
            } else {
              refreshPromise.catch((err) =>
                console.error("Optional auth refresh failed:", err)
              );
            }

            // Refresh cookie
            setCookie(c, "sessionId", sessionToken, {
              httpOnly: true,
              secure: isProduction,
              sameSite: isProduction ? "None" : "Lax",
              path: "/",
              maxAge: COOKIE_MAX_AGE,
            });
          }
        } else {
          // Invalid session - clean it up
          deleteCookie(c, "sessionId", { path: "/" });
        }
      } catch (err) {
        console.error("Optional auth error:", err);
        // Don't block the request, just log the error
      }
    }

    await next();
  });
}
