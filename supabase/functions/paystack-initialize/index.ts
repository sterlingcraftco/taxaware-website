import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MINIMUM_DEPOSIT = 1000; // NGN 1,000 minimum

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { amount, email, callback_url } = await req.json();

    if (!amount || amount < MINIMUM_DEPOSIT) {
      throw new Error(`Minimum deposit amount is NGN ${MINIMUM_DEPOSIT.toLocaleString()}`);
    }

    // Ensure user has a savings account
    const { data: existingAccount } = await supabaseClient
      .from("tax_savings_accounts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!existingAccount) {
      // Create savings account for user
      const { error: createError } = await supabaseClient
        .from("tax_savings_accounts")
        .insert({ user_id: user.id });

      if (createError) {
        console.error("Error creating savings account:", createError);
        throw new Error("Failed to create savings account");
      }
    }

    // Generate unique reference
    const reference = `TAX_SAV_${user.id.slice(0, 8)}_${Date.now()}`;

    // Initialize Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email || user.email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference,
        callback_url,
        channels: ["card", "bank", "bank_transfer"],
        metadata: {
          user_id: user.id,
          type: "tax_savings_deposit",
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
          access_code: paystackData.data.access_code,
          reference: paystackData.data.reference,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error initializing payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
