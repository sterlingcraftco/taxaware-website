import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const headers = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const systemPrompt = `You are a bank statement parser. Extract ALL transactions from the provided bank statement PDF.

For each transaction, extract:
- date: The transaction date in YYYY-MM-DD format
- description: The transaction description/narration
- amount: The absolute numeric amount (no currency symbols, no commas)
- type: Either "income" (credit/deposit) or "expense" (debit/withdrawal)
- balance: The running balance after the transaction if available, otherwise null

Return ONLY a valid JSON object with this exact structure:
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "Salary Payment",
      "amount": 500000,
      "type": "income",
      "balance": 750000
    }
  ],
  "account_info": {
    "bank_name": "First Bank",
    "account_number": "1234567890",
    "account_name": "John Doe",
    "currency": "NGN",
    "period_start": "2024-01-01",
    "period_end": "2024-01-31"
  }
}

Important rules:
- Parse ALL transactions, not just a sample
- Amounts must be positive numbers
- Use "income" for credits/deposits and "expense" for debits/withdrawals
- If you cannot determine the type, use "expense" as default
- Dates must be in YYYY-MM-DD format
- Remove currency symbols and commas from amounts
- If account info is not available, set fields to null`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Parse all transactions from this bank statement PDF. Return the JSON object with all transactions.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const body = await response.text();

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      console.error(`AI gateway error [${status}]:`, body);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return new Response(JSON.stringify(parsed), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse statement error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse statement";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
