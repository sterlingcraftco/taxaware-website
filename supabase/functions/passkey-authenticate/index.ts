import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@11";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, origin: clientOrigin, ...body } = await req.json();

    const originUrl = new URL(clientOrigin);
    const rpID = originUrl.hostname;

    if (action === "options") {
      // For discoverable credentials, no need to specify allowCredentials
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
      });

      // Store challenge (no user_id since user isn't authenticated yet)
      // Use a temporary ID from the client to link challenge
      await supabaseAdmin.from("passkey_challenges").insert({
        user_id: null,
        challenge: options.challenge,
        type: `authentication:${body.session_id}`,
      });

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      // Get stored challenge using session_id
      const { data: challengeRow } = await supabaseAdmin
        .from("passkey_challenges")
        .select("*")
        .eq("type", `authentication:${body.session_id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!challengeRow) {
        return new Response(
          JSON.stringify({ error: "No challenge found. Please try again." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Find the credential in the database
      // The credential ID from the response is base64url encoded
      const credentialIdFromResponse = body.credential.id;

      const { data: passkey } = await supabaseAdmin
        .from("user_passkeys")
        .select("*")
        .eq("credential_id", credentialIdFromResponse)
        .single();

      if (!passkey) {
        return new Response(
          JSON.stringify({ error: "Passkey not found. Please sign in with email and password." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Decode the stored public key from base64url
      const publicKeyBase64 = passkey.public_key
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const publicKeyBytes = Uint8Array.from(atob(publicKeyBase64), (c) =>
        c.charCodeAt(0)
      );

      const verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: clientOrigin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credential_id,
          publicKey: publicKeyBytes,
          counter: Number(passkey.counter),
          transports: passkey.transports || [],
        },
      });

      if (!verification.verified) {
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Update counter
      await supabaseAdmin
        .from("user_passkeys")
        .update({ counter: Number(verification.authenticationInfo.newCounter) })
        .eq("id", passkey.id);

      // Clean up challenge
      await supabaseAdmin
        .from("passkey_challenges")
        .delete()
        .eq("type", `authentication:${body.session_id}`);

      // Get user email to generate a magic link token
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", passkey.user_id)
        .single();

      if (!profile?.email) {
        return new Response(
          JSON.stringify({ error: "User profile not found" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Generate a magic link for the user (returns hashed_token)
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: profile.email,
        });

      if (linkError || !linkData) {
        console.error("Generate link error:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          verified: true,
          token_hash: linkData.properties.hashed_token,
          email: profile.email,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Passkey authentication error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
