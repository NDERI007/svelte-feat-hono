import { processPaymentCallback } from "routes/mpesa";
import type { Env } from "../types/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationService } from "@/services/notification"; // Import this

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// =====================================================
// Get OAuth Access Token
// =====================================================
export async function getAccessToken(env: Env): Promise<string> {
  const auth = btoa(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`);

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as any;
  return data.access_token;
}

// =====================================================
// Process Simulated Callback
// =====================================================
export async function processSimulatedCallback(
  // ✅ 1. Accept Dependencies Object
  deps: { supabase: SupabaseClient; notifications: NotificationService },
  checkoutRequestId: string,
  orderId: string,
  amount: number,
  phone: string
): Promise<void> {
  console.log("🟡 Processing simulated callback for order:", orderId);

  const fakeTransactionReference = `FAKE${Math.random()
    .toString(36)
    .substring(2, 12)
    .toUpperCase()}`;

  const fakeTransactionDate = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);

  // ✅ 2. FIX: Pass 2 separate arguments (Dependencies, Data)
  await processPaymentCallback(
    deps, // Arg 1: Dependencies
    {
      // Arg 2: Data Parameters
      checkoutRequestId,
      resultCode: 0,
      resultDesc: "The service request is processed successfully.",
      transactionReference: fakeTransactionReference,
      phoneNumber: phone,
      amount: amount,
      transactionDate: fakeTransactionDate,
      rawResponse: {
        simulated: true,
        note: "This is a fake transaction for development",
        orderId: orderId,
      },
    }
  );

  console.log("🎉 Simulated payment processing complete");
}

// =====================================================
// Send STK Push Request
// =====================================================
export async function stkPush(
  env: Env,
  // ✅ 3. Update Signature to accept Dependencies Object
  deps: { supabase: SupabaseClient; notifications: NotificationService },
  phone: string,
  amount: number,
  orderId: string
): Promise<STKPushResponse> {
  if (env.SIMULATE_SUCCESS === "true") {
    console.log("🧪 DEV MODE: Simulating M-PESA payment");

    const fakeCheckoutRequestId = `ws_CO_${Date.now()}${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const fakeMerchantRequestId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const fakeResponse: STKPushResponse = {
      MerchantRequestID: fakeMerchantRequestId,
      CheckoutRequestID: fakeCheckoutRequestId,
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing",
    };

    return fakeResponse;
  }

  // 🎯 PRODUCTION
  const token = await getAccessToken(env);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const password = btoa(
    `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`
  );

  const payload = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: `${env.BASE_URL}/api/mpesa/callback`,
    AccountReference: orderId,
    TransactionDesc: `Order ${orderId}`,
  };

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`STK Push failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as STKPushResponse;
  return data;
}
