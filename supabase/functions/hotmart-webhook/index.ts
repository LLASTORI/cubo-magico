import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hotmart-hottok',
};

interface HotmartWebhookPayload {
  id: string;
  creation_date: number;
  event: string;
  version: string;
  data: {
    product?: {
      id?: number;
      ucode?: string;
      name?: string;
      has_co_production?: boolean;
    };
    affiliates?: Array<{
      affiliate_code?: string;
      name?: string;
    }>;
    buyer?: {
      email?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      checkout_phone?: string;
      checkout_phone_code?: string;
      document?: string;
      document_type?: string;
      address?: {
        country?: string;
        country_iso?: string;
        state?: string;
        city?: string;
        neighborhood?: string;
        zipcode?: string;
        street?: string;
        number?: string;
        complement?: string;
      };
    };
    producer?: {
      name?: string;
      document?: string;
      legal_nature?: string;
    };
    commissions?: Array<{
      value?: number;
      currency_value?: string;
      source?: string;
    }>;
    purchase?: {
      approved_date?: number;
      full_price?: {
        value?: number;
        currency_value?: string;
      };
      original_offer_price?: {
        value?: number;
        currency_value?: string;
      };
      price?: {
        value?: number;
        currency_value?: string;
      };
      offer?: {
        code?: string;
        coupon_code?: string;
        name?: string;
        description?: string;
      };
      origin?: {
        src?: string;
        sck?: string;
        xcod?: string;
      };
      checkout_country?: {
        name?: string;
        iso?: string;
      };
      order_bump?: {
        is_order_bump?: boolean;
        parent_purchase_transaction?: string;
      };
      order_date?: string;
      status?: string;
      transaction?: string;
      payment?: {
        type?: string;
        installments_number?: number;
        refusal_reason?: string;
        billet_barcode?: string;
        billet_url?: string;
        pix_code?: string;
        pix_qrcode?: string;
        pix_expiration_date?: number;
      };
      recurrence_number?: number;
    };
    subscription?: {
      status?: string;
      plan?: {
        id?: number;
        name?: string;
      };
      subscriber?: {
        code?: string;
      };
    };
  };
}

// Map all Hotmart events to internal status
const eventStatusMap: Record<string, string> = {
  'PURCHASE_APPROVED': 'APPROVED',
  'PURCHASE_COMPLETE': 'COMPLETE',
  'PURCHASE_CANCELED': 'CANCELLED',
  'PURCHASE_BILLET_PRINTED': 'PRINTED_BILLET',
  'PURCHASE_PROTEST': 'PROTESTED',
  'PURCHASE_REFUNDED': 'REFUNDED',
  'PURCHASE_CHARGEBACK': 'CHARGEBACK',
  'PURCHASE_EXPIRED': 'EXPIRED',
  'PURCHASE_DELAYED': 'DELAYED',
  'PURCHASE_OUT_OF_SHOPPING_CART': 'ABANDONED',
  'PURCHASE_RECURRENCE_CANCELLATION': 'SUBSCRIPTION_CANCELLED',
  'SWITCH_PLAN': 'PLAN_CHANGED',
  'UPDATE_SUBSCRIPTION_CHARGE_DATE': 'CHARGE_DATE_UPDATED',
  'CLUB_FIRST_ACCESS': 'FIRST_ACCESS',
  'CLUB_MODULE_COMPLETED': 'MODULE_COMPLETED',
};

// Events that should create/update sales records
const saleEvents = [
  'PURCHASE_APPROVED',
  'PURCHASE_COMPLETE',
  'PURCHASE_CANCELED',
  'PURCHASE_BILLET_PRINTED',
  'PURCHASE_PROTEST',
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_EXPIRED',
  'PURCHASE_DELAYED',
  'PURCHASE_OUT_OF_SHOPPING_CART',
  'PURCHASE_RECURRENCE_CANCELLATION',
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract project_id from URL path: /hotmart-webhook/:project_id
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // The project_id should be the last part of the path
    // URL format: /hotmart-webhook/PROJECT_ID
    let projectId: string | null = null;
    
    if (pathParts.length >= 2) {
      projectId = pathParts[pathParts.length - 1];
    }
    
    // Validate project_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!projectId || !uuidRegex.test(projectId)) {
      console.error('Invalid or missing project_id in URL:', url.pathname);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid webhook URL. Project ID is required.',
        hint: 'URL format should be: /hotmart-webhook/YOUR_PROJECT_ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get hottok from header for additional validation (optional)
    const hottok = req.headers.get('x-hotmart-hottok');
    
    // Parse the webhook payload
    const payload: HotmartWebhookPayload = await req.json();
    
    console.log('=== HOTMART WEBHOOK RECEIVED ===');
    console.log('Project ID:', projectId);
    console.log('Event:', payload.event);
    console.log('Transaction:', payload.data?.purchase?.transaction);
    console.log('Hottok present:', !!hottok);
    console.log('Webhook version:', payload.version);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate project exists and has Hotmart configured
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      console.error('Project not found:', projectId);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Project not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Project validated:', project.name);
    
    // Update last webhook received timestamp in project_credentials
    await supabase
      .from('project_credentials')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');
    
    // Extract data from payload
    const { data, event } = payload;
    const buyer = data?.buyer;
    const purchase = data?.purchase;
    const product = data?.product;
    const affiliates = data?.affiliates;
    const subscription = data?.subscription;
    
    // Log buyer phone data for debugging
    if (buyer) {
      console.log('=== BUYER DATA ===');
      console.log('Email:', buyer.email);
      console.log('Name:', buyer.name);
      console.log('checkout_phone:', buyer.checkout_phone);
      console.log('checkout_phone_code:', buyer.checkout_phone_code);
    }
    
    // Get status from event
    const status = eventStatusMap[event] || purchase?.status || 'UNKNOWN';
    
    // Check if this is a sale event that should be recorded
    if (!saleEvents.includes(event)) {
      console.log(`Event ${event} is not a sale event, skipping sale record creation`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Event ${event} received but not a sale event`,
        project: project.name
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // For abandoned carts, we might not have a transaction ID
    const transactionId = purchase?.transaction || `abandoned_${payload.id}`;
    
    // Parse phone data from webhook
    let buyerPhone: string | null = null;
    let buyerPhoneDDD: string | null = null;
    let buyerPhoneCountryCode: string | null = null;
    
    if (buyer?.checkout_phone) {
      const fullPhone = buyer.checkout_phone;
      const ddd = buyer.checkout_phone_code;
      
      console.log('Processing phone:', { fullPhone, ddd });
      
      if (ddd) {
        // Brazilian buyer: checkout_phone_code has DDD, checkout_phone has the number
        buyerPhoneDDD = ddd;
        buyerPhone = fullPhone;
        buyerPhoneCountryCode = '55'; // Brazil
      } else {
        // International buyer: checkout_phone includes area code
        const cleanPhone = fullPhone.replace(/\D/g, '');
        
        // Check for common country codes
        if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
          buyerPhoneCountryCode = '55';
          buyerPhoneDDD = cleanPhone.substring(2, 4);
          buyerPhone = cleanPhone.substring(4);
        } else if (cleanPhone.startsWith('1') && cleanPhone.length >= 11) {
          buyerPhoneCountryCode = '1';
          buyerPhoneDDD = cleanPhone.substring(1, 4);
          buyerPhone = cleanPhone.substring(4);
        } else if (cleanPhone.startsWith('351') && cleanPhone.length >= 12) {
          buyerPhoneCountryCode = '351';
          buyerPhone = cleanPhone.substring(3);
        } else {
          buyerPhone = cleanPhone;
          
          // Try to detect country from checkout_country
          const countryIso = data?.purchase?.checkout_country?.iso;
          if (countryIso === 'BR') {
            buyerPhoneCountryCode = '55';
            if (cleanPhone.length >= 10) {
              buyerPhoneDDD = cleanPhone.substring(0, 2);
              buyerPhone = cleanPhone.substring(2);
            }
          } else if (countryIso === 'PT') {
            buyerPhoneCountryCode = '351';
          } else if (countryIso === 'US' || countryIso === 'CA') {
            buyerPhoneCountryCode = '1';
          } else if (countryIso === 'ES') {
            buyerPhoneCountryCode = '34';
          } else if (countryIso === 'AR') {
            buyerPhoneCountryCode = '54';
          } else if (countryIso === 'MX') {
            buyerPhoneCountryCode = '52';
          }
        }
      }
      
      console.log('Parsed phone:', { buyerPhoneCountryCode, buyerPhoneDDD, buyerPhone });
    }
    
    // Parse origin/UTM from sck field
    let checkoutOrigin: string | null = null;
    let utmSource: string | null = null;
    let utmCampaignId: string | null = null;
    let utmAdsetName: string | null = null;
    let utmCreative: string | null = null;
    let utmPlacement: string | null = null;
    let metaCampaignIdExtracted: string | null = null;
    let metaAdsetIdExtracted: string | null = null;
    let metaAdIdExtracted: string | null = null;
    
    const sck = purchase?.origin?.sck;
    if (sck) {
      checkoutOrigin = sck;
      
      // Parse Meta Ads data from sck
      if (sck.includes('Meta-Ads') || sck.includes('|')) {
        const parts = sck.split('|');
        if (parts.length >= 2) {
          for (const part of parts) {
            const cleanPart = part.trim();
            if (/^\d{10,}$/.test(cleanPart)) {
              if (!metaAdIdExtracted) metaAdIdExtracted = cleanPart;
              else if (!metaAdsetIdExtracted) metaAdsetIdExtracted = cleanPart;
              else if (!metaCampaignIdExtracted) metaCampaignIdExtracted = cleanPart;
            }
          }
        }
      }
    }
    
    // Prepare sale data
    const saleDate = purchase?.order_date 
      ? new Date(purchase.order_date).toISOString()
      : new Date(payload.creation_date).toISOString();
    
    const confirmationDate = purchase?.approved_date
      ? new Date(purchase.approved_date).toISOString()
      : null;
    
    const affiliate = affiliates?.[0];
    const commissions = data?.commissions;
    
    // Get currency from price object (matches API structure)
    const currencyCode = purchase?.price?.currency_value || purchase?.full_price?.currency_value || 'BRL';
    const totalPrice = purchase?.price?.value || null;
    
    // Exchange rates for BRL conversion (same as API)
    const exchangeRates: Record<string, number> = {
      'BRL': 1,
      'USD': 5.50,
      'EUR': 6.00,
      'GBP': 7.00,
      'PYG': 0.00075,
      'UYU': 0.14,
      'AUD': 3.60,
      'CHF': 6.20,
      'CAD': 4.00,
      'MXN': 0.28,
      'ARS': 0.005,
      'CLP': 0.006,
      'COP': 0.0013,
      'PEN': 1.45,
      'JPY': 0.037,
    };
    
    // Calculate total_price_brl with proper conversion (matching API logic)
    let totalPriceBrl: number | null = null;
    let exchangeRateUsed: number | null = null;
    
    if (totalPrice !== null) {
      if (currencyCode === 'BRL') {
        // For BRL, use full_price if available (includes fees), otherwise use price
        totalPriceBrl = purchase?.full_price?.value || totalPrice;
      } else {
        // For other currencies, convert to BRL
        const rate = exchangeRates[currencyCode] || 1;
        totalPriceBrl = totalPrice * rate;
        exchangeRateUsed = rate;
        console.log(`Currency conversion: ${totalPrice} ${currencyCode} -> ${totalPriceBrl} BRL (rate: ${rate})`);
      }
    }
    
    // Get net_revenue from commissions (matching API logic)
    const netRevenue = commissions?.[0]?.value || null;
    
    const saleData = {
      project_id: projectId,
      transaction_id: transactionId,
      product_code: product?.id?.toString() || null,
      product_name: product?.name || 'Unknown Product',
      offer_code: purchase?.offer?.code || null,
      product_price: purchase?.original_offer_price?.value || null,
      offer_price: purchase?.price?.value || null,
      offer_currency: currencyCode,
      total_price: totalPrice,
      total_price_brl: totalPriceBrl,
      exchange_rate_used: exchangeRateUsed,
      net_revenue: netRevenue,
      status,
      sale_date: saleDate,
      confirmation_date: confirmationDate,
      payment_method: purchase?.payment?.type || null,
      payment_type: purchase?.payment?.type || null,
      installment_number: purchase?.payment?.installments_number || 1,
      coupon: purchase?.offer?.coupon_code || null,
      recurrence: purchase?.recurrence_number || null,
      subscriber_code: subscription?.subscriber?.code || null,
      // Sale category based on event
      sale_category: event === 'PURCHASE_OUT_OF_SHOPPING_CART' ? 'abandoned_cart' : 'purchase',
      // Buyer data
      buyer_name: buyer?.name || null,
      buyer_email: buyer?.email || null,
      buyer_phone: buyerPhone,
      buyer_phone_ddd: buyerPhoneDDD,
      buyer_phone_country_code: buyerPhoneCountryCode,
      buyer_document: buyer?.document || null,
      buyer_address: buyer?.address?.street || null,
      buyer_address_number: buyer?.address?.number || null,
      buyer_address_complement: buyer?.address?.complement || null,
      buyer_neighborhood: buyer?.address?.neighborhood || null,
      buyer_city: buyer?.address?.city || null,
      buyer_state: buyer?.address?.state || null,
      buyer_country: buyer?.address?.country || purchase?.checkout_country?.name || null,
      buyer_cep: buyer?.address?.zipcode || null,
      // Affiliate
      affiliate_code: affiliate?.affiliate_code || null,
      affiliate_name: affiliate?.name || null,
      // UTM/Origin
      checkout_origin: checkoutOrigin,
      utm_source: utmSource,
      utm_campaign_id: utmCampaignId,
      utm_adset_name: utmAdsetName,
      utm_creative: utmCreative,
      utm_placement: utmPlacement,
      meta_campaign_id_extracted: metaCampaignIdExtracted,
      meta_adset_id_extracted: metaAdsetIdExtracted,
      meta_ad_id_extracted: metaAdIdExtracted,
      // Metadata
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Use atomic UPSERT to prevent race conditions with concurrent webhooks
    // This handles duplicates gracefully without SELECT + INSERT/UPDATE pattern
    const { data: upsertResult, error: upsertError } = await supabase
      .from('hotmart_sales')
      .upsert(saleData, {
        onConflict: 'project_id,transaction_id',
        ignoreDuplicates: false, // Update on conflict
      })
      .select('id')
      .single();
    
    if (upsertError) {
      // Handle unique constraint violation gracefully (concurrent request)
      if (upsertError.code === '23505') {
        console.log(`Duplicate webhook for transaction ${transactionId}, ignoring`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Duplicate event, already processed',
          transaction: transactionId,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('Error upserting sale:', upsertError);
      throw upsertError;
    }
    
    const operation = upsertResult ? 'upserted' : 'processed';
    console.log(`${operation} sale ${transactionId}`);
    
    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===');
    console.log('Project:', project.name);
    console.log('Event:', event);
    console.log('Status:', status);
    console.log('Operation:', operation);
    console.log('Phone captured:', !!buyerPhone);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Sale ${operation} for project ${project.name}`,
      transaction: transactionId,
      event,
      status,
      phone_captured: !!buyerPhone,
      is_abandoned_cart: event === 'PURCHASE_OUT_OF_SHOPPING_CART',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 200, // Return 200 to prevent Hotmart retries
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
