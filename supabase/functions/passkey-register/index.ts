import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "https://esm.sh/@simplewebauthn/server@11.0.0?target=deno";

import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const headers = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token length:", token.length);
    
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError?.message || "User not found");
      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        details: userError?.message 
      }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    console.log("Authenticated user:", user.id);

    const { action, origin: clientOrigin, ...body } = await req.json();

    // Derive RP ID from the client's origin
    const originUrl = new URL(clientOrigin);
    const rpID = originUrl.hostname;
    const rpName = "TaxAware";

    if (action === "options") {
      // Get existing passkeys for this user
      const { data: existingKeys } = await supabaseAdmin
        .from("user_passkeys")
        .select("credential_id")
        .eq("user_id", user.id);

      const excludeCredentials = (existingKeys || []).map((key: any) => ({
        id: key.credential_id,
        type: "public-key" as const,
      }));

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: user.email || user.id,
        userDisplayName:
          user.user_metadata?.full_name || user.email || "User",
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      // Store challenge
      await supabaseAdmin.from("passkey_challenges").insert({
        user_id: user.id,
        challenge: options.challenge,
        type: "registration",
      });

      return new Response(JSON.stringify(options), {
            headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      // Get stored challenge
      const { data: challengeRow } = await supabaseAdmin
        .from("passkey_challenges")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "registration")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!challengeRow) {
        return new Response(
          JSON.stringify({ error: "No challenge found. Please try again." }),
          {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          }
        );
      }

      const verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: clientOrigin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return new Response(
          JSON.stringify({ error: "Verification failed" }),
          {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          }
        );
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      // Store the credential - encode binary data as base64url
      const credentialIdBase64 = btoa(
        String.fromCharCode(...new Uint8Array(credential.id))
      )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const publicKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(credential.publicKey))
      )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await supabaseAdmin.from("user_passkeys").insert({
        user_id: user.id,
        credential_id: credentialIdBase64,
        public_key: publicKeyBase64,
        counter: Number(credential.counter),
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        transports: credential.transports || [],
        name: body.name || "My Passkey",
      });

      // Clean up challenge
      await supabaseAdmin
        .from("passkey_challenges")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "registration");

      return new Response(
        JSON.stringify({ verified: true }),
        {
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Passkey registration error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
});
