import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { getCorsHeaders } from "../_shared/cors.ts";

const CONSULTATION_FEE = 100000; // ₦1,000 in kobo

serve(async (req) => {
  const headers = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const { email, name, callback_url } = await req.json();

    if (!email) throw new Error("Email is required");

    const reference = `CONSULT_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: CONSULTATION_FEE,
        reference,
        callback_url,
        channels: ["card", "bank", "ussd", "bank_transfer"],
        metadata: {
          type: "consultation_booking",
          customer_name: name || "",
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message || "Failed to initialize payment");
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authorization_url: paystackData.data.authorization_url,
          reference: paystackData.data.reference,
        },
      }),
      { headers: { ...headers, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...headers, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
