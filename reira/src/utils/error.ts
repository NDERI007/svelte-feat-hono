import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  public statusCode: ContentfulStatusCode;
  public details?: any;

  constructor(
    message: string,
    statusCode: ContentfulStatusCode = 500,
    details?: any
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Helper to quickly check if an object is a Supabase error
export function isSupabaseError(err: any): boolean {
  return (
    err &&
    typeof err === "object" &&
    "code" in err &&
    "details" in err &&
    "hint" in err
  );
}
