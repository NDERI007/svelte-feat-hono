import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types/env";

/**
 * Factory for Supabase Client
 * Centralizes configuration for Serverless/Worker environment
 */
export const getSupabase = (env: Env): SupabaseClient => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Critical for Serverless: Disable browser-specific features
      // Since Workers don't have localStorage or a browser URL bar
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    // You can add other global config here (e.g. schema)
    // db: { schema: 'public' }
  });
};
