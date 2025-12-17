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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get hottok from header for validation
    const hottok = req.headers.get('x-hotmart-hottok');
    
    // Parse the webhook payload
    const payload: HotmartWebhookPayload = await req.json();
    
    console.log('=== HOTMART WEBHOOK RECEIVED ===');
    console.log('Event:', payload.event);
    console.log('Transaction:', payload.data?.purchase?.transaction);
    console.log('Hottok present:', !!hottok);
    
    // Log buyer phone data for debugging
    if (payload.data?.buyer) {
      console.log('=== BUYER PHONE DATA ===');
      console.log('checkout_phone:', payload.data.buyer.checkout_phone);
      console.log('checkout_phone_code:', payload.data.buyer.checkout_phone_code);
      console.log('Full buyer object:', JSON.stringify(payload.data.buyer, null, 2));
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract data from payload
    const { data, event } = payload;
    const buyer = data?.buyer;
    const purchase = data?.purchase;
    const product = data?.product;
    const affiliates = data?.affiliates;
    const subscription = data?.subscription;
    
    // Skip if no transaction
    if (!purchase?.transaction) {
      console.log('No transaction ID, skipping');
      return new Response(JSON.stringify({ success: true, message: 'No transaction to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Map event to status
    const statusMap: Record<string, string> = {
      'PURCHASE_APPROVED': 'APPROVED',
      'PURCHASE_COMPLETE': 'COMPLETE',
      'PURCHASE_CANCELED': 'CANCELLED',
      'PURCHASE_BILLET_PRINTED': 'PRINTED_BILLET',
      'PURCHASE_PROTEST': 'PROTESTED',
      'PURCHASE_REFUNDED': 'REFUNDED',
      'PURCHASE_CHARGEBACK': 'CHARGEBACK',
      'PURCHASE_EXPIRED': 'EXPIRED',
      'PURCHASE_DELAYED': 'DELAYED',
    };
    
    const status = statusMap[event] || purchase?.status || 'UNKNOWN';
    
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
        // Try to parse the full number
        const cleanPhone = fullPhone.replace(/\D/g, '');
        
        // Check for common country codes
        if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
          // Brazil: 55 + DDD(2) + number(8-9)
          buyerPhoneCountryCode = '55';
          buyerPhoneDDD = cleanPhone.substring(2, 4);
          buyerPhone = cleanPhone.substring(4);
        } else if (cleanPhone.startsWith('1') && cleanPhone.length >= 11) {
          // USA/Canada: 1 + area(3) + number(7)
          buyerPhoneCountryCode = '1';
          buyerPhoneDDD = cleanPhone.substring(1, 4);
          buyerPhone = cleanPhone.substring(4);
        } else if (cleanPhone.startsWith('351') && cleanPhone.length >= 12) {
          // Portugal: 351 + number(9)
          buyerPhoneCountryCode = '351';
          buyerPhone = cleanPhone.substring(3);
        } else {
          // Generic: store the full number as phone
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
      
      // Parse Meta Ads data from sck (format: Meta-Ads|ADSET_ID|CAMPAIGN_ID|PLACEMENT|AD_ID)
      if (sck.includes('Meta-Ads') || sck.includes('|')) {
        const parts = sck.split('|');
        if (parts.length >= 2) {
          // Extract IDs that look like Meta Ads IDs (numeric strings)
          for (const part of parts) {
            const cleanPart = part.trim();
            if (/^\d{10,}$/.test(cleanPart)) {
              // Long numeric ID - could be campaign, adset, or ad
              if (!metaAdIdExtracted) metaAdIdExtracted = cleanPart;
              else if (!metaAdsetIdExtracted) metaAdsetIdExtracted = cleanPart;
              else if (!metaCampaignIdExtracted) metaCampaignIdExtracted = cleanPart;
            }
          }
        }
      }
    }
    
    // Find project by hottok or by matching credentials
    // For now, we'll need to find projects that have Hotmart configured
    const { data: projects, error: projectsError } = await supabase
      .from('project_credentials')
      .select('project_id')
      .eq('provider', 'hotmart')
      .eq('is_validated', true);
    
    if (projectsError || !projects?.length) {
      console.error('No validated Hotmart projects found:', projectsError);
      return new Response(JSON.stringify({ success: false, error: 'No project configured' }), {
        status: 200, // Return 200 to prevent Hotmart retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found ${projects.length} Hotmart-configured projects`);
    
    // Process for each project (in a multi-tenant scenario)
    // For now, we'll try to find existing sale or insert to all configured projects
    let processedCount = 0;
    
    for (const proj of projects) {
      const projectId = proj.project_id;
      
      // Check if transaction already exists for this project
      const { data: existingSale } = await supabase
        .from('hotmart_sales')
        .select('id')
        .eq('project_id', projectId)
        .eq('transaction_id', purchase.transaction)
        .single();
      
      const saleDate = purchase?.order_date 
        ? new Date(purchase.order_date).toISOString()
        : new Date(payload.creation_date).toISOString();
      
      const confirmationDate = purchase?.approved_date
        ? new Date(purchase.approved_date).toISOString()
        : null;
      
      const affiliate = affiliates?.[0];
      
      const saleData = {
        project_id: projectId,
        transaction_id: purchase.transaction,
        product_code: product?.id?.toString() || null,
        product_name: product?.name || 'Unknown Product',
        offer_code: purchase?.offer?.code || null,
        product_price: purchase?.original_offer_price?.value || null,
        offer_price: purchase?.price?.value || null,
        total_price: purchase?.price?.value || null,
        total_price_brl: purchase?.full_price?.value || null,
        status,
        sale_date: saleDate,
        confirmation_date: confirmationDate,
        payment_method: purchase?.payment?.type || null,
        payment_type: purchase?.payment?.type || null,
        installment_number: purchase?.payment?.installments_number || 1,
        coupon: purchase?.offer?.coupon_code || null,
        recurrence: purchase?.recurrence_number || null,
        subscriber_code: subscription?.subscriber?.code || null,
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
      };
      
      if (existingSale) {
        // Update existing sale
        const { error: updateError } = await supabase
          .from('hotmart_sales')
          .update({
            ...saleData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSale.id);
        
        if (updateError) {
          console.error(`Error updating sale for project ${projectId}:`, updateError);
        } else {
          console.log(`Updated sale ${purchase.transaction} for project ${projectId}`);
          processedCount++;
        }
      } else {
        // Insert new sale
        const { error: insertError } = await supabase
          .from('hotmart_sales')
          .insert(saleData);
        
        if (insertError) {
          console.error(`Error inserting sale for project ${projectId}:`, insertError);
        } else {
          console.log(`Inserted sale ${purchase.transaction} for project ${projectId}`);
          processedCount++;
        }
      }
    }
    
    console.log(`=== WEBHOOK PROCESSED: ${processedCount} projects ===`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${processedCount} projects`,
      transaction: purchase.transaction,
      event,
      phone_captured: !!buyerPhone,
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
