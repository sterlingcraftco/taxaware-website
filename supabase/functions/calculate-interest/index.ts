import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANNUAL_INTEREST_RATE = 0.10; // 10% per annum
const QUARTERLY_RATE = ANNUAL_INTEREST_RATE / 4; // 2.5% per quarter

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all eligible accounts (no withdrawals this quarter and positive balance)
    const { data: accounts, error: accountsError } = await supabaseClient
      .from("tax_savings_accounts")
      .select("*")
      .eq("has_withdrawal_this_quarter", false)
      .gt("balance", 0);

    if (accountsError) {
      throw new Error("Failed to fetch eligible accounts");
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No eligible accounts for interest payment",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let processedCount = 0;
    const errors: string[] = [];

    for (const account of accounts) {
      try {
        const interest = Number(account.balance) * QUARTERLY_RATE;
        const newBalance = Number(account.balance) + interest;
        const newTotalInterest = Number(account.total_interest_earned) + interest;

        // Update account with interest
        const { error: updateError } = await supabaseClient
          .from("tax_savings_accounts")
          .update({
            balance: newBalance,
            total_interest_earned: newTotalInterest,
            last_interest_date: new Date().toISOString(),
          })
          .eq("id", account.id);

        if (updateError) {
          errors.push(`Account ${account.id}: ${updateError.message}`);
          continue;
        }

        // Record the interest transaction
        const { error: transactionError } = await supabaseClient
          .from("savings_transactions")
          .insert({
            user_id: account.user_id,
            account_id: account.id,
            type: "interest",
            amount: interest,
            balance_after: newBalance,
            description: `Quarterly interest payment (${(QUARTERLY_RATE * 100).toFixed(1)}%)`,
            metadata: {
              rate: QUARTERLY_RATE,
              balance_at_calculation: account.balance,
            },
          });

        if (transactionError) {
          console.error("Error recording interest transaction:", transactionError);
        }

        processedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Account ${account.id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Interest calculated for ${processedCount} accounts`,
        processed: processedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error calculating interest:", error);
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
