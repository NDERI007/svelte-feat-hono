import { stkPush } from "@/services/mpesa";

export async function processMpesaPayment(
  env: any,
  supabase: any,
  phone: string,
  amount: number,
  orderID: string
) {
  try {
    console.log(`⚡ [Background] Starting STK Push for ${orderID}`);

    // 1. Trigger M-Pesa
    const stkResponse = await stkPush(env, supabase, phone, amount, orderID);

    // 2. Success? Update DB with CheckoutRequestID
    const { error } = await supabase
      .from("orders")
      .update({
        checkout_request_id: stkResponse.CheckoutRequestID,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderID);

    if (error) console.error("⚠️ [Background] DB Update Error:", error);
    console.log(`✅ [Background] STK Push sent for ${orderID}`);
  } catch (stkError: any) {
    console.error(`❌ [Background] STK Push Failed for ${orderID}:`, stkError);

    // 3. Failure? Mark order as 'failed' so frontend stops waiting
    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderID);
  }
}
