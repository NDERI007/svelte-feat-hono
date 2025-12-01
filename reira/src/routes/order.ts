import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import { withAuth } from "middleware/auth";
import { AppContext } from "@/types/hono";
import { processMpesaPayment } from "@/utils/worker";
import { AppError } from "@/utils/error";

const router = new Hono<AppContext>();

const orderItemSchema = z.object({
  product_id: z.uuid("Invalid product ID"),
  variant_id: z.string().optional().nullable(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});
// Zod Schema for updating status
const updateStatusSchema = z.object({
  orderID: z.uuid("Invalid order ID"),
  action: z.enum(["complete", "cancel"]),
});
const createOrderSchema = z
  .object({
    delivery_type: z.enum(["delivery", "pickup"]),

    // Address fields (Initially optional, validated in superRefine)
    delivery_address_main_text: z.string().optional(),
    delivery_address_secondary_text: z.string().optional(),
    delivery_place_id: z.string().optional(),
    delivery_lat: z.number().optional(),
    delivery_lng: z.number().optional(),

    payment_method: z.literal("mpesa"),

    // ✅ PHONE VALIDATION & TRANSFORMATION
    // This cleans the input automatically before it hits your API logic
    mpesa_phone: z
      .string()
      .transform((val) => val.replace(/[\s\-\(\)]/g, "")) // Remove spaces/dashes
      .refine((val) => /^(254|0)?[17]\d{8}$/.test(val), "Invalid phone format")
      .transform((val) => (val.startsWith("0") ? "254" + val.slice(1) : val)),

    subtotal: z.number().min(0),
    delivery_fee: z.number().min(0),
    total_amount: z.number().min(0),
    order_notes: z.string().nullable().optional(),

    items: z
      .array(orderItemSchema)
      .min(1, "Order must contain at least one item"),
  })
  .superRefine((data, ctx) => {
    // If delivery_type is 'delivery', address is required
    if (data.delivery_type === "delivery" && !data.delivery_address_main_text) {
      ctx.addIssue({
        code: "custom", // ✅ REPLACED: z.ZodIssueCode.custom -> "custom"
        message: "Delivery address is required for delivery orders",
        path: ["delivery_address_main_text"],
      });
    }
  });

router.post(
  "/create",
  withAuth(["user"]),
  zValidator("json", createOrderSchema),

  async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const notifications = c.get("notifications");
    const orderData = c.req.valid("json");

    // 1. CREATE ORDER (Database Transaction)
    const { data: orderID, error: rpcError } = await supabase.rpc(
      "create_order_with_items",
      {
        p_user_id: user.userID,
        p_delivery_type: orderData.delivery_type,
        p_mpesa_phone: orderData.mpesa_phone, // Zod cleaned this
        p_subtotal: orderData.subtotal,
        p_delivery_fee: orderData.delivery_fee,
        p_total_amount: orderData.total_amount,
        p_items: orderData.items,
        p_delivery_address_main_text:
          orderData.delivery_address_main_text || null,
        p_delivery_address_secondary_text:
          orderData.delivery_address_secondary_text || null,
        p_delivery_place_id: orderData.delivery_place_id || null,
        p_delivery_lat: orderData.delivery_lat || null,
        p_delivery_lng: orderData.delivery_lng || null,
        p_delivery_instructions: orderData.order_notes || null,
      }
    );

    if (rpcError) {
      // Preserve your specific error logic
      let msg = "Failed to create order";

      if (
        rpcError.message.includes("unavailable") ||
        rpcError.message.includes("requires a variant")
      ) {
        msg = rpcError.message;
      } else if (rpcError.message.includes("mismatch")) {
        msg = "Price validation failed. Please refresh and try again.";
      } else if (rpcError.message.includes("Invalid product_id")) {
        msg = "Some products are no longer available.";
      }

      // ✅ THROW: Global handler will catch this and send 400
      throw new AppError(msg, 400);
    }
    if (!orderID) {
      throw new AppError("Order creation failed (No ID returned)", 500);
    }

    c.executionCtx.waitUntil(
      processMpesaPayment(
        c.env,
        supabase,
        notifications,
        orderData.mpesa_phone,
        orderData.total_amount,
        orderID
      )
    );

    // The user gets this response instantly (usually < 200ms)
    return c.json(
      {
        success: true,
        message: "Order created. Initiating payment...",
        order: orderID, // Frontend needs this to subscribe
      },
      201
    );
  }
);
// ---------------------------------------------------------
// 1. ADMIN ROUTES
// ---------------------------------------------------------

/**
 * GET /reviewed
 * Get all orders for authenticated user (Admin dashboard)
 */
router.get("/reviewed", async (c) => {
  const supabase = c.get("supabase");

  // Hono query params are strings, so we parse them
  const page = parseInt(c.req.query("page") || "1");
  const pageSize = parseInt(c.req.query("pageSize") || "20");
  const status = c.req.query("status");

  const { data, error } = await supabase.rpc("get_admin_reviewed_orders", {
    page_number: page,
    page_size: pageSize,
    order_status: status || null,
  });

  if (error) throw error;

  return c.json(data);
});

/**
 * POST /update-status
 * Admin updates status
 */
router.post(
  "/update-status",
  withAuth(["admin"]), // Ensure your middleware is Hono-compatible
  zValidator("json", updateStatusSchema),
  async (c) => {
    const supabase = c.get("supabase");
    const notifications = c.get("notifications");
    const user = c.get("user");
    const { orderID, action } = c.req.valid("json");

    let updateData: Record<string, any> = {};

    // ✅ Mark as Completed → Out For Delivery
    if (action === "complete") {
      updateData.status = "out_for_delivery";
    }
    // ❌ Cancel → Declined
    else if (action === "cancel") {
      if (!user.userID) {
        return c.json({ error: "adminID required when cancelling" }, 400);
      }
      updateData.status = "declined";
      updateData.reviewed_by_admin_id = user.userID;
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderID);

    if (error) throw error;

    // Fire and forget notification cleanup
    // Using waitUntil to ensure it completes without blocking response
    c.executionCtx.waitUntil(notifications.removeOrder(orderID));

    return c.json({ success: true, orderID, newStatus: updateData.status });
  }
);

// ---------------------------------------------------------
// 2. USER HISTORY & DETAILS
// ---------------------------------------------------------

/**
 * GET /history
 * Get order history for the logged-in user
 */
router.get("/history", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");

  // No try/catch needed!
  const { data, error } = await supabase.rpc("get_orders_history_for_user", {
    p_user_id: user.userID,
  });

  // Just throw the error. Global handler takes care of the rest.
  if (error) throw error;

  return c.json({ orders: data ?? [] });
});
/**
 * GET /:orderID/details
 * Detailed single order view
 */
router.get("/:orderID/details", async (c) => {
  const supabase = c.get("supabase");
  const orderID = c.req.param("orderID");

  // Validate UUID format manually or use Zod param validator
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderID)) {
    // ✅ CHANGED: Throw 400 Bad Request
    throw new AppError("Invalid order ID format", 400);
  }

  const { data, error } = await supabase.rpc("get_order_details", {
    order_uuid: orderID,
  });

  if (error) throw error;

  if (!data) {
    throw new AppError("Order not found", 404);
  }

  // Transform data
  const order = {
    id: data.id,
    delivery_type: data.delivery_type,
    address: data.delivery_address_main_text || null,
    place_id: data.delivery_place_id || null,
    instructions: data.delivery_instructions || null,
    mpesa_phone: data.mpesa_phone || null,
    payment_reference: data.payment_reference || null,
    total_amount: Number(data.total_amount) || 0,
    created_at: data.created_at,
    items: Array.isArray(data.order_items)
      ? data.order_items.map((item: any) => ({
          quantity: Number(item.quantity) || 0,
          name: item.name || "Unknown Item",
          variant_size: item.variant_size || null,
        }))
      : [],
  };

  return c.json(order);
});

/**
 * GET /:orderID
 * Get single order details (Alternative lightweight view)
 */
router.get("/:orderID", withAuth(["user"]), async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const orderID = c.req.param("orderID");

  const { data, error } = await supabase.rpc("get_order_with_items", {
    p_order_id: orderID,
    p_user_id: user.userID,
  });

  if (error) throw error;
  if (!data) {
    throw new AppError("Order not found", 404);
  }

  return c.json({ order: data });
});

/**
 * GET /:orderID/payment-status
 */
router.get("/:orderID/payment-status", withAuth(["user"]), async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const orderID = c.req.param("orderID");

  const { data, error } = await supabase
    .from("orders")
    .select("id, payment_status, status")
    .eq("id", orderID)
    .eq("user_id", user.userID)
    .single();

  if (error) throw error;

  if (!data) {
    throw new AppError("Order not found", 404);
  }

  return c.json({
    id: data.id,
    payment_status: data.payment_status,
    status: data.status,
    is_complete: data.payment_status === "paid",
    has_failed: ["failed", "cancelled"].includes(data.payment_status || ""),
  });
});

/**
 * POST /:orderId/confirm-delivery
 * Customer confirms delivery
 */
router.post("/:orderId/confirm-delivery", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const orderId = c.req.param("orderId");

  const { data, error } = await supabase
    .from("orders")
    .update({
      delivery_confirmed: true,
      customer_confirmed_at: new Date().toISOString(),
      status: "delivered",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.userID)
    .eq("delivery_confirmed", false)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    throw new AppError("Invalid delivery code or order not ready", 400);
  }

  return c.json({
    success: true,
    message: "Delivery confirmed successfully",
    order: data,
  });
});

export default router;
