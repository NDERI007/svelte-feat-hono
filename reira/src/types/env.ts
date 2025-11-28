export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE: string;
  SESSION_SECRET: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  GOOGLE_CLOUD_KEY: string;
  RESEND_KEY: string;
  SIMULATE_SUCCESS: boolean;
  NODE_ENV: string;
  MPESA_CONSUMER_KEY: string;
  MPESA_CONSUMER_SECRET: string;
  MPESA_SHORTCODE: number;
  MPESA_PASSKEY: string;
  BASE_URL: string;
}
