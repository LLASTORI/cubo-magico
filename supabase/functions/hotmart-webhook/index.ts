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
    
    // Get currency from price object - check both currency_value (webhook) and currency_code (API) for compatibility
    const currencyCode = purchase?.price?.currency_value || (purchase?.price as any)?.currency_code || 
                         purchase?.full_price?.currency_value || (purchase?.full_price as any)?.currency_code || 'BRL';
    const totalPrice = purchase?.price?.value || null;
    console.log(`Currency detected: ${currencyCode}, Total price: ${totalPrice}`);
    
    // STANDARDIZED exchange rates - MUST match API rates exactly
    // Using fixed rates to ensure consistency between webhook and API
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
      'BOB': 0.79,
      'VES': 0.15,
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
    
    // Check if sale already exists and INSERT or UPDATE accordingly
    console.log('=== PROCESSING SALE ===');
    console.log('Transaction ID:', transactionId);
    console.log('Project ID:', projectId);
    console.log('Status:', status);
    console.log('Email:', buyer?.email);
    
    // First check if the sale already exists
    const { data: existingSale, error: checkError } = await supabase
      .from('hotmart_sales')
      .select('id')
      .eq('project_id', projectId)
      .eq('transaction_id', transactionId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing sale:', checkError);
      throw checkError;
    }
    
    let upsertResult: { id: string } | null = null;
    
    if (existingSale) {
      // Update existing sale
      console.log('Updating existing sale:', existingSale.id);
      const { data: updateData, error: updateError } = await supabase
        .from('hotmart_sales')
        .update(saleData)
        .eq('id', existingSale.id)
        .select('id')
        .single();
      
      if (updateError) {
        console.error('Error updating sale:', updateError);
        console.error('Sale data that failed:', JSON.stringify(saleData, null, 2));
        throw updateError;
      }
      upsertResult = updateData;
    } else {
      // Insert new sale
      console.log('Inserting new sale');
      const { data: insertData, error: insertError } = await supabase
        .from('hotmart_sales')
        .insert(saleData)
        .select('id')
        .single();
      
      if (insertError) {
        // Handle unique constraint violation gracefully (concurrent request)
        if (insertError.code === '23505') {
          console.log(`Duplicate webhook for transaction ${transactionId}, ignoring`);
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Duplicate event, already processed',
            transaction: transactionId,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.error('Error inserting sale:', insertError);
        console.error('Sale data that failed:', JSON.stringify(saleData, null, 2));
        throw insertError;
      }
      upsertResult = insertData;
    }
    
    console.log('=== SALE UPSERTED SUCCESSFULLY ===');
    console.log('Sale ID:', upsertResult?.id);
    
    const operation = upsertResult ? 'upserted' : 'processed';
    console.log(`${operation} sale ${transactionId}`);
    
    // =====================================================
    // SUBSCRIPTION MANAGEMENT - Check if product is mapped to a plan
    // This is used for managing Cubo Mágico platform subscriptions
    // =====================================================
    let subscriptionCreated = false;
    let subscriptionAction: string | null = null;
    let newUserCreated = false;
    
    try {
      const productCode = product?.id?.toString();
      const offerCode = purchase?.offer?.code;
      const buyerEmail = buyer?.email;
      
      if (productCode && buyerEmail) {
        console.log('=== CHECKING SUBSCRIPTION MAPPING ===');
        console.log('Product code:', productCode);
        console.log('Offer code:', offerCode);
        console.log('Buyer email:', buyerEmail);
        
        // Check if this product is mapped to a plan
        // First try with offer_code, then without
        let planMapping = null;
        
        if (offerCode) {
          const { data: mappingWithOffer } = await supabase
            .from('hotmart_product_plans')
            .select('id, plan_id, plans(id, name, type, max_projects)')
            .eq('product_id', productCode)
            .eq('offer_code', offerCode)
            .eq('is_active', true)
            .single();
          
          planMapping = mappingWithOffer;
        }
        
        // If no mapping with offer_code, try without
        if (!planMapping) {
          const { data: mappingWithoutOffer } = await supabase
            .from('hotmart_product_plans')
            .select('id, plan_id, plans(id, name, type, max_projects)')
            .eq('product_id', productCode)
            .is('offer_code', null)
            .eq('is_active', true)
            .single();
          
          planMapping = mappingWithoutOffer;
        }
        
        if (planMapping) {
          console.log('=== PRODUCT MAPPED TO PLAN ===');
          const planName = (planMapping as any).plans?.name || 'Cubo Mágico';
          const planType = (planMapping as any).plans?.type || 'monthly';
          console.log('Plan:', planName);
          console.log('Plan ID:', planMapping.plan_id);
          
          // Find user by email
          let { data: userProfile } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', buyerEmail.toLowerCase())
            .single();
          
          // If user doesn't exist and this is an approved purchase, create the user
          if (!userProfile && (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE')) {
            console.log('=== CREATING NEW USER ===');
            console.log('Email:', buyerEmail);
            console.log('Name:', buyer?.name);
            
            try {
              // Generate a random secure password (user will reset it via email)
              const randomPassword = crypto.randomUUID() + crypto.randomUUID();
              
              // Create user in auth.users
              const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
                email: buyerEmail.toLowerCase(),
                password: randomPassword,
                email_confirm: true, // Auto-confirm email since they bought
                user_metadata: {
                  full_name: buyer?.name || 'Cliente Hotmart',
                  source: 'hotmart',
                  transaction_id: transactionId
                }
              });
              
              if (createUserError) {
                console.error('Error creating user:', createUserError);
                
                // Check if user already exists in auth but not in profiles
                if (createUserError.message?.includes('already exists') || createUserError.message?.includes('already been registered')) {
                  console.log('User already exists in auth, trying to find profile...');
                  
                  // Try to get user from auth by email
                  const { data: existingUsers } = await supabase.auth.admin.listUsers();
                  const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === buyerEmail.toLowerCase());
                  
                  if (existingUser) {
                    // Check if profile exists
                    const { data: existingProfile } = await supabase
                      .from('profiles')
                      .select('id, email')
                      .eq('id', existingUser.id)
                      .single();
                    
                    if (existingProfile) {
                      userProfile = existingProfile;
                      console.log('Found existing profile:', userProfile.id);
                    } else {
                      // Create profile for existing auth user
                      const { data: createdProfile, error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                          id: existingUser.id,
                          email: buyerEmail.toLowerCase(),
                          full_name: buyer?.name || 'Cliente Hotmart',
                          is_active: true,
                          can_create_projects: true,
                          max_projects: 0
                        })
                        .select('id, email')
                        .single();
                      
                      if (profileError) {
                        console.error('Error creating profile for existing user:', profileError);
                      } else {
                        userProfile = createdProfile;
                        console.log('Created profile for existing auth user:', userProfile?.id);
                      }
                    }
                  }
                }
              } else if (newUser?.user) {
                console.log('User created successfully:', newUser.user.id);
                newUserCreated = true;
                
                // Wait a bit for the trigger to create the profile
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Fetch the profile that should have been created by trigger
                const { data: createdProfile } = await supabase
                  .from('profiles')
                  .select('id, email')
                  .eq('id', newUser.user.id)
                  .single();
                
                if (createdProfile) {
                  userProfile = createdProfile;
                  console.log('Profile found after user creation:', userProfile.id);
                } else {
                  // If trigger didn't create profile, create it manually
                  console.log('Profile not found after trigger, creating manually...');
                  
                  const { data: manualProfile, error: manualProfileError } = await supabase
                    .from('profiles')
                    .insert({
                      id: newUser.user.id,
                      email: buyerEmail.toLowerCase(),
                      full_name: buyer?.name || 'Cliente Hotmart',
                      is_active: true,
                      can_create_projects: true,
                      max_projects: 0
                    })
                    .select('id, email')
                    .single();
                  
                  if (manualProfileError) {
                    console.error('Error creating profile manually:', manualProfileError);
                  } else {
                    userProfile = manualProfile;
                    console.log('Profile created manually:', userProfile?.id);
                  }
                }
                
                // Send welcome email with password reset link
                try {
                  console.log('Sending welcome email...');
                  const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
                    body: {
                      email: buyerEmail.toLowerCase(),
                      name: buyer?.name || 'Cliente',
                      planName: planName,
                      transactionId: transactionId,
                      internalSecret: Deno.env.get('SEND_WELCOME_EMAIL_SECRET')
                    }
                  });
                  
                  if (emailError) {
                    console.error('Error sending welcome email:', emailError);
                  } else {
                    console.log('Welcome email sent successfully');
                  }
                } catch (emailErr) {
                  console.error('Exception sending welcome email:', emailErr);
                }
              }
            } catch (createError) {
              console.error('Exception creating user:', createError);
            }
          }
          
          if (userProfile) {
            console.log('User found/created:', userProfile.id);
            
            // Determine subscription action based on event
            if (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') {
              // Create or activate subscription
              
              // Calculate expiration based on plan type
              const now = new Date();
              let expiresAt: string | null = null;
              
              if (planType === 'monthly') {
                const expireDate = new Date(now);
                expireDate.setMonth(expireDate.getMonth() + 1);
                expiresAt = expireDate.toISOString();
              } else if (planType === 'yearly') {
                const expireDate = new Date(now);
                expireDate.setFullYear(expireDate.getFullYear() + 1);
                expiresAt = expireDate.toISOString();
              } else if (planType === 'lifetime') {
                expiresAt = null; // Never expires
              } else if (planType === 'trial') {
                const expireDate = new Date(now);
                expireDate.setDate(expireDate.getDate() + 7); // 7 day trial
                expiresAt = expireDate.toISOString();
              }
              
              // Check if user already has a subscription
              const { data: existingSubscription } = await supabase
                .from('subscriptions')
                .select('id, plan_id, status, expires_at, notes')
                .eq('user_id', userProfile.id)
                .in('status', ['active', 'trial', 'pending'])
                .single();
              
              if (existingSubscription) {
                // Update existing subscription
                console.log('Updating existing subscription:', existingSubscription.id);
                
                // If upgrading to a different plan, update plan_id
                // If same plan, extend expiration
                let newExpiresAt = expiresAt;
                if (existingSubscription.plan_id === planMapping.plan_id && existingSubscription.expires_at) {
                  // Same plan - extend from current expiration
                  const currentExpires = new Date(existingSubscription.expires_at);
                  if (currentExpires > now) {
                    if (planType === 'monthly') {
                      currentExpires.setMonth(currentExpires.getMonth() + 1);
                    } else if (planType === 'yearly') {
                      currentExpires.setFullYear(currentExpires.getFullYear() + 1);
                    }
                    newExpiresAt = currentExpires.toISOString();
                  }
                }
                
                const { error: updateSubError } = await supabase
                  .from('subscriptions')
                  .update({
                    plan_id: planMapping.plan_id,
                    status: 'active',
                    is_trial: planType === 'trial',
                    expires_at: newExpiresAt,
                    origin: 'hotmart',
                    external_id: transactionId,
                    notes: `Atualizado via Hotmart webhook - ${event}`,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingSubscription.id);
                
                if (updateSubError) {
                  console.error('Error updating subscription:', updateSubError);
                } else {
                  subscriptionCreated = true;
                  subscriptionAction = 'updated';
                  console.log('Subscription updated successfully');

                  // Send welcome email once (avoid spamming on repeated webhooks)
                  const notesText = (existingSubscription as any)?.notes || '';
                  const welcomeMarker = `[welcome_email_sent:${transactionId}]`;
                  const shouldSendWelcomeEmail = !notesText.includes(welcomeMarker);

                  if (shouldSendWelcomeEmail) {
                    try {
                      console.log('Sending welcome email for existing user (updated subscription)...');
                      const welcomePlanName = (planMapping as any).plans?.name || 'Cubo Mágico';
                      const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
                        body: {
                          email: buyerEmail.toLowerCase(),
                          name: buyer?.name || 'Cliente',
                          planName: welcomePlanName,
                          transactionId: transactionId,
                          internalSecret: Deno.env.get('SEND_WELCOME_EMAIL_SECRET')
                        }
                      });

                      if (emailError) {
                        console.error('Error sending welcome email:', emailError);
                      } else {
                        console.log('Welcome email sent successfully (updated subscription)');

                        // Mark as sent to avoid duplicate emails
                        const updatedNotes = `Atualizado via Hotmart webhook - ${event}\n${welcomeMarker}`;
                        const { error: markError } = await supabase
                          .from('subscriptions')
                          .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
                          .eq('id', existingSubscription.id);

                        if (markError) {
                          console.error('Error marking welcome email as sent:', markError);
                        }
                      }
                    } catch (emailErr) {
                      console.error('Exception sending welcome email (updated subscription):', emailErr);
                    }
                  }
                }
              } else {
                // Create new subscription
                console.log('Creating new subscription for user:', userProfile.id);
                
                const { error: createSubError } = await supabase
                  .from('subscriptions')
                  .insert({
                    user_id: userProfile.id,
                    plan_id: planMapping.plan_id,
                    status: planType === 'trial' ? 'trial' : 'active',
                    is_trial: planType === 'trial',
                    starts_at: new Date().toISOString(),
                    expires_at: expiresAt,
                    trial_ends_at: planType === 'trial' ? expiresAt : null,
                    origin: 'hotmart',
                    external_id: transactionId,
                    notes: `Criado via Hotmart webhook - ${event}${newUserCreated ? ' (novo usuário)' : ''}`
                  });
                
                if (createSubError) {
                  console.error('Error creating subscription:', createSubError);
                } else {
                  subscriptionCreated = true;
                  subscriptionAction = newUserCreated ? 'created_with_user' : 'created';
                  console.log('Subscription created successfully');
                  
                  // Send welcome email for new subscription (even for existing users)
                  if (!newUserCreated) {
                    try {
                      console.log('Sending welcome email for existing user with new subscription...');
                      const welcomePlanName = (planMapping as any).plans?.name || 'Cubo Mágico';
                      const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
                        body: {
                          email: buyerEmail.toLowerCase(),
                          name: buyer?.name || 'Cliente',
                          planName: welcomePlanName,
                          transactionId: transactionId,
                          internalSecret: Deno.env.get('SEND_WELCOME_EMAIL_SECRET')
                        }
                      });
                      
                      if (emailError) {
                        console.error('Error sending welcome email:', emailError);
                      } else {
                        console.log('Welcome email sent successfully to existing user');
                      }
                    } catch (emailErr) {
                      console.error('Exception sending welcome email to existing user:', emailErr);
                    }
                  }
                }
              }
            } else if (event === 'PURCHASE_CANCELED' || event === 'PURCHASE_REFUNDED' || event === 'PURCHASE_CHARGEBACK') {
              // Cancel subscription
              console.log('Cancelling subscription due to:', event);
              
              const { error: cancelError } = await supabase
                .from('subscriptions')
                .update({
                  status: 'cancelled',
                  notes: `Cancelado via Hotmart webhook - ${event}`,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userProfile.id)
                .in('status', ['active', 'trial', 'pending']);
              
              if (cancelError) {
                console.error('Error cancelling subscription:', cancelError);
              } else {
                subscriptionCreated = true;
                subscriptionAction = 'cancelled';
                console.log('Subscription cancelled successfully');
              }
            } else if (event === 'PURCHASE_RECURRENCE_CANCELLATION') {
              // Mark subscription as expiring (don't cancel immediately)
              console.log('Subscription recurrence cancelled, will expire at current period end');
              
              const { error: expireError } = await supabase
                .from('subscriptions')
                .update({
                  notes: `Recorrência cancelada via Hotmart - expira em ${new Date().toISOString()}`,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userProfile.id)
                .in('status', ['active', 'trial']);
              
              if (!expireError) {
                subscriptionAction = 'recurrence_cancelled';
              }
            }
          } else {
            console.log('Could not find or create user for email:', buyerEmail);
          }
        } else {
          console.log('No plan mapping found for product:', productCode, 'offer:', offerCode);
        }
      }
    } catch (subscriptionError) {
      // Don't fail the webhook if subscription logic fails
      console.error('[Hotmart Webhook] Error processing subscription:', subscriptionError);
    }
    
    // Trigger automation engine for transaction events
    try {
      // We need to get the contact_id that was created by the sync trigger
      const { data: transaction } = await supabase
        .from('crm_transactions')
        .select('id, contact_id, status, product_name, product_code, offer_code, offer_name, total_price, total_price_brl, payment_method, transaction_date')
        .eq('project_id', projectId)
        .eq('external_id', transactionId)
        .eq('platform', 'hotmart')
        .single();
      
      if (transaction && transaction.contact_id) {
        console.log('[Hotmart Webhook] Triggering automation for transaction:', transaction.id);
        
        const { error: automationError } = await supabase.functions.invoke('automation-engine', {
          body: {
            action: 'trigger_transaction',
            projectId,
            contactId: transaction.contact_id,
            transaction: {
              id: transaction.id,
              status: transaction.status,
              product_name: transaction.product_name,
              product_code: transaction.product_code,
              offer_code: transaction.offer_code,
              offer_name: transaction.offer_name,
              total_price: transaction.total_price,
              total_price_brl: transaction.total_price_brl,
              payment_method: transaction.payment_method,
              transaction_date: transaction.transaction_date,
            }
          }
        });
        
        if (automationError) {
          console.error('[Hotmart Webhook] Automation trigger error:', automationError);
        } else {
          console.log('[Hotmart Webhook] Automation triggered successfully');
        }
      }
    } catch (automationError) {
      // Don't fail the webhook if automation fails
      console.error('[Hotmart Webhook] Error triggering automation:', automationError);
    }
    
    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===');
    console.log('Project:', project.name);
    console.log('Event:', event);
    console.log('Status:', status);
    console.log('Operation:', operation);
    console.log('Phone captured:', !!buyerPhone);
    console.log('Subscription action:', subscriptionAction || 'none');
    console.log('New user created:', newUserCreated);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Sale ${operation} for project ${project.name}`,
      transaction: transactionId,
      event,
      status,
      phone_captured: !!buyerPhone,
      is_abandoned_cart: event === 'PURCHASE_OUT_OF_SHOPPING_CART',
      new_user_created: newUserCreated,
      subscription: subscriptionAction ? {
        action: subscriptionAction,
        created: subscriptionCreated
      } : null
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
