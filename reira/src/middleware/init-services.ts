import { createMiddleware } from "hono/factory";
import { CacheService } from "@config/cache";
import type { AppContext } from "../types/hono";
import { getSupabase } from "@/config/supabase";
import { NotificationService } from "@/services/notification";

export const initServices = createMiddleware<AppContext>(async (c, next) => {
  const cache = new CacheService(c.env);
  const notifications = new NotificationService(cache);

  // Initialize all services once per request

  c.set("cache", cache);
  c.set("supabase", getSupabase(c.env));
  c.set("notifications", notifications);

  await next();
});
