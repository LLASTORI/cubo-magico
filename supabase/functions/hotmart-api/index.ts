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
  const basicAuth = Deno.env.get('HOTMART_BASIC_AUTH');

  if (!basicAuth) {
    throw new Error('Hotmart Basic Auth credential not configured');
  }

  // Create form data for OAuth2
  const formData = new URLSearchParams();
  formData.append('grant_type', 'client_credentials');

  console.log('Requesting Hotmart token...');

  const response = await fetch('https://api-sec-vlc.hotmart.com/security/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
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
    const { endpoint, params } = await req.json();
    console.log('Fetching Hotmart data:', { endpoint, params });

    const token = await getHotmartToken();

    // Construct query string
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `https://developers.hotmart.com/payments/api/v1${endpoint}${queryString ? `?${queryString}` : ''}`;

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
