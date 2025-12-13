import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Common field aliases - maps variations to standard field names
const FIELD_ALIASES: Record<string, string> = {
  // Name variations
  'nome': 'name',
  'nome_completo': 'name',
  'full_name': 'name',
  'fullname': 'name',
  'first_name': 'name',
  'firstname': 'name',
  
  // Email variations
  'e-mail': 'email',
  'e_mail': 'email',
  'mail': 'email',
  'email_address': 'email',
  
  // Phone variations
  'telefone': 'phone',
  'celular': 'phone',
  'whatsapp': 'phone',
  'mobile': 'phone',
  'phone_number': 'phone',
  'tel': 'phone',
  'fone': 'phone',
  
  // Phone DDD variations
  'ddd': 'phone_ddd',
  'area_code': 'phone_ddd',
  
  // Document variations
  'cpf': 'document',
  'cnpj': 'document',
  'cpf_cnpj': 'document',
  'documento': 'document',
  
  // Instagram variations
  'insta': 'instagram',
  'ig': 'instagram',
  
  // Address variations
  'endereco': 'address',
  'rua': 'address',
  'logradouro': 'address',
  'street': 'address',
  
  // Address number variations
  'numero': 'address_number',
  'number': 'address_number',
  'num': 'address_number',
  
  // Complement variations
  'complemento': 'address_complement',
  'complement': 'address_complement',
  'apto': 'address_complement',
  'apartamento': 'address_complement',
  
  // Neighborhood variations
  'bairro': 'neighborhood',
  'district': 'neighborhood',
  
  // City variations
  'cidade': 'city',
  'municipio': 'city',
  
  // State variations
  'estado': 'state',
  'uf': 'state',
  'province': 'state',
  
  // Country variations
  'pais': 'country',
  
  // CEP variations
  'cep': 'cep',
  'zip': 'cep',
  'zipcode': 'cep',
  'zip_code': 'cep',
  'postal_code': 'cep',
  'codigo_postal': 'cep',
  
  // Tags variations
  'tag': 'tags',
  'labels': 'tags',
  'etiquetas': 'tags',
  
  // UTM variations
  'source': 'utm_source',
  'origem': 'utm_source',
  'campaign': 'utm_campaign',
  'campanha': 'utm_campaign',
  'medium': 'utm_medium',
  'midia': 'utm_medium',
  'content': 'utm_content',
  'conteudo': 'utm_content',
  'term': 'utm_term',
  'termo': 'utm_term',
  
  // Page name variations
  'pagina': 'page_name',
  'page': 'page_name',
  'landing_page': 'page_name',
  'lp': 'page_name',
  'form_name': 'page_name',
  'formulario': 'page_name',
  
  // Custom fields variations
  'extras': 'custom_fields',
  'dados_extras': 'custom_fields',
  'metadata': 'custom_fields',
};

// Standard fields that we accept
const STANDARD_FIELDS = [
  'email', 'name', 'phone', 'phone_ddd', 'document', 'instagram',
  'address', 'address_number', 'address_complement', 'neighborhood',
  'city', 'state', 'country', 'cep', 'tags', 'custom_fields',
  'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term',
  'page_name'
];

interface NormalizedPayload {
  email?: string;
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
  page_name?: string;
}

// Normalize field names using aliases and custom mappings
function normalizePayload(
  body: Record<string, unknown>, 
  customMappings: Record<string, string> = {}
): NormalizedPayload {
  const normalized: Record<string, unknown> = {};
  const unmappedFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (value === null || value === undefined || value === '') continue;
    
    const lowerKey = key.toLowerCase().trim();
    
    // Priority: 1. Custom mapping, 2. Built-in alias, 3. Direct match
    let targetField: string | undefined;
    
    // Check custom mappings first (case-insensitive)
    for (const [mapFrom, mapTo] of Object.entries(customMappings)) {
      if (mapFrom.toLowerCase() === lowerKey) {
        targetField = mapTo;
        break;
      }
    }
    
    // If no custom mapping, check built-in aliases
    if (!targetField) {
      targetField = FIELD_ALIASES[lowerKey];
    }
    
    // If no alias, check if it's a standard field
    if (!targetField && STANDARD_FIELDS.includes(lowerKey)) {
      targetField = lowerKey;
    }
    
    if (targetField) {
      // Handle special cases
      if (targetField === 'tags') {
        // Ensure tags is always an array
        if (Array.isArray(value)) {
          normalized[targetField] = value;
        } else if (typeof value === 'string') {
          normalized[targetField] = value.split(',').map(t => t.trim()).filter(Boolean);
        }
      } else if (targetField === 'custom_fields') {
        // Merge custom fields
        normalized[targetField] = {
          ...(normalized[targetField] as Record<string, unknown> || {}),
          ...(typeof value === 'object' ? value : { [key]: value })
        };
      } else {
        normalized[targetField] = value;
      }
    } else {
      // Store unmapped fields in custom_fields
      unmappedFields[key] = value;
    }
  }

  // Add unmapped fields to custom_fields
  if (Object.keys(unmappedFields).length > 0) {
    normalized.custom_fields = {
      ...(normalized.custom_fields as Record<string, unknown> || {}),
      ...unmappedFields
    };
  }

  return normalized as NormalizedPayload;
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
      .select('id, project_id, default_tags, allowed_sources, field_mappings, usage_count')
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
    const rawBody: Record<string, unknown> = await req.json();
    
    // Normalize payload using aliases and custom mappings
    const customMappings = (webhookKey.field_mappings as Record<string, string>) || {};
    const body = normalizePayload(rawBody, customMappings);

    console.log('[CRM Webhook] Normalized payload:', JSON.stringify(body));

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Email is required and must be a string',
          hint: 'Make sure to send "email" field or configure field mapping for your email field name'
        }),
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
        first_page_name: body.page_name || null,
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
        usage_count: (webhookKey.usage_count || 0) + 1,
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
