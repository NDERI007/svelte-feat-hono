import { createMiddleware } from "hono/factory";
import { CacheService } from "@config/cache";
import type { AppContext } from "../types/hono";
import { getSupabase } from "@/config/supabase";
import { NotificationService } from "@/services/notification";
import { ResendService } from "@/config/resend";

export const initServices = createMiddleware<AppContext>(async (c, next) => {
  const cache = new CacheService(c.env);
  const notifications = new NotificationService(cache);
  const resend = new ResendService(c.env);

  // Initialize all services once per request

  c.set("cache", cache);
  c.set("supabase", getSupabase(c.env));
  c.set("notifications", notifications);
  c.set("resend", resend);

  await next();
});
