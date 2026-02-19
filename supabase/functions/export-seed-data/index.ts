import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const lines: string[] = [];
  lines.push("-- =============================================");
  lines.push("-- SEED DATA EXPORT: features, feature_overrides,");
  lines.push("-- plan_features, role_templates");
  lines.push("-- Generated: " + new Date().toISOString());
  lines.push("-- =============================================");
  lines.push("");

  // 1. Features
  lines.push("-- ===== FEATURES =====");
  const { data: features } = await supabase.from("features").select("*").order("module_key");
  if (features) {
    for (const f of features) {
      const esc = (v: string | null) => v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`;
      lines.push(
        `INSERT INTO features (id, module_key, feature_key, name, description, is_active, created_at, updated_at) VALUES (${esc(f.id)}, ${esc(f.module_key)}, ${esc(f.feature_key)}, ${esc(f.name)}, ${esc(f.description)}, ${f.is_active}, ${esc(f.created_at)}, ${esc(f.updated_at)}) ON CONFLICT (id) DO NOTHING;`
      );
    }
  }
  lines.push("");

  // 2. Feature Overrides
  lines.push("-- ===== FEATURE OVERRIDES =====");
  const { data: overrides } = await supabase.from("feature_overrides").select("*").order("created_at");
  if (overrides) {
    for (const o of overrides) {
      const esc = (v: string | null) => v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`;
      lines.push(
        `INSERT INTO feature_overrides (id, feature_id, target_type, target_id, enabled, created_by, expires_at, created_at, updated_at) VALUES (${esc(o.id)}, ${esc(o.feature_id)}, ${esc(o.target_type)}, ${esc(o.target_id)}, ${o.enabled}, ${esc(o.created_by)}, ${esc(o.expires_at)}, ${esc(o.created_at)}, ${esc(o.updated_at)}) ON CONFLICT (id) DO NOTHING;`
      );
    }
  }
  lines.push("");

  // 3. Plan Features
  lines.push("-- ===== PLAN FEATURES =====");
  const { data: planFeatures } = await supabase.from("plan_features").select("*").order("plan_id");
  if (planFeatures) {
    for (const pf of planFeatures) {
      const esc = (v: string | null) => v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`;
      lines.push(
        `INSERT INTO plan_features (id, plan_id, feature_id, enabled, created_at) VALUES (${esc(pf.id)}, ${esc(pf.plan_id)}, ${esc(pf.feature_id)}, ${pf.enabled}, ${esc(pf.created_at)}) ON CONFLICT (id) DO NOTHING;`
      );
    }
  }
  lines.push("");

  // 4. Role Templates
  lines.push("-- ===== ROLE TEMPLATES =====");
  const { data: templates } = await supabase.from("role_templates").select("*").order("display_order");
  if (templates) {
    for (const t of templates) {
      const esc = (v: string | null | undefined) => v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
      lines.push(
        `INSERT INTO role_templates (id, name, description, base_role, icon, display_order, is_system_default, is_custom, project_id, perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo, perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes, perm_insights, perm_pesquisas, perm_social_listening, whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent, created_at, updated_at) VALUES (${esc(t.id)}, ${esc(t.name)}, ${esc(t.description)}, ${esc(t.base_role)}, ${esc(t.icon)}, ${t.display_order}, ${t.is_system_default}, ${t.is_custom}, ${esc(t.project_id)}, ${esc(t.perm_dashboard)}, ${esc(t.perm_analise)}, ${esc(t.perm_crm)}, ${esc(t.perm_automacoes)}, ${esc(t.perm_chat_ao_vivo)}, ${esc(t.perm_meta_ads)}, ${esc(t.perm_ofertas)}, ${esc(t.perm_lancamentos)}, ${esc(t.perm_configuracoes)}, ${esc(t.perm_insights)}, ${esc(t.perm_pesquisas)}, ${esc(t.perm_social_listening)}, ${esc(t.whatsapp_visibility_mode)}, ${t.whatsapp_max_chats}, ${t.whatsapp_is_supervisor}, ${t.whatsapp_auto_create_agent}, ${esc(t.created_at)}, ${esc(t.updated_at)}) ON CONFLICT (id) DO NOTHING;`
      );
    }
  }
  lines.push("");
  lines.push("NOTIFY pgrst, 'reload schema';");

  const sql = lines.join("\n");

  return new Response(sql, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=seed_features_overrides.sql",
    },
  });
});
