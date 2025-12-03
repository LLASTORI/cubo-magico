import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HotmartTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ProjectCredentials {
  client_id: string | null;
  client_secret: string | null;
  basic_auth: string | null;
}

async function getProjectCredentials(projectId: string): Promise<ProjectCredentials> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from('project_credentials')
    .select('client_id, client_secret, basic_auth')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching project credentials:', error);
    throw new Error('Failed to fetch project credentials');
  }
  
  if (!data) {
    throw new Error('Project credentials not configured. Please configure Hotmart credentials in project settings.');
  }
  
  return data;
}

async function getHotmartToken(credentials: ProjectCredentials): Promise<string> {
  const { client_id, client_secret } = credentials;

  if (!client_id || !client_secret) {
    throw new Error('Hotmart credentials not configured (client_id, client_secret). Configure them in project settings.');
  }

  console.log('Requesting Hotmart token...');
  console.log('Using client_id:', client_id.substring(0, 8) + '...');

  // Encode credentials as Base64 for Basic Auth (client_id:client_secret)
  const basicAuth = btoa(`${client_id}:${client_secret}`);
  
  // According to Hotmart docs, send client_id and client_secret as query params + Basic token in header
  const url = `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(client_id)}&client_secret=${encodeURIComponent(client_secret)}`;

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
    throw new Error(`Failed to authenticate with Hotmart: ${response.status}. Check your credentials.`);
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
    const { endpoint, params, apiType, projectId } = await req.json();
    console.log('Fetching Hotmart data:', { endpoint, params, apiType, projectId });

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Fetch credentials from database for this project
    const credentials = await getProjectCredentials(projectId);
    
    // Get token using project-specific credentials
    const token = await getHotmartToken(credentials);

    // Determine base URL based on API type
    const baseUrl = apiType === 'products' 
      ? 'https://developers.hotmart.com/products/api/v1'
      : 'https://developers.hotmart.com/payments/api/v1';

    // Construct query string
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `${baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;

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
