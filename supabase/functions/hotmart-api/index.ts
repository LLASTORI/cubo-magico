import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HotmartTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getHotmartToken(): Promise<string> {
  const clientId = Deno.env.get('HOTMART_CLIENT_ID');
  const clientSecret = Deno.env.get('HOTMART_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Hotmart credentials not configured (client_id, client_secret)');
  }

  console.log('Requesting Hotmart token...');
  console.log('Using client_id:', clientId.substring(0, 8) + '...');

  // Encode credentials as Base64 for Basic Auth (client_id:client_secret)
  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  
  // According to Hotmart docs, send client_id and client_secret as query params + Basic token in header
  const url = `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get Hotmart token. Status:', response.status);
    console.error('Error response:', error);
    throw new Error(`Failed to authenticate with Hotmart: ${response.status}`);
  }

  const data: HotmartTokenResponse = await response.json();
  console.log('Token obtained successfully');
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, params, apiType } = await req.json();
    console.log('Fetching Hotmart data:', { endpoint, params, apiType });

    const token = await getHotmartToken();

    // Determine base URL based on API type
    // Products API: https://developers.hotmart.com/products/api/v1
    // Payments API: https://developers.hotmart.com/payments/api/v1
    const baseUrl = apiType === 'products' 
      ? 'https://developers.hotmart.com/products/api/v1'
      : 'https://developers.hotmart.com/payments/api/v1';

    // Construct query string
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;

    console.log('Calling Hotmart API:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Hotmart API error:', error);
      throw new Error(`Hotmart API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Hotmart API response received');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in hotmart-api function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
