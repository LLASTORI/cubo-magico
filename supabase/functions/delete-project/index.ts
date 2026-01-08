import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId } = await req.json();
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (project.user_id !== user.id) {
      // Check if user is super_admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profile?.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Not authorized to delete this project" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Starting deletion of project: ${project.name} (${projectId})`);

    // Delete in batches to avoid timeout - order matters due to FK constraints
    // Tables with most data first, then work up the dependency chain
    const tablesToDelete = [
      // Most data, no dependencies on other project tables
      "hotmart_sales",
      "meta_insights",
      "crm_activities",
      "crm_activities_tasks",
      "contact_identity_events",
      "crm_contact_interactions",
      "crm_recovery_activities",
      "ai_usage_tracking",
      "comment_metrics_daily",
      "social_comments",
      "survey_responses",
      "whatsapp_messages",
      
      // Second tier - depend on first tier
      "crm_transactions",
      "automation_executions",
      "whatsapp_conversations",
      
      // Third tier
      "crm_contact_cadences",
      "crm_contacts",
      "social_posts",
      "surveys",
      
      // Automation related
      "automation_flow_edges",
      "automation_flow_nodes",
      "automation_flows",
      "automation_folders",
      "automation_media",
      "automation_message_templates",
      
      // Meta related
      "meta_ads",
      "meta_adsets",
      "meta_campaigns",
      "meta_ad_accounts",
      "meta_ad_audiences",
      "meta_credentials",
      
      // Funnel related
      "funnel_changes",
      "funnel_meta_accounts",
      "funnel_score_history",
      "funnel_thresholds",
      "offer_mappings",
      "funnels",
      
      // CRM config
      "crm_cadence_steps",
      "crm_cadences",
      "crm_pipeline_stages",
      "crm_recovery_stages",
      "crm_webhook_keys",
      
      // Launch related
      "phase_campaigns",
      "launch_phases",
      "launch_products",
      
      // Project config
      "project_credentials",
      "project_invites",
      "project_member_feature_permissions",
      "project_members",
      "project_modules",
      "social_listening_pages",
      "survey_ai_knowledge_base",
      "survey_webhook_keys",
      "ai_knowledge_base",
      "ai_project_quotas",
      "whatsapp_agents",
      "whatsapp_departments",
      "whatsapp_numbers",
    ];

    const BATCH_SIZE = 1000;

    for (const tableName of tablesToDelete) {
      try {
        // Count records first
        const { count } = await supabase
          .from(tableName)
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId);

        if (count && count > 0) {
          console.log(`Deleting ${count} records from ${tableName}`);
          
          // Delete in batches
          let deleted = 0;
          while (deleted < count) {
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .eq("project_id", projectId)
              .limit(BATCH_SIZE);

            if (deleteError) {
              console.error(`Error deleting from ${tableName}:`, deleteError.message);
              // Continue with next table - some tables might not exist or have different structure
              break;
            }
            
            deleted += BATCH_SIZE;
          }
        }
      } catch (err: unknown) {
        // Table might not exist or have different structure, continue
        const message = err instanceof Error ? err.message : String(err);
        console.log(`Skipping table ${tableName}: ${message}`);
      }
    }

    // Finally, delete the project itself
    const { error: finalDeleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (finalDeleteError) {
      console.error("Error deleting project:", finalDeleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete project: " + finalDeleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted project: ${project.name}`);

    return new Response(
      JSON.stringify({ success: true, message: "Project deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
