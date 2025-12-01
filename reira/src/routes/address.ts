import { Hono } from "hono";
import { AppContext } from "@/types/hono"; // Adjust path as needed
import { withAuth } from "@/middleware/auth"; // Adjust path as needed

const router = new Hono<AppContext>();

// Protect all routes
router.use("*", withAuth(["user"]));

/**
 * GET /look-up
 * Fetch user addresses
 */
router.get("/look-up", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user"); // Set by withAuth

  try {
    const { data, error } = await supabase
      .from("addresses")
      .select("id, label, place_name, address, lat, lng")
      .eq("user_id", user.userID);

    if (error) throw error;

    return c.json({ addresses: data || [] });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return c.json({ message: "Failed to fetch addresses" }, 500);
  }
});

/**
 * POST /upsert
 * Save/Update address
 */
router.post("/upsert", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");

  try {
    // Parse JSON body
    const body = await c.req.json();
    const { label, place_name, address, place_id, lat, lng } = body;

    // Validate required fields
    if (!label || !place_id || !place_name) {
      return c.json(
        {
          success: false,
          message: "Missing required fields (label, place_name, place_id)",
        },
        400
      );
    }

    const { data, error } = await supabase
      .from("addresses")
      .upsert(
        {
          user_id: user.userID,
          label,
          place_name,
          address,
          place_id,
          lat,
          lng,
        },
        {
          onConflict: "user_id,place_id", // Ensure this constraint exists in DB
        }
      )
      .select();

    if (error) throw error;

    return c.json({
      success: true,
      message: "Address saved successfully",
      address: data?.[0] || null,
    });
  } catch (error) {
    console.error("Error saving address:", error);
    return c.json(
      {
        success: false,
        message: "Failed to save address",
      },
      500
    );
  }
});

/**
 * DELETE /:id
 * Delete address
 */
router.delete("/:id", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const id = c.req.param("id");

  if (!id) return c.json({ message: "Missing address ID" }, 400);

  try {
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.userID);

    if (error) throw error;

    return c.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return c.json(
      {
        success: false,
        message: "Failed to delete address",
      },
      500
    );
  }
});

export default router;
