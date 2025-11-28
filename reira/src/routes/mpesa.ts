import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationService } from "@/services/notification";
import { AppContext } from "@/types/hono";

const router = new Hono<AppContext>();

// Helper: Convert M-Pesa "YYYYMMDDHHmmss" to ISO "YYYY-MM-DDTHH:mm:ss"
function formatMpesaDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // M-Pesa format: 20241128153000
  // Regex to split: (YYYY)(MM)(DD)(HH)(mm)(ss)
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
  }
  return new Date().toISOString(); // Fallback
}

// =====================================================
// SHARED: Process Logic (Refactored for Dependency Injection)
// =====================================================
export async function processPaymentCallback(
  deps: { supabase: SupabaseClient; notifications: NotificationService },
  params: {
    checkoutRequestId: string;
    resultCode: number;
    resultDesc: string;
    transactionReference: string | null;
    phoneNumber: string;
    amount: number;
    transactionDate: string | null;
    rawResponse?: any;
  }
): Promise<void> {
  const { supabase, notifications } = deps;
  const {
    checkoutRequestId,
    resultCode,
    resultDesc,
    transactionReference,
    phoneNumber,
    amount,
    transactionDate,
    rawResponse = {},
  } = params;

  console.log("🔄 Processing callback:", { checkoutRequestId, resultCode });

  // 1. IDEMPOTENCY CHECK
  // Check if we already processed this transaction to avoid double-firing notifications
  const { data: existing } = await supabase
    .from("mpesa_transactions")
    .select("id")
    .eq("checkout_request_id", checkoutRequestId)
    .single();

  if (existing) {
    console.warn("⚠️ Transaction already processed. Skipping.");
    return;
  }

  // 2. Insert Transaction
  const formattedDate = formatMpesaDate(transactionDate);

  const { error: insertError } = await supabase
    .from("mpesa_transactions")
    .insert({
      checkout_request_id: checkoutRequestId,
      result_code: resultCode,
      result_desc: resultDesc,
      amount,
      transaction_reference: transactionReference,
      phone_number: phoneNumber,
      transaction_date: formattedDate, // Use fixed date
      raw_response: rawResponse,
    });

  if (insertError) {
    console.error("❌ Failed to insert transaction:", insertError);
    // Even if logging fails, we should try to update the order status
  }

  // 3. Determine Status
  let paymentStatus = "unpaid";
  let orderStatus = "pending";

  if (resultCode === 0) {
    paymentStatus = "paid";
    orderStatus = "confirmed"; // or whatever your logic is
  } else if (resultCode === 1032) {
    paymentStatus = "cancelled";
    orderStatus = "payment_cancelled";
  } else {
    paymentStatus = "failed";
    orderStatus = "payment_failed";
  }

  // 4. Update Order
  const { data: orderData, error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus,
      payment_reference: transactionReference,
      status: orderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("checkout_request_id", checkoutRequestId)
    .select()
    .single();

  if (updateError) {
    console.error("❌ Failed to update order:", updateError);
    return;
  }

  // 5. Notifications
  if (resultCode === 0 && orderData) {
    if (
      orderData.status === "confirmed" &&
      orderData.payment_status === "paid"
    ) {
      await notifications.notifyConfirmedOrder({
        id: orderData.id,
        payment_reference: transactionReference || "N/A",
        amount: amount,
        phone_number: phoneNumber,
      });
      console.log("🔔 Admin notified successfully");
    }
  }

  console.log("🎉 Callback processing complete");
}

// =====================================================
// REAL M-PESA CALLBACK
// =====================================================
router.post("/callback", async (c) => {
  console.log("📞 M-PESA callback received");

  // 1. Get Dependencies
  const supabase = c.get("supabase");
  const notifications = c.get("notifications");

  try {
    const body = await c.req.json();

    if (!body?.Body?.stkCallback) {
      return c.json({ error: "Invalid callback body" }, 400);
    }

    const callback = body.Body.stkCallback;
    const metadataItems = callback.CallbackMetadata?.Item || [];

    // Helper to find item by Name safely
    const getMeta = (name: string) =>
      metadataItems.find((item: any) => item.Name === name)?.Value;

    const transactionReference = getMeta("MpesaReceiptNumber") ?? null;
    const phoneNumber = getMeta("PhoneNumber")?.toString() ?? null;
    const amount = getMeta("Amount") ?? 0;
    const transactionDate = getMeta("TransactionDate")?.toString() ?? null;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;
    const checkoutRequestId = callback.CheckoutRequestID;

    // 2. TRIGGER BACKGROUND PROCESS (WaitUntil)
    if (checkoutRequestId) {
      c.executionCtx.waitUntil(
        processPaymentCallback(
          { supabase, notifications },
          {
            checkoutRequestId,
            resultCode,
            resultDesc,
            transactionReference,
            phoneNumber,
            amount: Number(amount),
            transactionDate,
            rawResponse: body,
          }
        )
      );
    }

    // 3. RESPOND IMMEDIATELY
    // Safaricom expects a response within seconds.
    // If we wait for Supabase/Email, we might timeout.
    return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("💥 Error handling M-PESA callback:", error);
    // Always return 200 to Safaricom otherwise they will keep retrying
    return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

// =====================================================
// SIMULATED CALLBACK (Dev Only)
// =====================================================
router.post("/callback-simulate", async (c) => {
  const env = c.env; // Access env vars in Hono

  if (env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    const { checkoutRequestId, amount, phone } = await c.req.json();
    const supabase = c.get("supabase");
    const notifications = c.get("notifications");

    // Generate fake data
    const fakeRef = `FAKE${Math.random()
      .toString(36)
      .substring(2, 12)
      .toUpperCase()}`;
    const fakeDate = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14); // Simulate M-Pesa format

    // Respond immediately
    const response = c.json({
      success: true,
      message: "Processing simulation...",
      transactionReference: fakeRef,
    });

    // Run logic
    c.executionCtx.waitUntil(
      processPaymentCallback(
        { supabase, notifications },
        {
          checkoutRequestId,
          resultCode: 0, // Success
          resultDesc: "Success (Simulated)",
          transactionReference: fakeRef,
          phoneNumber: phone || "254700000000",
          amount: amount || 100,
          transactionDate: fakeDate,
          rawResponse: { simulated: true },
        }
      )
    );

    return response;
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default router;
