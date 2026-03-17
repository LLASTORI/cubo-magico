import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonObject = Record<string, unknown>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const requester = authData?.user;

    if (authError || !requester) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as JsonObject;
    const projectId = typeof body.projectId === "string" ? body.projectId : null;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: owner OR super_admin
    let isAuthorized = project.user_id === requester.id;

    if (!isAuthorized) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", requester.id)
        .maybeSingle();

      isAuthorized = roleData?.role === "super_admin";
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[delete-project] start project=${projectId} name=${project.name} requester=${requester.id}`);

    const BATCH_SIZE = 500;
    const MAX_BATCH_LOOPS = 20000;

    const deleteTableByProjectId = async (tableName: string) => {
      let totalDeleted = 0;

      for (let i = 0; i < MAX_BATCH_LOOPS; i++) {
        const { data: rows, error: selectError } = await supabase
          .from(tableName)
          .select("id")
          .eq("project_id", projectId)
          .order("id", { ascending: true })
          .limit(BATCH_SIZE);

        if (selectError) {
          console.error(`[delete-project] ${tableName}: select error:`, selectError.message);
          return { tableName, deleted: totalDeleted, error: selectError.message };
        }

        const ids = (rows || []).map((r: any) => r.id).filter(Boolean);
        if (ids.length === 0) break;

        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in("id", ids);

        if (deleteError) {
          console.error(`[delete-project] ${tableName}: delete error:`, deleteError.message);
          return { tableName, deleted: totalDeleted, error: deleteError.message };
        }

        totalDeleted += ids.length;

        // small yield to avoid long single CPU bursts
        if (i % 20 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      return { tableName, deleted: totalDeleted };
    };

    // Special handler for meta_audience_contacts — no project_id column,
    // must be deleted via audience_id FK chain before meta_ad_audiences and crm_contacts.
    const deleteMetaAudienceContacts = async () => {
      const tableName = "meta_audience_contacts";

      // Resolve all audience UUIDs belonging to this project
      const { data: audiences, error: audienceError } = await supabase
        .from("meta_ad_audiences")
        .select("id")
        .eq("project_id", projectId);

      if (audienceError) {
        console.error(`[delete-project] ${tableName}: audience lookup error:`, audienceError.message);
        return { tableName, deleted: 0, error: audienceError.message };
      }

      const audienceIds = (audiences || []).map((a: any) => a.id).filter(Boolean);
      if (audienceIds.length === 0) {
        return { tableName, deleted: 0 };
      }

      let totalDeleted = 0;

      for (let i = 0; i < MAX_BATCH_LOOPS; i++) {
        const { data: rows, error: selectError } = await supabase
          .from(tableName)
          .select("id")
          .in("audience_id", audienceIds)
          .order("id", { ascending: true })
          .limit(BATCH_SIZE);

        if (selectError) {
          console.error(`[delete-project] ${tableName}: select error:`, selectError.message);
          return { tableName, deleted: totalDeleted, error: selectError.message };
        }

        const ids = (rows || []).map((r: any) => r.id).filter(Boolean);
        if (ids.length === 0) break;

        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .in("id", ids);

        if (deleteError) {
          console.error(`[delete-project] ${tableName}: delete error:`, deleteError.message);
          return { tableName, deleted: totalDeleted, error: deleteError.message };
        }

        totalDeleted += ids.length;
      }

      return { tableName, deleted: totalDeleted };
    };

    // Deletion order — leaf tables (children) before parent tables.
    //
    // Critical ordering constraints:
    //   orders.contact_id        → crm_contacts   NO ACTION  → orders before crm_contacts
    //   meta_audience_contacts.audience_id → meta_ad_audiences NO ACTION → handled separately (no project_id)
    //   meta_audience_contacts.contact_id  → crm_contacts   NO ACTION  → handled separately
    //   provider_order_map.order_id        → orders         NO ACTION  → before orders
    //   quiz_results/sessions.contact_id   → crm_contacts   NO ACTION  → before crm_contacts
    //   path_events/personalization.contact_id → crm_contacts NO ACTION → before crm_contacts
    //   whatsapp_conversations.contact_id  → crm_contacts   NO ACTION  → before crm_contacts
    //   social_comments.contact_id         → crm_contacts   NO ACTION  → before crm_contacts
    //   crm_recovery_activities.contact_id → crm_contacts   NO ACTION  → before crm_contacts
    //   funnel_changes/etc.funnel_id       → funnels        NO ACTION  → before funnels
    //   meta_audience_sync_logs/lookalike.audience_id → meta_ad_audiences NO ACTION → before meta_ad_audiences
    const tablesInSafeOrder: string[] = [
      // Must be deleted before projects (NO ACTION)
      "user_activity_logs",

      // High volume legacy
      "hotmart_sales",
      "meta_insights",

      // Quiz — contact_id NO ACTION → crm_contacts; must be before crm_contacts
      "quiz_events",
      "quiz_results",
      "quiz_sessions",
      "quizzes",

      // Agent AI — contact_id NO ACTION → crm_contacts
      "agent_decisions_log",

      // Recommendation & personalization — contact_id NO ACTION → crm_contacts
      "recommendation_logs",
      "personalization_contexts",
      "personalization_logs",
      "path_events",

      // CRM children (CASCADE from crm_contacts, but explicit for safety)
      "crm_activities",
      "crm_activities_tasks",
      "crm_contact_interactions",
      "crm_recovery_activities",
      "contact_identity_events",
      "crm_transactions",

      // Social — social_comments.contact_id NO ACTION → crm_contacts
      "social_comments",
      "social_listening_sync_logs",
      "social_posts",
      "social_listening_pages",

      // WhatsApp — whatsapp_conversations.contact_id NO ACTION → crm_contacts
      "whatsapp_conversations",
      "whatsapp_agents",
      "whatsapp_departments",
      "whatsapp_numbers",
      "whatsapp_contact_notes",
      "whatsapp_messages",
      "whatsapp_quick_replies",

      // Surveys
      "survey_response_analysis",
      "survey_insights_daily",
      "survey_responses",
      "survey_ai_knowledge_base",
      "survey_webhook_keys",
      "surveys",

      // Funnel children (before funnels)
      "funnel_changes",
      "funnel_experiments",
      "funnel_meta_accounts",
      "funnel_score_history",
      "funnel_thresholds",
      "offer_mappings",
      "launch_products",
      "phase_campaigns",
      "launch_phases",
      "funnels",

      // Automations
      "automation_message_templates",
      "automation_media",
      "automation_flows",
      "automation_folders",

      // Meta audience children (before meta_ad_audiences)
      // meta_audience_contacts is handled separately below (no project_id column)
      "meta_audience_sync_logs",
      "meta_lookalike_audiences",

      // Meta entities
      "meta_ads",
      "meta_adsets",
      "meta_campaigns",
      "meta_ad_audiences",
      "meta_ad_accounts",
      "meta_credentials",

      // Finance — provider_order_map before orders; order children before orders
      "provider_order_map",
      "ledger_events",
      "order_items",
      "orders",                  // MUST be before crm_contacts (orders.contact_id NO ACTION)
      "csv_import_batches",
      "ledger_import_batches",
      "ledger_official",
      "finance_ledger",
      "finance_sync_runs",
      "product_revenue_splits",
      "spend_core_events",
      "sales_history_orders",
      "hotmart_backfill_runs",
      "hotmart_product_plans",

      // Misc project tables
      "notifications",
      "subscriptions",
      "economic_days",
      "event_dispatch_rules",
      "experience_templates",
      "experience_themes",

      // Integrations
      "integration_sync_logs",
      "integration_oauth_tokens",
      "integration_connections",

      // CRM setup
      "crm_cadences",
      "crm_pipeline_stages",
      "crm_recovery_stages",
      "crm_webhook_keys",

      // Project access/config
      "project_invites",
      "project_member_feature_permissions",
      "project_member_permissions",
      "project_members",
      "project_modules",
      "project_credentials",
      "project_settings",
      "project_tracking_settings",
      "role_templates",

      // AI
      "ai_usage_tracking",
      "ai_knowledge_base",
      "ai_project_quotas",
      "ai_agents",

      // CRM contacts — MUST be after orders, meta_audience_contacts (handled separately),
      // quiz_*, path_events, personalization_*, whatsapp_conversations, social_comments, etc.
      "crm_contacts",

      // Misc
      "comment_metrics_daily",
      "webhook_metrics",
    ];

    const deletionReport: Array<{ tableName: string; deleted: number; error?: string }> = [];

    // Delete meta_audience_contacts first (special handler — no project_id column)
    const macResult = await deleteMetaAudienceContacts();
    deletionReport.push(macResult);

    for (const tableName of tablesInSafeOrder) {
      const result = await deleteTableByProjectId(tableName);
      deletionReport.push(result);

      if (result.error) {
        // Hard fail only on project blockers; otherwise return partial report
        if (tableName === "user_activity_logs" || tableName === "crm_contacts") {
          return new Response(
            JSON.stringify({
              error: `Failed deleting from ${tableName}: ${result.error}`,
              partial: deletionReport,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Finally delete project (should be fast now)
    const { error: projectDeleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (projectDeleteError) {
      console.error("[delete-project] projects delete error:", projectDeleteError.message);
      return new Response(
        JSON.stringify({
          error: `Failed to delete project: ${projectDeleteError.message}`,
          partial: deletionReport,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[delete-project] done project=${projectId} elapsed_ms=${Date.now() - startedAt}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        deleted_project_id: projectId,
        elapsed_ms: Date.now() - startedAt,
        deleted: deletionReport,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[delete-project] unexpected error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
