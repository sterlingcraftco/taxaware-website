import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) throw new Error("Paystack secret key not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) throw new Error("Unauthorized");

    const { reference } = await req.json();
    if (!reference) throw new Error("Reference is required");

    // Verify with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { "Authorization": `Bearer ${paystackSecretKey}` },
    });
    const paystackData = await paystackResponse.json();

    if (!paystackData.status) throw new Error(paystackData.message || "Verification failed");

    const transaction = paystackData.data;
    if (transaction.status !== "success") throw new Error(`Payment ${transaction.status}`);

    const metadata = transaction.metadata || {};
    const plan = metadata.plan || 'monthly';
    const amount = transaction.amount / 100;

    // Calculate period — annual runs Jan 1 to Dec 31
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    // Get subscription code from Paystack if available
    const subscriptionCode = transaction.plan_object?.subscriptions?.[0]?.subscription_code || null;
    const customerCode = transaction.customer?.customer_code || null;

    // Upsert subscription
    const { error: upsertError } = await supabaseClient
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        plan,
        status: 'active',
        paystack_subscription_code: subscriptionCode,
        paystack_customer_code: customerCode,
        amount,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      throw new Error("Failed to update subscription");
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { plan, amount, period_end: periodEnd.toISOString() },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
