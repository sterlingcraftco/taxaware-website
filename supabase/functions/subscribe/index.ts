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

    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) throw new Error("Unauthorized");

    const { plan, callback_url } = await req.json();

    if (!plan || !['monthly', 'annual'].includes(plan)) {
      throw new Error("Invalid plan. Must be 'monthly' or 'annual'");
    }

    const amount = plan === 'monthly' ? 70000 : 600000; // kobo
    const planName = plan === 'monthly' ? 'TaxAware Monthly' : 'TaxAware Annual';
    const interval = plan === 'monthly' ? 'monthly' : 'annually';

    // Create or get Paystack plan
    // First try to find existing plan
    const plansResponse = await fetch("https://api.paystack.co/plan", {
      headers: { "Authorization": `Bearer ${paystackSecretKey}` },
    });
    const plansData = await plansResponse.json();
    
    let paystackPlan = plansData.data?.find(
      (p: any) => p.name === planName && p.amount === amount && p.interval === interval
    );

    if (!paystackPlan) {
      // Create the plan
      const createPlanResponse = await fetch("https://api.paystack.co/plan", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: planName,
          amount,
          interval,
          currency: "NGN",
        }),
      });
      const createPlanData = await createPlanResponse.json();
      if (!createPlanData.status) {
        throw new Error(createPlanData.message || "Failed to create plan");
      }
      paystackPlan = createPlanData.data;
    }

    // Initialize transaction with plan
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount,
        plan: paystackPlan.plan_code,
        callback_url,
        channels: ["card"],
        metadata: {
          user_id: user.id,
          type: "subscription",
          plan,
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message || "Failed to initialize subscription");
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
