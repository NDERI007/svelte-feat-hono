import { CacheService } from "@config/cache";
import type { Env } from "./env"; // Your bindings interface
import { AuthUser } from "./authUser";
import { SupabaseClient } from "@supabase/supabase-js";
import { NotificationService } from "@/services/notification";
import { ResendService } from "@/config/resend";
import { PlacesQuery } from "@/utils/placeQuery";

export type AppContext = {
  Bindings: Env;
  Variables: {
    cache: CacheService;
    supabase: SupabaseClient;
    user: AuthUser;
    notifications: NotificationService;
    resend: ResendService;
    parsedQuery?: PlacesQuery;
  };
};
