import { createMiddleware } from "hono/factory";
import { getCookie, deleteCookie } from "hono/cookie";
import { CacheService } from "@config/cache";
import { signSessionId } from "../utils/hmac";
import type { AuthUser } from "../types/authUser";
import { AppContext } from "@/types/hono";

const MAX_SESSION_AGE = 60 * 60 * 24 * 7; // 7 DAYS
const SESSION_TTL = 60 * 60 * 24 * 7;

export function withAuth(requiredRoles?: string[]) {
  // We pass 'AppContext' generic so TS knows about c.env and c.set
  return createMiddleware<AppContext>(async (c, next) => {
    // 1. Initialize Services (Must happen inside request)
    const cache = new CacheService(c.env);

    // 2. Get Session Cookie
    const sessionId = getCookie(c, "sessionId");

    if (!sessionId) {
      return c.json(
        { error: "Authentication required", authenticated: false },
        401
      );
    }

    // 3. Sign Session ID (Requires secret from c.env)
    if (!c.env.SESSION_SECRET) {
      console.error("SESSION_SECRET is missing in env variables");
      return c.json({ error: "Server configuration error" }, 500);
    }

    // We sign it because Redis keys are likely stored as "session:signed_id"
    const signedId = await signSessionId(sessionId, c.env.SESSION_SECRET);
    const key = `session:${signedId}`;

    // 4. Lookup in Redis
    const raw = await cache.get<string>(key);

    if (!raw) {
      deleteCookie(c, "sessionId");
      return c.json({ error: "Session expired", authenticated: false }, 401);
    }

    // 5. Parse Data
    let sessionData: AuthUser & { createdAt: number };

    try {
      // Handle case where Redis might return object or string depending on how it was set
      sessionData = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      await cache.del(key);
      deleteCookie(c, "sessionId");
      return c.json(
        { error: "Invalid session data", authenticated: false },
        401
      );
    }

    // 6. Enforce Lifetime
    const sessionAge = Date.now() - sessionData.createdAt;
    if (sessionAge > MAX_SESSION_AGE * 1000) {
      await cache.del(key);
      deleteCookie(c, "sessionId");
      return c.json({ error: "Session too old", authenticated: false }, 401);
    }

    // 7. Sliding Window: Refresh TTL
    // We use c.executionCtx.waitUntil to not block the response
    c.executionCtx.waitUntil(
      cache
        .expire(key, SESSION_TTL)
        .catch((err) => console.error("TTL refresh failed", err))
    );

    // 8. Attach User to Context
    const user: AuthUser = {
      userID: sessionData.userID,
      email: sessionData.email,
      sessionId,
      role: sessionData.role,
      two_factor_enabled: sessionData.two_factor_enabled,
    };

    c.set("user", user);

    // 9. Role Check
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await next();
  });
}
