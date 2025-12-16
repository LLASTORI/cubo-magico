import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: { caption?: string; mimetype: string };
      audioMessage?: { mimetype: string };
      videoMessage?: { caption?: string; mimetype: string };
      documentMessage?: { fileName: string; mimetype: string };
      stickerMessage?: { mimetype: string };
    };
    messageType?: string;
    messageTimestamp?: number;
    status?: string;
  };
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client with service role
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let projectId: string | null = null;
  let webhookType = 'whatsapp_message';

  try {
    // Parse webhook payload
    const payload: EvolutionWebhookPayload = await req.json();
    console.log('[WhatsApp Webhook] Received event:', payload.event, 'Instance:', payload.instance);

    // Get instance info to find project
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('id, whatsapp_number_id, whatsapp_numbers!inner(id, project_id)')
      .eq('instance_name', payload.instance)
      .single();

    if (instanceError || !instance) {
      console.log('[WhatsApp Webhook] Instance not found:', payload.instance);
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    projectId = (instance.whatsapp_numbers as any).project_id;
    const whatsappNumberId = instance.whatsapp_number_id;

    if (!projectId) {
      throw new Error('Project ID not found for instance');
    }

    console.log('[WhatsApp Webhook] Project:', projectId, 'Number:', whatsappNumberId);

    // Handle different event types
    switch (payload.event) {
      case 'messages.upsert': {
        await handleIncomingMessage(supabase, payload, projectId as string, whatsappNumberId, instance.id);
        break;
      }
      
      case 'messages.update': {
        await handleMessageUpdate(supabase, payload);
        break;
      }
      
      case 'connection.update': {
        await handleConnectionUpdate(supabase, payload, instance.id);
        break;
      }
      
      case 'qrcode.updated': {
        await handleQRCodeUpdate(supabase, payload, instance.id);
        break;
      }
      
      default:
        console.log('[WhatsApp Webhook] Unhandled event type:', payload.event);
    }

    // Log metrics
    const processingTime = Date.now() - startTime;
    await logWebhookMetrics(supabase, projectId, webhookType, processingTime, true);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WhatsApp Webhook] Error:', errorMessage);
    
    // Log failed metric
    const processingTime = Date.now() - startTime;
    if (projectId) {
      await logWebhookMetrics(supabase, projectId, webhookType, processingTime, false, errorMessage);
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleIncomingMessage(
  supabase: any,
  payload: EvolutionWebhookPayload,
  projectId: string,
  whatsappNumberId: string,
  instanceId: string
) {
  const data = payload.data;
  if (!data.key || data.key.fromMe) {
    console.log('[WhatsApp Webhook] Skipping outbound or invalid message');
    return;
  }

  const remoteJid = data.key.remoteJid;
  const messageId = data.key.id;
  const pushName = data.pushName || null;

  // Extract message content and type
  const { content, contentType } = extractMessageContent(data.message);
  
  console.log('[WhatsApp Webhook] Processing message from:', remoteJid, 'Type:', contentType);

  // Find or create conversation
  let conversation = await findOrCreateConversation(
    supabase, 
    projectId, 
    whatsappNumberId, 
    remoteJid, 
    pushName
  );

  // Insert message
  const { error: messageError } = await supabase
    .from('whatsapp_messages')
    .insert({
      conversation_id: conversation.id,
      whatsapp_number_id: whatsappNumberId,
      direction: 'inbound',
      content_type: contentType,
      content: content,
      external_id: messageId,
      status: 'delivered',
      metadata: {
        pushName,
        timestamp: data.messageTimestamp,
        raw: data.message,
      },
    });

  if (messageError) {
    console.error('[WhatsApp Webhook] Error inserting message:', messageError);
    throw messageError;
  }

  // Update conversation
  await supabase
    .from('whatsapp_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      unread_count: (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id);

  console.log('[WhatsApp Webhook] Message processed successfully');
}

async function findOrCreateConversation(
  supabase: any,
  projectId: string,
  whatsappNumberId: string,
  remoteJid: string,
  pushName: string | null
) {
  // Try to find existing conversation
  const { data: existingConv } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('project_id', projectId)
    .eq('remote_jid', remoteJid)
    .in('status', ['open', 'pending'])
    .single();

  if (existingConv) {
    return existingConv;
  }

  // Find or create CRM contact
  const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  let contactId: string | null = null;

  // Try to find contact by phone
  const { data: existingContact } = await supabase
    .from('crm_contacts')
    .select('id')
    .eq('project_id', projectId)
    .eq('phone', phone)
    .single();

  if (existingContact) {
    contactId = existingContact.id;
  } else {
    // Create new contact
    const { data: newContact, error: contactError } = await supabase
      .from('crm_contacts')
      .insert({
        project_id: projectId,
        email: `${phone}@whatsapp.temp`,
        phone: phone,
        name: pushName,
        source: 'whatsapp',
        status: 'lead',
        tags: ['WhatsApp'],
      })
      .select('id')
      .single();

    if (contactError) {
      console.error('[WhatsApp Webhook] Error creating contact:', contactError);
      throw contactError;
    }
    contactId = newContact.id;
  }

  // Get next available agent
  const { data: nextAgent } = await supabase.rpc('get_next_available_agent', {
    p_project_id: projectId,
    p_department_id: null,
  });

  // Determine conversation status and queue position
  let status = 'open';
  let queuePosition = null;
  let assignedTo = nextAgent;

  if (!nextAgent) {
    // No agent available, put in queue
    status = 'pending';
    const { data: position } = await supabase.rpc('get_queue_position', {
      p_project_id: projectId,
      p_department_id: null,
    });
    queuePosition = position;
    console.log('[WhatsApp Webhook] No agent available, queue position:', queuePosition);
  } else {
    console.log('[WhatsApp Webhook] Assigned to agent:', nextAgent);
  }

  // Create conversation
  const { data: newConv, error: convError } = await supabase
    .from('whatsapp_conversations')
    .insert({
      project_id: projectId,
      contact_id: contactId,
      whatsapp_number_id: whatsappNumberId,
      remote_jid: remoteJid,
      status: status,
      assigned_to: assignedTo,
      queue_position: queuePosition,
      queued_at: status === 'pending' ? new Date().toISOString() : null,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })
    .select('*')
    .single();

  if (convError) {
    console.error('[WhatsApp Webhook] Error creating conversation:', convError);
    throw convError;
  }

  return newConv;
}

function extractMessageContent(message: any): { content: string | null; contentType: string } {
  if (!message) {
    return { content: null, contentType: 'text' };
  }

  if (message.conversation) {
    return { content: message.conversation, contentType: 'text' };
  }
  
  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, contentType: 'text' };
  }
  
  if (message.imageMessage) {
    return { content: message.imageMessage.caption || '[Imagem]', contentType: 'image' };
  }
  
  if (message.audioMessage) {
    return { content: '[Áudio]', contentType: 'audio' };
  }
  
  if (message.videoMessage) {
    return { content: message.videoMessage.caption || '[Vídeo]', contentType: 'video' };
  }
  
  if (message.documentMessage) {
    return { content: message.documentMessage.fileName || '[Documento]', contentType: 'document' };
  }
  
  if (message.stickerMessage) {
    return { content: '[Sticker]', contentType: 'sticker' };
  }

  return { content: '[Mensagem não suportada]', contentType: 'text' };
}

async function handleMessageUpdate(supabase: any, payload: EvolutionWebhookPayload) {
  const data = payload.data;
  if (!data.key?.id || !data.status) return;

  const statusMap: Record<string, string> = {
    'PENDING': 'pending',
    'SERVER_ACK': 'sent',
    'DELIVERY_ACK': 'delivered',
    'READ': 'read',
    'PLAYED': 'read',
  };

  const newStatus = statusMap[data.status] || data.status.toLowerCase();

  await supabase
    .from('whatsapp_messages')
    .update({ status: newStatus })
    .eq('external_id', data.key.id);

  console.log('[WhatsApp Webhook] Message status updated:', data.key.id, '->', newStatus);
}

async function handleConnectionUpdate(supabase: any, payload: EvolutionWebhookPayload, instanceId: string) {
  const data = payload.data as any;
  
  let status = 'disconnected';
  if (data.state === 'open') status = 'connected';
  else if (data.state === 'connecting') status = 'connecting';
  else if (data.state === 'close') status = 'disconnected';

  await supabase
    .from('whatsapp_instances')
    .update({ 
      status,
      last_heartbeat: new Date().toISOString(),
      error_count: status === 'connected' ? 0 : undefined,
    })
    .eq('id', instanceId);

  console.log('[WhatsApp Webhook] Connection updated:', status);
}

async function handleQRCodeUpdate(supabase: any, payload: EvolutionWebhookPayload, instanceId: string) {
  const data = payload.data as any;
  
  await supabase
    .from('whatsapp_instances')
    .update({
      status: 'qr_pending',
      qr_code: data.qrcode?.base64 || null,
      qr_expires_at: new Date(Date.now() + 60000).toISOString(),
    })
    .eq('id', instanceId);

  console.log('[WhatsApp Webhook] QR Code updated');
}

async function logWebhookMetrics(
  supabase: any,
  projectId: string | null,
  webhookType: string,
  processingTimeMs: number,
  success: boolean,
  errorMessage?: string
) {
  if (!projectId) return;

  try {
    await supabase
      .from('webhook_metrics')
      .insert({
        project_id: projectId,
        webhook_type: webhookType,
        processing_time_ms: processingTimeMs,
        success,
        error_message: errorMessage || null,
      });
  } catch (e) {
    console.error('[WhatsApp Webhook] Error logging metrics:', e);
  }
}
