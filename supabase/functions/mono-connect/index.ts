import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const MONO_API_BASE = "https://api.withmono.com/v2";

serve(async (req) => {
  const headers = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const MONO_SECRET_KEY = Deno.env.get("MONO_SECRET_KEY");
    if (!MONO_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Mono integration is not configured" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { action, ...body } = await req.json();

    if (action === "exchange_token") {
      // Exchange the auth code from Mono Connect widget for an account ID
      const response = await fetch(`${MONO_API_BASE}/accounts/auth`, {
        method: "POST",
        headers: {
          "mono-sec-key": MONO_SECRET_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: body.code }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Mono exchange token error [${response.status}]:`, errBody);
        throw new Error(`Failed to exchange token: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({ account_id: data.id }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (action === "get_transactions") {
      const { account_id, start, end, paginate } = body;

      if (!account_id) {
        return new Response(JSON.stringify({ error: "account_id is required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      let url = `${MONO_API_BASE}/accounts/${account_id}/transactions?type=debit,credit`;
      if (start) url += `&start=${start}`;
      if (end) url += `&end=${end}`;
      if (paginate) url += `&paginate=${paginate}`;

      const response = await fetch(url, {
        headers: {
          "mono-sec-key": MONO_SECRET_KEY,
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Mono transactions error [${response.status}]:`, errBody);
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data = await response.json();

      // Transform Mono transactions to our format
      const transactions = (data.data || []).map((tx: any) => ({
        date: tx.date,
        description: tx.narration || tx.description || "Unknown",
        amount: Math.abs(tx.amount / 100), // Mono amounts are in kobo
        type: tx.type === "credit" ? "income" : "expense",
        balance: tx.balance ? tx.balance / 100 : null,
      }));

      return new Response(JSON.stringify({
        transactions,
        pagination: data.paging || null,
        account_info: {
          bank_name: data.meta?.bank_name || null,
          account_number: data.meta?.account_number || null,
          account_name: data.meta?.name || null,
          currency: data.meta?.currency || "NGN",
        },
      }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (action === "get_account_info") {
      const { account_id } = body;

      const response = await fetch(`${MONO_API_BASE}/accounts/${account_id}`, {
        headers: {
          "mono-sec-key": MONO_SECRET_KEY,
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Mono account info error [${response.status}]:`, errBody);
        throw new Error(`Failed to fetch account info: ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mono connect error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
