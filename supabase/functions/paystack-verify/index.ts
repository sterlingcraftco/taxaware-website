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

    const { reference } = await req.json();

    if (!reference) {
      throw new Error("Reference is required");
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message || "Failed to verify payment");
    }

    const transaction = paystackData.data;

    if (transaction.status !== "success") {
      throw new Error(`Payment ${transaction.status}`);
    }

    // Check if this transaction was already processed
    const { data: existingTransaction } = await supabaseClient
      .from("savings_transactions")
      .select("id")
      .eq("paystack_reference", reference)
      .single();

    if (existingTransaction) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          data: { already_processed: true },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const amount = transaction.amount / 100; // Convert from kobo to naira

    // Get user's savings account
    const { data: account, error: accountError } = await supabaseClient
      .from("tax_savings_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      throw new Error("Savings account not found");
    }

    const newBalance = Number(account.balance) + amount;
    const newTotalDeposits = Number(account.total_deposits) + amount;

    // Update savings account balance
    const { error: updateError } = await supabaseClient
      .from("tax_savings_accounts")
      .update({
        balance: newBalance,
        total_deposits: newTotalDeposits,
      })
      .eq("id", account.id);

    if (updateError) {
      throw new Error("Failed to update account balance");
    }

    // Record the transaction
    const { error: transactionError } = await supabaseClient
      .from("savings_transactions")
      .insert({
        user_id: user.id,
        account_id: account.id,
        type: "deposit",
        amount: amount,
        balance_after: newBalance,
        paystack_reference: reference,
        description: "Deposit via Paystack",
        metadata: {
          channel: transaction.channel,
          paid_at: transaction.paid_at,
        },
      });

    if (transactionError) {
      console.error("Error recording transaction:", transactionError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          amount,
          new_balance: newBalance,
          reference,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
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
