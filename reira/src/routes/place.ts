import { Hono } from "hono";
import type { AppContext } from "../types/hono";
import validateQuery, { PlacesQuerySchema } from "@utils/placeQuery";
import { dbSearch } from "@services/dbSearch";
import { googleAutocomplete } from "@services/placeAuto";
import { getPlaceDetails } from "@services/placeDetails";
import { withAuth } from "../middleware/auth";
import { z } from "zod";

const router = new Hono<AppContext>();

// Schema for place-details body validation
const PlaceDetailsSchema = z.object({
  placeId: z.string().min(1),
  sessionToken: z.uuidv4(),
  label: z.string().optional(),
  main_text: z.string(),
  secondary_text: z.string().optional(),
});

router.get("/auto-comp", validateQuery(PlacesQuerySchema), async (c) => {
  try {
    const parsed = c.var.parsedQuery!;
    if (!parsed.q) return c.json([]);

    const q = parsed.q;
    const limit = Math.min(parsed.limit ?? 10, 20);
    const sessionToken = parsed.sessionToken;

    // Fetch both simultaneously
    const [dbResults, googleResults] = await Promise.all([
      dbSearch(q, c.var.supabase, c.var.cache, limit),
      googleAutocomplete(q, sessionToken, c.env),
    ]);

    // Deduplicate by place_id - DB results take priority
    const seen = new Set<string>();
    const combined = [];

    // Add DB results first
    for (const place of dbResults) {
      if (place.place_id) {
        seen.add(place.place_id);
      }
      combined.push(place);
    }

    // Add Google results only if not already in DB
    for (const place of googleResults) {
      if (!place.place_id || !seen.has(place.place_id)) {
        if (place.place_id) {
          seen.add(place.place_id);
        }
        combined.push(place);
      }
    }

    return c.json(combined.slice(0, limit));
  } catch (err) {
    console.error("API error", err);
    return c.json({ error: "server_error" }, 500);
  }
});

router.post("/place-details", withAuth(), async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validation = PlaceDetailsSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        {
          error: "Invalid request body",
          issues: z.treeifyError(validation.error),
        },
        400
      );
    }

    const { placeId, sessionToken, label, main_text, secondary_text } =
      validation.data;
    const userID = c.var.user?.userID;

    if (!userID) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // Fetch from Google Place Details API
    const location = await getPlaceDetails(placeId, sessionToken, c.env);
    if (!location) {
      return c.json({ error: "Place not found" }, 404);
    }

    console.log("Place details fetched:", location);

    const { lat, lng } = location;

    // Validate coordinates
    if (lat == null || lng == null) {
      return c.json({ error: "Missing coordinates from Google" }, 400);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { data, error } = await c.var.supabase
      .from("addresses")
      .upsert(
        {
          user_id: userID,
          label: label,
          place_name: main_text,
          address: secondary_text,
          place_id: placeId,
          lat: lat,
          lng: lng,
        },
        {
          onConflict: "user_id,place_id",
        }
      )
      .select("id");

    const id = data?.[0]?.id ?? null;

    console.log("Supabase response:", { data, error });
    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // Return the complete address data
    return c.json({
      success: true,
      address: {
        id,
        label,
        main_text: main_text,
        secondary_text: secondary_text,
        lat: lat,
        lng: lng,
        place_id: placeId,
      },
      message: "Address fetched from Google and saved",
    });
  } catch (error) {
    console.error("Error:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default router;
