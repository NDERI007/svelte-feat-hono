import { stkPush, processSimulatedCallback } from "@/services/mpesa"; // Import both
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationService } from "@/services/notification";
import type { Env } from "@/types/env";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processMpesaPayment(
  env: Env,
  supabase: SupabaseClient,
  notifications: NotificationService,
  phone: string,
  amount: number,
  orderID: string
) {
  try {
    console.log(`⚡ [Background] Starting STK Push for ${orderID}`);

    // 1. Trigger M-Pesa (Returns immediately in DEV)
    const stkResponse = await stkPush(
      env,
      { supabase, notifications },
      phone,
      amount,
      orderID
    );

    // 2. Update DB with CheckoutRequestID (CRITICAL: Must happen before callback)
    const { error } = await supabase
      .from("orders")
      .update({
        checkout_request_id: stkResponse.CheckoutRequestID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderID);

    if (error) {
      console.error("⚠️ [Background] DB Update Error:", error);
      return; // Stop if we couldn't save the ID
    }

    console.log(
      `✅ [Background] STK Push sent. ID saved: ${stkResponse.CheckoutRequestID}`
    );

    // 3. IF DEV MODE: Trigger the simulated callback NOW
    // We wait 3 seconds to mimic real world latency, then fire the callback.
    if (String(env.SIMULATE_SUCCESS) === "true") {
      console.log("⏳ [Background] Waiting 3s before simulating callback...");
      await delay(3000);

      await processSimulatedCallback(
        { supabase, notifications },
        stkResponse.CheckoutRequestID, // Now this ID exists in the DB!
        orderID,
        amount,
        phone
      );
    }
  } catch (stkError: any) {
    console.error(`❌ [Background] STK Push Failed for ${orderID}:`, stkError);

    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderID);
  }
}
