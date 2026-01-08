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

    // Tables that directly reference projects via project_id FK
    // (Deleting by project_id guarantees we only remove this project's data.)
    const tablesInSafeOrder: string[] = [
      // Must be deleted before projects (NO ACTION)
      "user_activity_logs",

      // High volume
      "hotmart_sales",
      "meta_insights",

      // CRM children first
      "crm_activities",
      "crm_activities_tasks",
      "crm_contact_interactions",
      "crm_recovery_activities",
      "contact_identity_events",
      "crm_transactions",

      // Social + surveys
      "social_comments",
      "social_listening_sync_logs",
      "social_posts",
      "social_listening_pages",
      "survey_response_analysis",
      "survey_insights_daily",
      "survey_responses",
      "survey_ai_knowledge_base",
      "survey_webhook_keys",
      "surveys",

      // Funnels
      "funnel_changes",
      "funnel_meta_accounts",
      "funnel_score_history",
      "funnel_thresholds",
      "offer_mappings",
      "funnels",

      // Automations
      "automation_message_templates",
      "automation_media",
      "automation_flows",
      "automation_folders",

      // Meta entities
      "meta_ads",
      "meta_adsets",
      "meta_campaigns",
      "meta_ad_audiences",
      "meta_ad_accounts",
      "meta_credentials",

      // Launch
      "phase_campaigns",
      "launch_phases",
      "launch_products",

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
      "role_templates",

      // AI
      "ai_usage_tracking",
      "ai_knowledge_base",
      "ai_project_quotas",

      // WhatsApp config
      "whatsapp_conversations",
      "whatsapp_agents",
      "whatsapp_departments",
      "whatsapp_numbers",

      // Misc
      "comment_metrics_daily",
      "crm_contacts",
      "webhook_metrics",
    ];

    const deletionReport: Array<{ tableName: string; deleted: number; error?: string }> = [];

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
