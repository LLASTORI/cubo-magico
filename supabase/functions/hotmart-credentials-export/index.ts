import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code, x-cubo-internal-key',
};

// Internal key for VPS-to-VPS authentication
const CUBO_INTERNAL_KEY = Deno.env.get('CUBO_INTERNAL_KEY');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for VPS-to-VPS authentication via X-Cubo-Internal-Key
    const internalKey = req.headers.get('X-Cubo-Internal-Key') || req.headers.get('x-cubo-internal-key');
    const isInternalCall = internalKey && CUBO_INTERNAL_KEY && internalKey === CUBO_INTERNAL_KEY;

    // Get project_id from query params or body
    const url = new URL(req.url);
    let projectId = url.searchParams.get('project_id');
    
    if (!projectId && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      projectId = body.project_id;
    }

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'project_id required as query param or in body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If internal VPS call with valid key, skip user auth
    if (isInternalCall) {
      console.log(`[hotmart-credentials-export] VPS internal call authenticated for project: ${projectId}`);
    } else {
      // Regular user authentication flow
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.error('[hotmart-credentials-export] No authorization header');
        return new Response(
          JSON.stringify({ error: 'Authorization header or X-Cubo-Internal-Key required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('[hotmart-credentials-export] Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[hotmart-credentials-export] User authenticated: ${user.id}`);
      console.log(`[hotmart-credentials-export] Checking access for project: ${projectId}`);

      // Check if user is owner or manager of this project
      const { data: projectOwner } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .maybeSingle();

      const isOwner = projectOwner?.user_id === user.id;

      let isManager = false;
      if (!isOwner) {
        const { data: memberRole } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        isManager = memberRole?.role === 'manager';
      }

      // Check if user is super admin
      const { data: adminCheck } = await supabase
        .rpc('is_super_admin', { user_id: user.id });

      const isSuperAdmin = adminCheck === true;

      if (!isOwner && !isManager && !isSuperAdmin) {
        console.error('[hotmart-credentials-export] User not authorized for this project');
        return new Response(
          JSON.stringify({ error: 'Access denied. Only project owner, manager, or super admin can export credentials.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[hotmart-credentials-export] Access granted. Owner: ${isOwner}, Manager: ${isManager}, SuperAdmin: ${isSuperAdmin}`);
    }

    // Get credentials using the secure function that decrypts values
    const { data: credentials, error: credError } = await supabase
      .rpc('get_project_credentials_secure', { p_project_id: projectId });

    if (credError) {
      console.error('[hotmart-credentials-export] Error fetching credentials:', credError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch credentials', details: credError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find hotmart credentials
    const hotmartCreds = credentials?.find((c: any) => c.provider === 'hotmart');

    if (!hotmartCreds) {
      return new Response(
        JSON.stringify({ error: 'No Hotmart credentials found for this project' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hotmartCreds.client_id || !hotmartCreds.client_secret) {
      return new Response(
        JSON.stringify({ 
          error: 'Hotmart credentials are incomplete',
          has_client_id: !!hotmartCreds.client_id,
          has_client_secret: !!hotmartCreds.client_secret
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Only log that we're returning, NOT the actual values
    console.log(`[hotmart-credentials-export] Successfully returning credentials for project ${projectId}`);

    // Return only client_id and client_secret
    return new Response(
      JSON.stringify({
        client_id: hotmartCreds.client_id,
        client_secret: hotmartCreds.client_secret,
        // Basic auth is optional
        basic_auth: hotmartCreds.basic_auth || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[hotmart-credentials-export] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
