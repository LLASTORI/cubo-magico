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
  'first_name': 'first_name',
  'firstname': 'first_name',
  'primeiro_nome': 'first_name',
  'last_name': 'last_name',
  'lastname': 'last_name',
  'sobrenome': 'last_name',
  'surname': 'last_name',
  'segundo_nome': 'last_name',
  
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
  'ddd': 'phone_ddd',
  'area_code': 'phone_ddd',
  'country_code': 'phone_country_code',
  'codigo_pais': 'phone_country_code',
  'ddi': 'phone_country_code',
  
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
  'numero': 'address_number',
  'number': 'address_number',
  'num': 'address_number',
  'complemento': 'address_complement',
  'complement': 'address_complement',
  'apto': 'address_complement',
  'apartamento': 'address_complement',
  'bairro': 'neighborhood',
  'district': 'neighborhood',
  'cidade': 'city',
  'municipio': 'city',
  'estado': 'state',
  'uf': 'state',
  'province': 'state',
  'pais': 'country',
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
  
  // UTM variations (with and without underscore)
  'utm_source': 'utm_source',
  'utmsource': 'utm_source',
  'source': 'utm_source',
  'origem': 'utm_source',
  'utm_campaign': 'utm_campaign',
  'utmcampaign': 'utm_campaign',
  'campaign': 'utm_campaign',
  'campanha': 'utm_campaign',
  'utm_medium': 'utm_medium',
  'utmmedium': 'utm_medium',
  'medium': 'utm_medium',
  'midia': 'utm_medium',
  'utm_content': 'utm_content',
  'utmcontent': 'utm_content',
  'content': 'utm_content',
  'conteudo': 'utm_content',
  'utm_term': 'utm_term',
  'utmterm': 'utm_term',
  'term': 'utm_term',
  'termo': 'utm_term',
  'adset': 'utm_adset',
  'conjunto': 'utm_adset',
  'ad': 'utm_ad',
  'anuncio': 'utm_ad',
  'creative': 'utm_creative',
  'criativo': 'utm_creative',
  'placement': 'utm_placement',
  
  // SCK variations (Hotmart format)
  'sck': 'utm_source', // Hotmart uses sck as source
  'sck_source': 'utm_source',
  'sck_src': 'utm_source',
  'src': 'utm_source',
  'sck_campaign': 'utm_campaign',
  'sck_campaign_id': 'utm_campaign',
  'sck_medium': 'utm_medium',
  'sck_content': 'utm_content',
  'sck_term': 'utm_term',
  'sck_adset': 'utm_adset',
  'sck_adset_name': 'utm_adset',
  'sck_ad': 'utm_ad',
  'sck_creative': 'utm_creative',
  'sck_placement': 'utm_placement',
  
  // Page name variations
  'pagina': 'page_name',
  'page': 'page_name',
  'landing_page': 'page_name',
  'lp': 'page_name',
  'form_name': 'page_name',
  'formulario': 'page_name',
  'page_url': 'page_url',
  'url': 'page_url',
  
  // Launch tag variations
  'launch_tag': 'launch_tag',
  'tag_lancamento': 'launch_tag',
  'lancamento': 'launch_tag',
  
  // Interaction type variations
  'interaction_type': 'interaction_type',
  'tipo_interacao': 'interaction_type',
  'event_type': 'interaction_type',
  'tipo_evento': 'interaction_type',
  
  // Custom fields variations
  'extras': 'custom_fields',
  'dados_extras': 'custom_fields',
  'metadata': 'custom_fields',
};

// Standard fields that we accept
const STANDARD_FIELDS = [
  'email', 'name', 'first_name', 'last_name', 'phone', 'phone_ddd', 'phone_country_code', 'document', 'instagram',
  'address', 'address_number', 'address_complement', 'neighborhood',
  'city', 'state', 'country', 'cep', 'tags', 'custom_fields',
  'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term',
  'utm_adset', 'utm_ad', 'utm_creative', 'utm_placement',
  'page_name', 'page_url', 'launch_tag', 'interaction_type'
];

interface NormalizedPayload {
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  phone_ddd?: string;
  phone_country_code?: string;
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
  utm_adset?: string;
  utm_ad?: string;
  utm_creative?: string;
  utm_placement?: string;
  page_name?: string;
  page_url?: string;
  launch_tag?: string;
  interaction_type?: string;
}

// Helper function to get phone country code from country name
function getCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    'brasil': '55', 'brazil': '55', 'br': '55',
    'portugal': '351', 'pt': '351',
    'united states': '1', 'usa': '1', 'us': '1', 'estados unidos': '1',
    'spain': '34', 'españa': '34', 'es': '34', 'espanha': '34',
    'argentina': '54', 'ar': '54',
    'mexico': '52', 'méxico': '52', 'mx': '52',
    'chile': '56', 'cl': '56',
    'colombia': '57', 'co': '57',
    'peru': '51', 'perú': '51', 'pe': '51',
    'uruguay': '598', 'uy': '598',
    'paraguay': '595', 'py': '595',
    'bolivia': '591', 'bo': '591',
    'ecuador': '593', 'ec': '593',
    'venezuela': '58', 've': '58',
    'united kingdom': '44', 'uk': '44', 'gb': '44',
    'germany': '49', 'de': '49', 'alemania': '49', 'alemanha': '49',
    'france': '33', 'fr': '33', 'francia': '33', 'frança': '33',
    'italy': '39', 'it': '39', 'italia': '39', 'itália': '39',
  };
  return countryMap[country.toLowerCase().trim()] || '55';
}

// Extract Meta IDs from UTM fields (same logic as hotmart-api)
function extractMetaIds(payload: NormalizedPayload): { campaignId: string | null; adsetId: string | null; adId: string | null } {
  let campaignId: string | null = null;
  let adsetId: string | null = null;
  let adId: string | null = null;

  // Try to extract from utm_campaign (often contains campaign ID)
  if (payload.utm_campaign) {
    // Pattern: could be just the ID or "campaignname_123456789"
    const campaignMatch = payload.utm_campaign.match(/(\d{10,})/);
    if (campaignMatch) {
      campaignId = campaignMatch[1];
    }
  }

  // Try to extract from utm_adset (may contain adset ID)
  if (payload.utm_adset) {
    const adsetMatch = payload.utm_adset.match(/(\d{10,})/);
    if (adsetMatch) {
      adsetId = adsetMatch[1];
    }
  }

  // Try to extract from utm_ad (may contain ad ID)
  if (payload.utm_ad) {
    const adMatch = payload.utm_ad.match(/(\d{10,})/);
    if (adMatch) {
      adId = adMatch[1];
    }
  }

  // Try to extract from utm_content (often contains ad ID or creative ID)
  if (!adId && payload.utm_content) {
    const adMatch = payload.utm_content.match(/(\d{10,})/);
    if (adMatch) {
      adId = adMatch[1];
    }
  }

  // Try to extract from utm_creative (often contains creative/ad ID)
  if (!adId && payload.utm_creative) {
    const creativeMatch = payload.utm_creative.match(/(\d{10,})/);
    if (creativeMatch) {
      adId = creativeMatch[1];
    }
  }

  // For SCK format: source_sck often has multiple IDs separated by special characters
  // Pattern like: "fb|123456789012345|234567890123456|345678901234567"
  if (payload.utm_source && payload.utm_source.includes('|')) {
    const sckParts = payload.utm_source.split('|');
    const numericIds = sckParts.filter(p => /^\d{10,}$/.test(p));
    
    if (numericIds.length >= 1 && !campaignId) campaignId = numericIds[0];
    if (numericIds.length >= 2 && !adsetId) adsetId = numericIds[1];
    if (numericIds.length >= 3 && !adId) adId = numericIds[2];
  }

  return { campaignId, adsetId, adId };
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

  // Join first_name + last_name into name if name is not already set
  if (!normalized.name && (normalized.first_name || normalized.last_name)) {
    const parts = [
      normalized.first_name as string,
      normalized.last_name as string
    ].filter(Boolean);
    normalized.name = parts.join(' ').trim();
    delete normalized.first_name;
    delete normalized.last_name;
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
      .select('id, project_id, default_tags, default_funnel_id, allowed_sources, field_mappings, usage_count')
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

    // Get funnel name if default_funnel_id is set
    let funnelTag: string | null = null;
    if (webhookKey.default_funnel_id) {
      const { data: funnel } = await supabase
        .from('funnels')
        .select('name')
        .eq('id', webhookKey.default_funnel_id)
        .single();
      
      if (funnel?.name) {
        funnelTag = `funil:${funnel.name}`;
        console.log('[CRM Webhook] Adding funnel tag:', funnelTag);
      }
    }

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

    // Merge tags (default + provided + funnel tag)
    const mergedTags = [
      ...(webhookKey.default_tags || []),
      ...(body.tags || []),
      ...(funnelTag ? [funnelTag] : [])
    ].filter((tag, index, arr) => arr.indexOf(tag) === index);

    const email = body.email.toLowerCase().trim();
    const now = new Date().toISOString();

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('crm_contacts')
      .select('id, first_utm_source, tags')
      .eq('project_id', webhookKey.project_id)
      .eq('email', email)
      .single();

    const isNewContact = !existingContact;

    // Extract Meta IDs from UTM data
    const { campaignId, adsetId, adId } = extractMetaIds(body);
    console.log('[CRM Webhook] Extracted Meta IDs:', { campaignId, adsetId, adId });

    let contact;

    if (isNewContact) {
      // For new contacts, insert with all data
      const insertData = {
        project_id: webhookKey.project_id,
        email,
        name: body.name || null,
        phone: body.phone || null,
        phone_ddd: body.phone_ddd || null,
        phone_country_code: body.phone_country_code || (body.country ? getCountryCode(body.country) : '55'),
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
        custom_fields: body.custom_fields || {},
        source: 'webhook',
        status: 'lead',
        tags: mergedTags.length > 0 ? mergedTags : null,
        first_utm_source: body.utm_source || null,
        first_utm_campaign: body.utm_campaign || null,
        first_utm_medium: body.utm_medium || null,
        first_utm_content: body.utm_content || null,
        first_utm_term: body.utm_term || null,
        first_utm_adset: body.utm_adset || null,
        first_utm_ad: body.utm_ad || null,
        first_utm_creative: body.utm_creative || null,
        first_utm_placement: body.utm_placement || null,
        first_page_name: body.page_name || null,
        first_meta_campaign_id: campaignId,
        first_meta_adset_id: adsetId,
        first_meta_ad_id: adId,
        first_seen_at: now,
        last_activity_at: now,
      };

      const { data: insertedContact, error: insertError } = await supabase
        .from('crm_contacts')
        .insert(insertData)
        .select('id, email, name, status, tags, created_at')
        .single();

      if (insertError) {
        console.error('[CRM Webhook] Error inserting contact:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save contact', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      contact = insertedContact;
    } else {
      // For existing contacts, use COALESCE logic to preserve existing data
      // Only update fields if new value is provided (not null/undefined/empty)
      const updateFields: Record<string, unknown> = {
        last_activity_at: now,
      };

      // Only update if new value is provided and not empty
      if (body.name) updateFields.name = body.name;
      if (body.phone) updateFields.phone = body.phone;
      if (body.phone_ddd) updateFields.phone_ddd = body.phone_ddd;
      if (body.phone_country_code || body.country) {
        updateFields.phone_country_code = body.phone_country_code || getCountryCode(body.country!);
      }
      if (body.document) updateFields.document = body.document;
      if (body.instagram) updateFields.instagram = body.instagram;
      if (body.address) updateFields.address = body.address;
      if (body.address_number) updateFields.address_number = body.address_number;
      if (body.address_complement) updateFields.address_complement = body.address_complement;
      if (body.neighborhood) updateFields.neighborhood = body.neighborhood;
      if (body.city) updateFields.city = body.city;
      if (body.state) updateFields.state = body.state;
      if (body.country) updateFields.country = body.country;
      if (body.cep) updateFields.cep = body.cep;

      // Merge custom fields with existing
      if (body.custom_fields && Object.keys(body.custom_fields).length > 0) {
        const { data: currentContact } = await supabase
          .from('crm_contacts')
          .select('custom_fields')
          .eq('id', existingContact.id)
          .single();
        
        updateFields.custom_fields = {
          ...(currentContact?.custom_fields as Record<string, unknown> || {}),
          ...body.custom_fields
        };
      }

      // Merge tags (don't replace, add new ones)
      const existingTags = existingContact.tags || [];
      const allTags = [...existingTags, ...mergedTags]
        .filter((tag, index, arr) => arr.indexOf(tag) === index);
      if (allTags.length > 0) {
        updateFields.tags = allTags;
      }

      const { data: updatedContact, error: updateError } = await supabase
        .from('crm_contacts')
        .update(updateFields)
        .eq('id', existingContact.id)
        .select('id, email, name, status, tags, created_at')
        .single();

      if (updateError) {
        console.error('[CRM Webhook] Error updating contact:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update contact', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      contact = updatedContact;
    }

    // Always create an interaction record if we have UTM data
    const hasUtmData = body.utm_source || body.utm_campaign || body.utm_medium || 
                       body.utm_adset || body.utm_ad || body.utm_creative;
    const hasInteractionData = body.page_name || body.page_url || body.launch_tag || body.interaction_type;
    
    if (hasUtmData || hasInteractionData) {
      const interactionData = {
        contact_id: contact.id,
        project_id: webhookKey.project_id,
        interaction_type: body.interaction_type || 'page_view',
        page_name: body.page_name || null,
        page_url: body.page_url || null,
        utm_source: body.utm_source || null,
        utm_campaign: body.utm_campaign || null,
        utm_medium: body.utm_medium || null,
        utm_content: body.utm_content || null,
        utm_term: body.utm_term || null,
        utm_adset: body.utm_adset || null,
        utm_ad: body.utm_ad || null,
        utm_creative: body.utm_creative || null,
        utm_placement: body.utm_placement || null,
        launch_tag: body.launch_tag || null,
        meta_campaign_id: campaignId,
        meta_adset_id: adsetId,
        meta_ad_id: adId,
        metadata: body.custom_fields || {},
        interacted_at: now,
      };

      const { error: interactionError } = await supabase
        .from('crm_contact_interactions')
        .insert(interactionData);

      if (interactionError) {
        console.error('[CRM Webhook] Error creating interaction:', interactionError);
        // Don't fail the request, just log the error
      } else {
        console.log('[CRM Webhook] Interaction created for contact:', contact.id);
      }
    }

    // Update webhook key usage stats
    await supabase
      .from('crm_webhook_keys')
      .update({
        last_used_at: now,
        usage_count: (webhookKey.usage_count || 0) + 1,
      })
      .eq('id', webhookKey.id);

    console.log('[CRM Webhook] Contact saved:', contact.id, isNewContact ? '(new)' : '(updated)');

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
          is_new: isNewContact,
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
