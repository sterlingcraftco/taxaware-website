import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const VERSION = "0.1.0-security-audit";

serve(async (req) => {
  const headers = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  return new Response(
    JSON.stringify({
      version: VERSION,
      status: "secure",
      environment: Deno.env.get("ENVIRONMENT") || "production",
      deployed_at: new Date().toISOString(),
    }),
    {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 200,
    }
  );
});
