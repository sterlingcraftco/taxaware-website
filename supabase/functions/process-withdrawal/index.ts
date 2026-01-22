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

    // Check if user is admin
    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      throw new Error("Admin access required");
    }

    const { withdrawal_id, action, notes } = await req.json();

    if (!withdrawal_id || !action) {
      throw new Error("Withdrawal ID and action are required");
    }

    if (!["approve", "reject"].includes(action)) {
      throw new Error("Invalid action. Must be 'approve' or 'reject'");
    }

    // Get the withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from("withdrawal_requests")
      .select("*, tax_savings_accounts(*)")
      .eq("id", withdrawal_id)
      .single();

    if (withdrawalError || !withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.status !== "pending") {
      throw new Error("Withdrawal request is not pending");
    }

    if (action === "approve") {
      // Process the withdrawal
      const account = withdrawal.tax_savings_accounts;
      const newBalance = Number(account.balance) - Number(withdrawal.amount);

      if (newBalance < 0) {
        throw new Error("Insufficient balance");
      }

      // Update account balance and mark withdrawal for this quarter
      const { error: updateAccountError } = await supabaseClient
        .from("tax_savings_accounts")
        .update({
          balance: newBalance,
          total_withdrawals: Number(account.total_withdrawals) + Number(withdrawal.amount),
          has_withdrawal_this_quarter: true,
        })
        .eq("id", account.id);

      if (updateAccountError) {
        throw new Error("Failed to update account balance");
      }

      // Record the withdrawal transaction
      const { error: transactionError } = await supabaseClient
        .from("savings_transactions")
        .insert({
          user_id: withdrawal.user_id,
          account_id: account.id,
          type: "withdrawal",
          amount: withdrawal.amount,
          balance_after: newBalance,
          description: `Withdrawal - ${withdrawal.withdrawal_type === "bank_transfer" ? "Bank Transfer" : "Tax Payment"}`,
          metadata: {
            withdrawal_id: withdrawal.id,
            bank_name: withdrawal.bank_name,
            account_number: withdrawal.account_number,
          },
        });

      if (transactionError) {
        console.error("Error recording transaction:", transactionError);
      }

      // Update withdrawal request status
      const { error: updateWithdrawalError } = await supabaseClient
        .from("withdrawal_requests")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          notes: notes || null,
        })
        .eq("id", withdrawal_id);

      if (updateWithdrawalError) {
        throw new Error("Failed to update withdrawal status");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Withdrawal approved and processed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Reject the withdrawal
      const { error: updateError } = await supabaseClient
        .from("withdrawal_requests")
        .update({
          status: "cancelled",
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          notes: notes || "Rejected by admin",
        })
        .eq("id", withdrawal_id);

      if (updateError) {
        throw new Error("Failed to reject withdrawal");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Withdrawal rejected",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("Error processing withdrawal:", error);
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
