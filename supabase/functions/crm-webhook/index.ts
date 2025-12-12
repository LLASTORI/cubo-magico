import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface LeadPayload {
  email: string;
  name?: string;
  phone?: string;
  phone_ddd?: string;
  document?: string;
  instagram?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  cep?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.log('[CRM Webhook] Missing API key');
      return new Response(
        JSON.stringify({ error: 'Missing API key. Provide it in the x-api-key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key and get project info
    const { data: webhookKey, error: keyError } = await supabase
      .from('crm_webhook_keys')
      .select('id, project_id, default_tags, allowed_sources')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !webhookKey) {
      console.log('[CRM Webhook] Invalid API key:', keyError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CRM Webhook] Valid API key for project:', webhookKey.project_id);

    // Parse request body
    const body: LeadPayload = await req.json();

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge tags (default + provided)
    const mergedTags = [
      ...(webhookKey.default_tags || []),
      ...(body.tags || [])
    ].filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates

    const email = body.email.toLowerCase().trim();
    const now = new Date().toISOString();

    // Upsert contact
    const { data: contact, error: upsertError } = await supabase
      .from('crm_contacts')
      .upsert({
        project_id: webhookKey.project_id,
        email,
        name: body.name || null,
        phone: body.phone || null,
        phone_ddd: body.phone_ddd || null,
        document: body.document || null,
        instagram: body.instagram || null,
        address: body.address || null,
        address_number: body.address_number || null,
        address_complement: body.address_complement || null,
        neighborhood: body.neighborhood || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || null,
        cep: body.cep || null,
        tags: mergedTags.length > 0 ? mergedTags : null,
        custom_fields: body.custom_fields || {},
        source: 'webhook',
        status: 'lead',
        first_utm_source: body.utm_source || null,
        first_utm_campaign: body.utm_campaign || null,
        first_utm_medium: body.utm_medium || null,
        first_utm_content: body.utm_content || null,
        first_utm_term: body.utm_term || null,
        first_seen_at: now,
        last_activity_at: now,
      }, {
        onConflict: 'project_id,email',
        ignoreDuplicates: false,
      })
      .select('id, email, name, status, tags, created_at')
      .single();

    if (upsertError) {
      console.error('[CRM Webhook] Error upserting contact:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save contact', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update webhook key usage stats
    await supabase
      .from('crm_webhook_keys')
      .update({
        last_used_at: now,
        usage_count: (webhookKey as any).usage_count + 1,
      })
      .eq('id', webhookKey.id);

    console.log('[CRM Webhook] Contact saved:', contact.id);

    return new Response(
      JSON.stringify({
        success: true,
        contact: {
          id: contact.id,
          email: contact.email,
          name: contact.name,
          status: contact.status,
          tags: contact.tags,
          created_at: contact.created_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CRM Webhook] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
