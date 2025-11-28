import type { ErrorHandler } from "hono";
import { AppError, isSupabaseError } from "@/utils/error";
import { ZodError } from "zod";

export const globalErrorHandler: ErrorHandler = (err, c) => {
  // 1. Log the error (Crucial for Cloudflare Workers logs)
  console.error("🔥 Global Error:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    cause: err.cause,
  });

  // 2. Handle Custom App Errors (Expected logic errors)
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          message: err.message,
          code: "APP_ERROR",
          details: err.details,
        },
      },
      err.statusCode
    );
  }

  // 3. Handle Zod Validation Errors (if manual parsing throws)
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: err.issues,
        },
      },
      400
    );
  }

  // 4. Handle JSON Syntax Errors (e.g., malformed body)
  if (err instanceof SyntaxError && err.message.includes("JSON")) {
    return c.json(
      {
        success: false,
        error: {
          message: "Invalid JSON body",
          code: "INVALID_JSON",
        },
      },
      400
    );
  }

  // 5. Handle Supabase/Postgres Errors (Last resort fallback)
  if (isSupabaseError(err)) {
    // Hide specific DB details in production usually, but useful for debugging
    return c.json(
      {
        success: false,
        error: {
          message: "Database operation failed",
          code: (err as any).code || "DB_ERROR",
          // Only show details if not production (optional security measure)
          details:
            process.env.NODE_ENV === "development"
              ? (err as any).details
              : undefined,
        },
      },
      500
    );
  }

  // 6. Generic "Crash" (500)
  return c.json(
    {
      success: false,
      error: {
        message: "Internal Server Error",
        code: "INTERNAL_SERVER_ERROR",
      },
    },
    500
  );
};
