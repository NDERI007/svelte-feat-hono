import { z } from "zod";
import { createMiddleware } from "hono/factory";
import type { AppContext } from "../types/hono";

/* ---------------- Places query schema + validation middleware ---------------- */

export const PlacesQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z
    .preprocess((v) => {
      if (typeof v === "string" && v.trim() !== "") return parseInt(v, 10);
      return undefined;
    }, z.number().int().min(1).max(20).optional())
    .optional()
    .default(10),
  sessionToken: z.uuidv4(),
});

export type PlacesQuery = z.infer<typeof PlacesQuerySchema>;

/**
 * validateQuery(schema)
 * - Applies safeQ to query.q before validation
 * - If q is empty after safeQ, attaches parsedQuery.q = "" and continues
 * - On validation failure, returns 400 with structured issues
 */
export function validateQuery<T extends z.ZodTypeAny>(
  schema: T,
  opts?: { safeQ?: (s?: string) => string }
) {
  const safeQ =
    opts?.safeQ || ((s?: string) => (s ? String(s).trim().slice(0, 200) : ""));

  return createMiddleware<AppContext>(async (c, next) => {
    const qRaw = c.req.query("q");
    const qProcessed = safeQ(qRaw);

    if (!qProcessed) {
      // Attach empty query and continue
      c.set("parsedQuery", { q: "" } as unknown as PlacesQuery);
      return next();
    }

    const toValidate = {
      q: qProcessed,
      limit: c.req.query("limit"),
      sessionToken: c.req.query("sessionToken"),
    };

    const result = schema.safeParse(toValidate);

    if (!result.success) {
      return c.json(
        {
          error: "invalid_request",
          issues: z.treeifyError(result.error),
        },
        400
      );
    }

    c.set("parsedQuery", result.data as PlacesQuery);
    await next();
  });
}

export default validateQuery;
