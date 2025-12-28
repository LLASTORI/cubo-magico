import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationFlow {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, any>;
}

interface FlowNode {
  id: string;
  flow_id: string;
  node_type: string;
  config: Record<string, any>;
}

interface FlowEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
}

interface ExecutionContext {
  contact: Record<string, any>;
  conversation?: Record<string, any>;
  message?: string;
  variables: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, ...params } = await req.json();
    console.log(`[Automation Engine] Action: ${action}`, JSON.stringify(params).substring(0, 200));

    let result;

    switch (action) {
      case 'trigger_keyword': {
        // Triggered when a keyword message is received
        const { projectId, contactId, conversationId, message, whatsappNumberId } = params;
        result = await handleKeywordTrigger(supabase, projectId, contactId, conversationId, message, whatsappNumberId);
        break;
      }

      case 'trigger_new_contact': {
        // Triggered when a new contact is created
        const { projectId, contactId } = params;
        result = await handleNewContactTrigger(supabase, projectId, contactId);
        break;
      }

      case 'trigger_tag_added': {
        // Triggered when a tag is added to a contact
        const { projectId, contactId, tag } = params;
        result = await handleTagAddedTrigger(supabase, projectId, contactId, tag);
        break;
      }

      case 'trigger_transaction': {
        // Triggered when a transaction is created or updated
        const { projectId, contactId, transaction } = params;
        result = await handleTransactionTrigger(supabase, projectId, contactId, transaction);
        break;
      }

      case 'process_delayed': {
        // Process executions that have reached their delay time
        result = await processDelayedExecutions(supabase);
        break;
      }

      case 'execute_node': {
        // Execute a specific node (for testing/manual execution)
        const { executionId, nodeId } = params;
        result = await executeNodeById(supabase, executionId, nodeId);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Automation Engine] Error:', errorMessage);
    
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Handle keyword trigger
async function handleKeywordTrigger(
  supabase: any,
  projectId: string,
  contactId: string,
  conversationId: string,
  message: string,
  whatsappNumberId: string
) {
  console.log('[Automation Engine] Checking keyword triggers for project:', projectId);
  
  const messageLower = message.toLowerCase().trim();

  // First, check if there's an active menu waiting for this contact
  const menuResult = await handleMenuReply(supabase, projectId, contactId, conversationId, messageLower, whatsappNumberId);
  if (menuResult.handled) {
    console.log('[Automation Engine] Message handled by menu reply');
    return { triggered: 1, type: 'menu_reply' };
  }

  // Find active flows with keyword trigger for this project
  const { data: flows, error: flowsError } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .eq('trigger_type', 'keyword');

  if (flowsError) {
    console.error('[Automation Engine] Error fetching flows:', flowsError);
    throw flowsError;
  }

  if (!flows || flows.length === 0) {
    console.log('[Automation Engine] No active keyword flows found');
    return { triggered: 0 };
  }

  let triggeredCount = 0;

  for (const flow of flows) {
    const keywords: string[] = flow.trigger_config?.keywords || [];
    const matchMode = flow.trigger_config?.match_mode || 'contains'; // exact, contains, starts_with

    let matched = false;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase().trim();
      
      switch (matchMode) {
        case 'exact':
          matched = messageLower === keywordLower;
          break;
        case 'starts_with':
          matched = messageLower.startsWith(keywordLower);
          break;
        case 'contains':
        default:
          matched = messageLower.includes(keywordLower);
          break;
      }

      if (matched) {
        console.log(`[Automation Engine] Keyword "${keyword}" matched for flow "${flow.name}"`);
        break;
      }
    }

    if (matched) {
      // Get contact data
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      // Get conversation data with instance name
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('*, whatsapp_numbers(*, whatsapp_instances(instance_name))')
        .eq('id', conversationId)
        .single();

      // Extract instance name from the nested relationship
      const instanceName = conversation?.whatsapp_numbers?.whatsapp_instances?.[0]?.instance_name;
      console.log('[Automation Engine] Conversation instance_name:', instanceName, 'remote_jid:', conversation?.remote_jid);

      // Start execution
      await startFlowExecution(supabase, flow, {
        contact: contact || { id: contactId },
        conversation: conversation || { id: conversationId },
        message,
        variables: {
          whatsapp_number_id: whatsappNumberId,
          instance_name: instanceName,
        },
      });

      triggeredCount++;
    }
  }

  return { triggered: triggeredCount };
}

// Handle menu reply - check if the message is a response to a pending menu
async function handleMenuReply(
  supabase: any,
  projectId: string,
  contactId: string,
  conversationId: string,
  message: string,
  whatsappNumberId: string
): Promise<{ handled: boolean }> {
  // Look for active executions waiting for menu reply for this contact
  const { data: executions, error } = await supabase
    .from('automation_executions')
    .select('*, automation_flow_nodes(*)')
    .eq('contact_id', contactId)
    .eq('status', 'waiting_menu')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !executions || executions.length === 0) {
    return { handled: false };
  }

  const execution = executions[0];
  const node = execution.automation_flow_nodes;
  
  if (!node || !node.config || !node.config.options) {
    return { handled: false };
  }

  const options = node.config.options as { text: string; value: string }[];
  
  // Try to match the user's reply to an option
  // Accept both the number and the exact text
  const messageClean = message.trim();
  let matchedIndex = -1;

  // Check if it's a number response (1, 2, 3, etc.)
  const numberMatch = messageClean.match(/^(\d+)$/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10);
    if (num >= 1 && num <= options.length) {
      matchedIndex = num - 1;
    }
  }

  // If not a number, try to match exact text
  if (matchedIndex === -1) {
    matchedIndex = options.findIndex(
      (opt) => opt.text.toLowerCase().trim() === messageClean.toLowerCase()
    );
  }

  if (matchedIndex === -1) {
    // No match - could send "invalid option" message but for now just return
    console.log(`[Automation Engine] Menu reply "${message}" did not match any option`);
    return { handled: false };
  }

  console.log(`[Automation Engine] Menu reply matched option ${matchedIndex + 1}: ${options[matchedIndex].text}`);

  // Get flow data
  const { data: nodes } = await supabase
    .from('automation_flow_nodes')
    .select('*')
    .eq('flow_id', execution.flow_id);

  const { data: edges } = await supabase
    .from('automation_flow_edges')
    .select('*')
    .eq('flow_id', execution.flow_id);

  // Find the edge for this option
  const optionHandle = `option-${matchedIndex}`;
  const nextEdge = edges?.find(
    (e: FlowEdge) => e.source_node_id === node.id && e.source_handle === optionHandle
  );

  if (!nextEdge) {
    console.log(`[Automation Engine] No edge found for handle: ${optionHandle}`);
    await completeExecution(supabase, execution.id, 'completed', 'Menu option has no connected node');
    return { handled: true };
  }

  const nextNode = nodes?.find((n: FlowNode) => n.id === nextEdge.target_node_id);
  
  if (!nextNode) {
    await completeExecution(supabase, execution.id, 'completed', 'Next node not found');
    return { handled: true };
  }

  // Get contact and conversation data
  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  let conversation = null;
  let instanceName = null;
  if (conversationId) {
    const { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('*, whatsapp_numbers(*, whatsapp_instances(instance_name))')
      .eq('id', conversationId)
      .single();
    conversation = conv;
    instanceName = conv?.whatsapp_numbers?.whatsapp_instances?.[0]?.instance_name;
  }

  const context: ExecutionContext = {
    contact: contact || { id: contactId },
    conversation,
    message,
    variables: {
      menu_choice: options[matchedIndex].text,
      menu_choice_number: matchedIndex + 1,
      instance_name: instanceName,
    },
  };

  // Update execution to running
  await supabase
    .from('automation_executions')
    .update({
      status: 'running',
      next_execution_at: null,
      execution_log: [...(execution.execution_log || []), {
        timestamp: new Date().toISOString(),
        event: 'menu_reply_received',
        option_index: matchedIndex,
        option_text: options[matchedIndex].text,
        user_message: message,
      }],
    })
    .eq('id', execution.id);

  // Continue execution from next node
  await executeNode(supabase, execution, nextNode, nodes, edges, context);

  return { handled: true };
}

async function handleNewContactTrigger(supabase: any, projectId: string, contactId: string) {
  console.log('[Automation Engine] Checking new_contact triggers for project:', projectId);

  const { data: flows } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .eq('trigger_type', 'new_contact');

  if (!flows || flows.length === 0) {
    return { triggered: 0 };
  }

  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  let triggeredCount = 0;

  for (const flow of flows) {
    await startFlowExecution(supabase, flow, {
      contact: contact || { id: contactId },
      variables: {},
    });
    triggeredCount++;
  }

  return { triggered: triggeredCount };
}

// Handle tag added trigger with prefix matching support
async function handleTagAddedTrigger(supabase: any, projectId: string, contactId: string, tag: string) {
  console.log('[Automation Engine] Checking tag_added triggers for tag:', tag);

  const { data: flows } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .eq('trigger_type', 'tag_added');

  if (!flows || flows.length === 0) {
    return { triggered: 0 };
  }

  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  let triggeredCount = 0;

  for (const flow of flows) {
    const triggerTags: string[] = flow.trigger_config?.tags || [];
    
    // Empty array means any tag
    if (triggerTags.length === 0) {
      await startFlowExecution(supabase, flow, {
        contact: contact || { id: contactId },
        variables: { 
          triggered_tag: tag,
          ...parseContextualTag(tag),
        },
      });
      triggeredCount++;
      continue;
    }
    
    // Check each trigger tag - support prefix matching (e.g., "abandonou:" matches "abandonou:Produto|Oferta")
    for (const triggerTag of triggerTags) {
      const isPrefix = triggerTag.endsWith(':');
      const matches = isPrefix 
        ? tag.startsWith(triggerTag)
        : tag === triggerTag || tag.startsWith(triggerTag + ':');
      
      if (matches) {
        console.log(`[Automation Engine] Tag "${tag}" matched trigger "${triggerTag}"`);
        await startFlowExecution(supabase, flow, {
          contact: contact || { id: contactId },
          variables: { 
            triggered_tag: tag,
            ...parseContextualTag(tag),
          },
        });
        triggeredCount++;
        break; // Don't trigger same flow multiple times
      }
    }
  }

  return { triggered: triggeredCount };
}

// Parse contextual tag format: "evento:Produto|Oferta"
function parseContextualTag(tag: string): Record<string, string> {
  const variables: Record<string, string> = {};
  
  const colonIndex = tag.indexOf(':');
  if (colonIndex === -1) return variables;
  
  const evento = tag.substring(0, colonIndex);
  const rest = tag.substring(colonIndex + 1);
  
  variables.evento = evento;
  variables.tag_evento = evento;
  
  const pipeIndex = rest.indexOf('|');
  if (pipeIndex !== -1) {
    variables.produto = rest.substring(0, pipeIndex);
    variables.oferta = rest.substring(pipeIndex + 1);
    variables.tag_produto = variables.produto;
    variables.tag_oferta = variables.oferta;
  } else {
    variables.produto = rest;
    variables.tag_produto = rest;
  }
  
  return variables;
}

// Handle transaction event trigger
async function handleTransactionTrigger(
  supabase: any, 
  projectId: string, 
  contactId: string, 
  transaction: {
    id: string;
    status: string;
    product_name: string;
    product_code: string | null;
    offer_code: string | null;
    offer_name: string | null;
    total_price: number | null;
    total_price_brl: number | null;
    payment_method: string | null;
    transaction_date: string | null;
  }
) {
  console.log('[Automation Engine] Checking transaction_event triggers for status:', transaction.status);

  const { data: flows } = await supabase
    .from('automation_flows')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .eq('trigger_type', 'transaction_event');

  if (!flows || flows.length === 0) {
    console.log('[Automation Engine] No active transaction_event flows found');
    return { triggered: 0 };
  }

  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  let triggeredCount = 0;

  for (const flow of flows) {
    const triggerStatuses: string[] = flow.trigger_config?.statuses || [];
    
    // Check if status matches (empty array means any status)
    const statusMatches = triggerStatuses.length === 0 || 
      triggerStatuses.includes(transaction.status) ||
      (transaction.status === 'COMPLETE' && triggerStatuses.includes('APPROVED'));
    
    if (statusMatches) {
      console.log(`[Automation Engine] Transaction trigger matched for flow: ${flow.name}`);
      
      await startFlowExecution(supabase, flow, {
        contact: contact || { id: contactId },
        variables: {
          transaction_id: transaction.id,
          transaction_status: transaction.status,
          produto: transaction.product_name,
          product_name: transaction.product_name,
          product_code: transaction.product_code,
          oferta: transaction.offer_code,
          offer_code: transaction.offer_code,
          offer_name: transaction.offer_name,
          valor: transaction.total_price_brl || transaction.total_price || 0,
          total_price: transaction.total_price_brl || transaction.total_price || 0,
          payment_method: transaction.payment_method,
          transaction_date: transaction.transaction_date,
        },
      });
      triggeredCount++;
    }
  }

  return { triggered: triggeredCount };
}

// Start flow execution
async function startFlowExecution(
  supabase: any,
  flow: AutomationFlow,
  context: ExecutionContext
) {
  console.log(`[Automation Engine] Starting execution of flow: ${flow.name}`);

  // Get start node
  const { data: nodes } = await supabase
    .from('automation_flow_nodes')
    .select('*')
    .eq('flow_id', flow.id);

  const startNode = nodes?.find((n: FlowNode) => n.node_type === 'start');
  
  if (!startNode) {
    console.error('[Automation Engine] No start node found for flow:', flow.id);
    return null;
  }

  // Get edges
  const { data: edges } = await supabase
    .from('automation_flow_edges')
    .select('*')
    .eq('flow_id', flow.id);

  // Create execution record
  const { data: execution, error: execError } = await supabase
    .from('automation_executions')
    .insert({
      flow_id: flow.id,
      contact_id: context.contact.id,
      conversation_id: context.conversation?.id,
      status: 'running',
      current_node_id: startNode.id,
      execution_log: [{
        timestamp: new Date().toISOString(),
        event: 'started',
        node_id: startNode.id,
        context: {
          contact_name: context.contact.name,
          message: context.message,
        },
      }],
    })
    .select()
    .single();

  if (execError) {
    console.error('[Automation Engine] Error creating execution:', execError);
    throw execError;
  }

  console.log(`[Automation Engine] Created execution: ${execution.id}`);

  // Find next node after start
  const nextEdge = edges?.find((e: FlowEdge) => e.source_node_id === startNode.id);
  
  if (!nextEdge) {
    await completeExecution(supabase, execution.id, 'completed', 'No nodes after start');
    return execution;
  }

  const nextNode = nodes?.find((n: FlowNode) => n.id === nextEdge.target_node_id);
  
  if (!nextNode) {
    await completeExecution(supabase, execution.id, 'completed', 'Next node not found');
    return execution;
  }

  // Execute the next node
  await executeNode(supabase, execution, nextNode, nodes, edges, context);

  return execution;
}

// Execute a node
async function executeNode(
  supabase: any,
  execution: any,
  node: FlowNode,
  allNodes: FlowNode[],
  allEdges: FlowEdge[],
  context: ExecutionContext
) {
  console.log(`[Automation Engine] Executing node: ${node.node_type} (${node.id})`);

  // Update current node
  await supabase
    .from('automation_executions')
    .update({
      current_node_id: node.id,
      execution_log: [...(execution.execution_log || []), {
        timestamp: new Date().toISOString(),
        event: 'executing',
        node_id: node.id,
        node_type: node.node_type,
      }],
    })
    .eq('id', execution.id);

  try {
    let nextHandle: string | null = null;

    switch (node.node_type) {
      case 'message':
        await executeMessageNode(supabase, node, context);
        break;

      case 'media':
        await executeMediaNode(supabase, node, context);
        break;

      case 'delay':
        await executeDelayNode(supabase, execution, node, allNodes, allEdges, context);
        return; // Delay node schedules next execution

      case 'condition':
        nextHandle = await executeConditionNode(node, context);
        break;

      case 'action':
        await executeActionNode(supabase, node, context);
        break;

      case 'menu':
        await executeMenuNode(supabase, execution, node, allNodes, allEdges, context);
        return; // Menu node waits for user reply

      default:
        console.log(`[Automation Engine] Unknown node type: ${node.node_type}`);
    }

    // Find and execute next node
    const nextEdge = allEdges.find((e: FlowEdge) => 
      e.source_node_id === node.id && 
      (nextHandle === null || e.source_handle === nextHandle)
    );

    if (!nextEdge) {
      await completeExecution(supabase, execution.id, 'completed', 'Flow completed successfully');
      return;
    }

    const nextNode = allNodes.find((n: FlowNode) => n.id === nextEdge.target_node_id);
    
    if (!nextNode) {
      await completeExecution(supabase, execution.id, 'completed', 'Next node not found');
      return;
    }

    // Small delay between nodes to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Execute next node
    await executeNode(supabase, execution, nextNode, allNodes, allEdges, context);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Automation Engine] Node execution error:`, errorMessage);
    
    await completeExecution(supabase, execution.id, 'failed', errorMessage);
  }
}

// Execute message node
async function executeMessageNode(supabase: any, node: FlowNode, context: ExecutionContext) {
  const content = node.config.content || '';
  
  if (!content) {
    console.log('[Automation Engine] Message node has no content');
    return;
  }

  // Replace variables
  const processedContent = replaceVariables(content, context);
  
  // Send via Evolution API
  await sendWhatsAppMessage(supabase, context, processedContent);
  
  console.log(`[Automation Engine] Message sent: ${processedContent.substring(0, 50)}...`);
}

// Execute media node
async function executeMediaNode(supabase: any, node: FlowNode, context: ExecutionContext) {
  const { media_type, media_url, caption } = node.config;
  
  console.log(`[Automation Engine] Media node config:`, JSON.stringify({ media_type, media_url: media_url?.substring(0, 80), caption: caption?.substring(0, 50) }));
  
  if (!media_url) {
    console.log('[Automation Engine] Media node has no URL - skipping');
    return;
  }

  if (!media_type) {
    console.log('[Automation Engine] Media node has no type - defaulting to image');
  }

  const processedCaption = caption ? replaceVariables(caption, context) : '';
  
  try {
    await sendWhatsAppMedia(supabase, context, media_type || 'image', media_url, processedCaption);
    console.log(`[Automation Engine] Media sent successfully: ${media_type || 'image'}`);
  } catch (error) {
    console.error(`[Automation Engine] Failed to send media:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

// Execute delay node
async function executeDelayNode(
  supabase: any,
  execution: any,
  node: FlowNode,
  allNodes: FlowNode[],
  allEdges: FlowEdge[],
  context: ExecutionContext
) {
  const delayMinutes = node.config.delay_minutes || 1;
  const nextExecutionAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  console.log(`[Automation Engine] Scheduling delay: ${delayMinutes} minutes, next at: ${nextExecutionAt.toISOString()}`);

  // Find next node
  const nextEdge = allEdges.find((e: FlowEdge) => e.source_node_id === node.id);
  
  // Update execution with scheduled time
  await supabase
    .from('automation_executions')
    .update({
      status: 'waiting',
      next_execution_at: nextExecutionAt.toISOString(),
      current_node_id: nextEdge?.target_node_id || null,
      execution_log: [...(execution.execution_log || []), {
        timestamp: new Date().toISOString(),
        event: 'delay_scheduled',
        delay_minutes: delayMinutes,
        resume_at: nextExecutionAt.toISOString(),
      }],
    })
    .eq('id', execution.id);
}

// Execute menu node - sends options and waits for user choice
async function executeMenuNode(
  supabase: any,
  execution: any,
  node: FlowNode,
  allNodes: FlowNode[],
  allEdges: FlowEdge[],
  context: ExecutionContext
) {
  const { message, options, timeout_minutes } = node.config;

  if (!message || !options || options.length < 2) {
    console.log('[Automation Engine] Menu node not properly configured');
    await completeExecution(supabase, execution.id, 'failed', 'Menu node not configured');
    return;
  }

  // Build menu message with numbered options
  const optionTexts = options.map((opt: { text: string; value: string }, index: number) => {
    return `${index + 1}️⃣ ${opt.text}`;
  });

  const fullMessage = `${replaceVariables(message, context)}\n\n${optionTexts.join('\n')}`;

  // Send the menu message
  await sendWhatsAppMessage(supabase, context, fullMessage);
  
  console.log(`[Automation Engine] Menu sent with ${options.length} options`);

  // Calculate timeout if set
  const nextExecutionAt = timeout_minutes && timeout_minutes > 0
    ? new Date(Date.now() + timeout_minutes * 60 * 1000)
    : null;

  // Update execution to waiting for menu reply
  await supabase
    .from('automation_executions')
    .update({
      status: 'waiting_menu',
      current_node_id: node.id,
      next_execution_at: nextExecutionAt?.toISOString() || null,
      execution_log: [...(execution.execution_log || []), {
        timestamp: new Date().toISOString(),
        event: 'menu_sent',
        node_id: node.id,
        options_count: options.length,
        timeout_minutes: timeout_minutes || null,
      }],
    })
    .eq('id', execution.id);
}

async function executeConditionNode(node: FlowNode, context: ExecutionContext): Promise<string> {
  const { field, operator, value } = node.config;
  
  if (!field) {
    console.log('[Automation Engine] Condition node has no field');
    return 'no';
  }

  const contactValue = getNestedValue(context.contact, field);
  const result = evaluateCondition(contactValue, operator, value);

  console.log(`[Automation Engine] Condition: ${field} ${operator} ${value} = ${result} (actual: ${contactValue})`);

  return result ? 'yes' : 'no';
}

// Execute action node
async function executeActionNode(supabase: any, node: FlowNode, context: ExecutionContext) {
  const { action_type, action_value, notify_members } = node.config;
  
  if (!action_type) {
    console.log('[Automation Engine] Action node has no type');
    return;
  }

  const contactId = context.contact.id;

  switch (action_type) {
    case 'add_tag': {
      const currentTags = context.contact.tags || [];
      if (!currentTags.includes(action_value)) {
        await supabase
          .from('crm_contacts')
          .update({ tags: [...currentTags, action_value] })
          .eq('id', contactId);
        console.log(`[Automation Engine] Added tag: ${action_value}`);
      }
      break;
    }

    case 'remove_tag': {
      const currentTags = context.contact.tags || [];
      await supabase
        .from('crm_contacts')
        .update({ tags: currentTags.filter((t: string) => t !== action_value) })
        .eq('id', contactId);
      console.log(`[Automation Engine] Removed tag: ${action_value}`);
      break;
    }

    case 'change_stage': {
      await supabase
        .from('crm_contacts')
        .update({ pipeline_stage_id: action_value })
        .eq('id', contactId);
      console.log(`[Automation Engine] Changed pipeline stage: ${action_value}`);
      break;
    }

    case 'change_recovery_stage': {
      await supabase
        .from('crm_contacts')
        .update({ recovery_stage_id: action_value })
        .eq('id', contactId);
      console.log(`[Automation Engine] Changed recovery stage: ${action_value}`);
      break;
    }

    case 'notify_team': {
      // Replace variables in notification message
      const processedMessage = action_value 
        ? replaceVariables(action_value, context)
        : `Automação acionada para ${context.contact.name || context.contact.email}`;

      let memberIds: string[] = [];
      
      // If specific members are selected, use them; otherwise notify all project members
      if (notify_members && Array.isArray(notify_members) && notify_members.length > 0) {
        memberIds = notify_members;
        console.log(`[Automation Engine] Notifying ${memberIds.length} specific members`);
      } else {
        // Fallback to all project members
        const { data: members } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', context.contact.project_id);
        
        if (members && members.length > 0) {
          memberIds = members.map((m: { user_id: string }) => m.user_id);
        }
        console.log(`[Automation Engine] Notifying all ${memberIds.length} team members`);
      }

      if (memberIds.length > 0) {
        const notifications = memberIds.map((userId: string) => ({
          user_id: userId,
          title: 'Notificação de Automação',
          message: processedMessage,
          type: 'automation',
          metadata: { 
            contact_id: contactId,
            contact_name: context.contact.name,
            contact_email: context.contact.email,
          },
        }));

        await supabase.from('notifications').insert(notifications);
        console.log(`[Automation Engine] Notified ${memberIds.length} members`);
      }
      break;
    }

    default:
      console.log(`[Automation Engine] Unknown action type: ${action_type}`);
  }
}

// Process delayed executions
async function processDelayedExecutions(supabase: any) {
  console.log('[Automation Engine] Processing delayed executions...');

  const { data: executions, error } = await supabase
    .from('automation_executions')
    .select('*, automation_flows(*)')
    .in('status', ['waiting', 'waiting_menu'])
    .lte('next_execution_at', new Date().toISOString())
    .limit(50);

  if (error) {
    console.error('[Automation Engine] Error fetching delayed executions:', error);
    throw error;
  }

  if (!executions || executions.length === 0) {
    console.log('[Automation Engine] No delayed executions to process');
    return { processed: 0 };
  }

  console.log(`[Automation Engine] Found ${executions.length} delayed executions`);

  let processed = 0;

  for (const execution of executions) {
    try {
      await resumeExecution(supabase, execution);
      processed++;
    } catch (e) {
      console.error(`[Automation Engine] Error resuming execution ${execution.id}:`, e);
    }
  }

  return { processed };
}

// Resume a paused execution
async function resumeExecution(supabase: any, execution: any) {
  console.log(`[Automation Engine] Resuming execution: ${execution.id}`);

  // Update status
  await supabase
    .from('automation_executions')
    .update({
      status: 'running',
      next_execution_at: null,
      execution_log: [...(execution.execution_log || []), {
        timestamp: new Date().toISOString(),
        event: 'resumed',
      }],
    })
    .eq('id', execution.id);

  // Get flow data
  const { data: nodes } = await supabase
    .from('automation_flow_nodes')
    .select('*')
    .eq('flow_id', execution.flow_id);

  const { data: edges } = await supabase
    .from('automation_flow_edges')
    .select('*')
    .eq('flow_id', execution.flow_id);

  // Get contact
  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', execution.contact_id)
    .single();

  // Get conversation if exists
  let conversation = null;
  let instanceName = null;
  if (execution.conversation_id) {
    const { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('*, whatsapp_numbers(*, whatsapp_instances(instance_name))')
      .eq('id', execution.conversation_id)
      .single();
    conversation = conv;
    instanceName = conv?.whatsapp_numbers?.whatsapp_instances?.[0]?.instance_name;
    console.log('[Automation Engine] Resume - instance_name:', instanceName);
  }

  const context: ExecutionContext = {
    contact: contact || { id: execution.contact_id },
    conversation,
    variables: {
      instance_name: instanceName,
    },
  };

  // Find current node
  const currentNode = nodes?.find((n: FlowNode) => n.id === execution.current_node_id);
  
  if (!currentNode) {
    await completeExecution(supabase, execution.id, 'completed', 'No current node found');
    return;
  }

  // Continue execution
  await executeNode(supabase, execution, currentNode, nodes, edges, context);
}

// Execute node by ID (for manual/test execution)
async function executeNodeById(supabase: any, executionId: string, nodeId: string) {
  const { data: execution } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('id', executionId)
    .single();

  if (!execution) {
    throw new Error('Execution not found');
  }

  const { data: nodes } = await supabase
    .from('automation_flow_nodes')
    .select('*')
    .eq('flow_id', execution.flow_id);

  const { data: edges } = await supabase
    .from('automation_flow_edges')
    .select('*')
    .eq('flow_id', execution.flow_id);

  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('id', execution.contact_id)
    .single();

  const node = nodes?.find((n: FlowNode) => n.id === nodeId);
  
  if (!node) {
    throw new Error('Node not found');
  }

  await executeNode(supabase, execution, node, nodes, edges, { contact, variables: {} });

  return { executed: true };
}

// Complete execution
async function completeExecution(supabase: any, executionId: string, status: string, message: string) {
  console.log(`[Automation Engine] Completing execution ${executionId}: ${status} - ${message}`);

  await supabase
    .from('automation_executions')
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_message: status === 'failed' ? message : null,
    })
    .eq('id', executionId);
}

// Send WhatsApp message via Evolution API
async function sendWhatsAppMessage(supabase: any, context: ExecutionContext, text: string) {
  const conversation = context.conversation;
  
  if (!conversation) {
    console.log('[Automation Engine] No conversation context, skipping message');
    return;
  }

  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('[Automation Engine] Evolution API not configured');
    return;
  }

  const instanceName = context.variables.instance_name;
  const remoteJid = conversation.remote_jid;

  if (!instanceName || !remoteJid) {
    console.error('[Automation Engine] Missing instance or remote_jid');
    return;
  }

  const cleanNumber = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');
  const apiUrl = EVOLUTION_API_URL.startsWith('http') ? EVOLUTION_API_URL : `https://${EVOLUTION_API_URL}`;

  const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({ number: cleanNumber, text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Automation Engine] Error sending message:', errorText);
    throw new Error(`Failed to send message: ${response.status}`);
  }

  // Save message to database
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    whatsapp_number_id: conversation.whatsapp_number_id,
    direction: 'outbound',
    content_type: 'text',
    content: text,
    status: 'sent',
    metadata: { source: 'automation' },
  });

  // Update conversation: remove from "pending/aguardando" status and update timestamps
  const updateData: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Only change status if it's pending (waiting for response)
  if (conversation.status === 'pending') {
    updateData.status = 'open';
  }
  
  // Set first_response_at if not already set (first automated response)
  if (!conversation.first_response_at) {
    updateData.first_response_at = new Date().toISOString();
  }
  
  await supabase
    .from('whatsapp_conversations')
    .update(updateData)
    .eq('id', conversation.id);

  console.log('[Automation Engine] Message sent successfully, conversation updated');
}

// Send WhatsApp media via Evolution API
async function sendWhatsAppMedia(
  supabase: any,
  context: ExecutionContext,
  mediaType: string,
  mediaUrl: string,
  caption: string
) {
  const conversation = context.conversation;
  
  if (!conversation) {
    console.log('[Automation Engine] No conversation context, skipping media');
    return;
  }

  const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
  const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('[Automation Engine] Evolution API not configured');
    return;
  }

  const instanceName = context.variables.instance_name;
  const remoteJid = conversation.remote_jid;

  if (!instanceName || !remoteJid) {
    console.error('[Automation Engine] Missing instance or remote_jid');
    return;
  }

  const cleanNumber = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');
  const apiUrl = EVOLUTION_API_URL.startsWith('http') ? EVOLUTION_API_URL : `https://${EVOLUTION_API_URL}`;

  let endpoint = '';
  let body: Record<string, unknown> = { number: cleanNumber };

  switch (mediaType) {
    case 'image':
    case 'video':
    case 'document':
      endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
      body = {
        number: cleanNumber,
        mediatype: mediaType,
        media: mediaUrl,
        caption: caption || '',
      };
      break;
    case 'audio':
      endpoint = `${apiUrl}/message/sendWhatsAppAudio/${instanceName}`;
      body = { number: cleanNumber, audio: mediaUrl };
      break;
    default:
      throw new Error(`Unsupported media type: ${mediaType}`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Automation Engine] Error sending media:', errorText);
    throw new Error(`Failed to send media: ${response.status}`);
  }

  // Save message to database
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    whatsapp_number_id: conversation.whatsapp_number_id,
    direction: 'outbound',
    content_type: mediaType,
    media_url: mediaUrl,
    content: caption || null,
    status: 'sent',
    metadata: { source: 'automation' },
  });

  // Update conversation: remove from "pending/aguardando" status and update timestamps
  const updateData: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Only change status if it's pending (waiting for response)
  if (conversation.status === 'pending') {
    updateData.status = 'open';
  }
  
  // Set first_response_at if not already set (first automated response)
  if (!conversation.first_response_at) {
    updateData.first_response_at = new Date().toISOString();
  }
  
  await supabase
    .from('whatsapp_conversations')
    .update(updateData)
    .eq('id', conversation.id);

  console.log('[Automation Engine] Media sent successfully, conversation updated');
}

// Replace variables in text
function replaceVariables(text: string, context: ExecutionContext): string {
  let result = text;
  
  const contact = context.contact;
  
  // Compute first_name and last_name from contact data
  const firstName = contact.first_name || (contact.name ? contact.name.split(' ')[0] : '');
  const lastName = contact.last_name || (contact.name ? contact.name.split(' ').slice(1).join(' ') : '');
  
  const replacements: Record<string, string> = {
    '{{nome}}': contact.name || '',
    '{{primeiro_nome}}': firstName,
    '{{sobrenome}}': lastName,
    '{{email}}': contact.email || '',
    '{{telefone}}': contact.phone || '',
    '{{cidade}}': contact.city || '',
    '{{estado}}': contact.state || '',
    '{{pais}}': contact.country || '',
    '{{cep}}': contact.cep || '',
    '{{documento}}': contact.document || '',
    '{{instagram}}': contact.instagram || '',
    '{{status}}': contact.status || '',
    '{{total_compras}}': String(contact.total_purchases || 0),
    '{{receita_total}}': contact.total_revenue ? `R$ ${Number(contact.total_revenue).toFixed(2)}` : 'R$ 0,00',
    '{{tags}}': Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
    '{{utm_source}}': contact.first_utm_source || '',
    '{{utm_campaign}}': contact.first_utm_campaign || '',
    '{{utm_medium}}': contact.first_utm_medium || '',
    '{{primeira_compra}}': contact.first_purchase_at ? new Date(contact.first_purchase_at).toLocaleDateString('pt-BR') : '',
    '{{ultima_compra}}': contact.last_purchase_at ? new Date(contact.last_purchase_at).toLocaleDateString('pt-BR') : '',
    '{{notas}}': contact.notes || '',
    '{{mensagem}}': context.message || '',
  };

  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(variable, 'gi'), value);
  }

  return result;
}

// Get nested value from object
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Evaluate condition
function evaluateCondition(value: any, operator: string, compareValue: string): boolean {
  switch (operator) {
    case 'equals':
      return String(value).toLowerCase() === String(compareValue).toLowerCase();
    case 'not_equals':
      return String(value).toLowerCase() !== String(compareValue).toLowerCase();
    case 'contains':
      if (Array.isArray(value)) {
        return value.some(v => String(v).toLowerCase().includes(String(compareValue).toLowerCase()));
      }
      return String(value).toLowerCase().includes(String(compareValue).toLowerCase());
    case 'not_contains':
      if (Array.isArray(value)) {
        return !value.some(v => String(v).toLowerCase().includes(String(compareValue).toLowerCase()));
      }
      return !String(value).toLowerCase().includes(String(compareValue).toLowerCase());
    case 'greater_than':
      return Number(value) > Number(compareValue);
    case 'less_than':
      return Number(value) < Number(compareValue);
    case 'is_empty':
      return !value || (Array.isArray(value) && value.length === 0);
    case 'is_not_empty':
      return !!value && (!Array.isArray(value) || value.length > 0);
    default:
      return false;
  }
}
