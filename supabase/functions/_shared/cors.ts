export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = [
    'https://taxaware.ng',
    'https://preview.taxaware.ng',
    'https://4657078a-bcfd-471d-a751-82c2cce31141.lovableproject.com',
    'https://preview--taxaware-ng.lovable.app',
  ];

  const headers = { ...corsHeaders };

  if (origin) {
    if (
      allowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  }

  return headers;
};
