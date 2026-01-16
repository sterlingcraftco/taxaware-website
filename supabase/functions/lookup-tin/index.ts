import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TINLookupRequest {
  nin: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nin, firstName, lastName, dateOfBirth } = await req.json() as TINLookupRequest;

    // Validate required fields
    if (!nin || !firstName || !lastName || !dateOfBirth) {
      return new Response(
        JSON.stringify({ error: 'All fields are required: nin, firstName, lastName, dateOfBirth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('NIMC_API_KEY');
    if (!apiKey) {
      console.error('NIMC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Make request to NIMC API
    const response = await fetch("https://live.ninauth.nimc.gov.ng/v1/resolve", {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        nin,
        firstName,
        lastName,
        dateOfBirth: (() => {
          // Try to convert YYYY-MM-DD to DD/MM/YYYY
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
            const [year, month, day] = dateOfBirth.split('-');
            return `${day}/${month}/${year}`;
          }
          // If it's already DD/MM/YYYY or another format, try parsing carefully
          const date = new Date(dateOfBirth);
          if (!isNaN(date.getTime())) {
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = date.getFullYear();
            return `${d}/${m}/${y}`;
          }
          return dateOfBirth;
        })(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('NIMC API error:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to retrieve TIN', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in lookup-tin function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
