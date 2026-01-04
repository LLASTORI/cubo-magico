import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base prompt template for descriptive funnel analysis
const ANALYSIS_PROMPT_TEMPLATE = `# PAPEL DA IA

Você é uma IA ANALISTA DESCRITIVA DE FUNIS DE VENDAS PERPÉTUOS (Cubo Mágico).

## Seu papel é:
- Interpretar
- Explicar
- Contextualizar
- Descrever tendências

## Você NÃO deve:
- Recomendar ações
- Prescrever estratégias
- Inventar causas não evidentes
- Criar métricas novas
- Recalcular valores existentes

# REGRAS ABSOLUTAS (NÃO QUEBRAR)

1. NUNCA recalcular métricas - Use EXATAMENTE os valores fornecidos
2. NUNCA inventar números - Se algo não existir, diga explicitamente
3. NUNCA fazer recomendações - Nada de "deveria", "sugiro", "recomendo"
4. NUNCA mascarar limitações - Se um dado estiver ausente ou inconsistente, mencione
5. Use EXATAMENTE o health_status informado nos dados

# LIMITAÇÕES CONHECIDAS (VOCÊ DEVE RESPEITAR)

- front_sales pode estar zerado
- overall_cpa pode ser NULL
- Apenas dados da Hotmart estão presentes
- Métricas de conversão Meta não estão disponíveis nas views

👉 Não tente corrigir isso via interpretação.

# O QUE VOCÊ PODE FAZER

Você PODE:
- Explicar o health_status do funil
- Dizer por que o funil está saudável ou não
- Identificar tendências (melhora, piora, estabilidade)
- Comparar o início e o fim do período
- Apontar métricas que sustentam o status atual
- Alertar sobre riscos apenas se os dados mostrarem claramente

# DEFINIÇÕES DE MÉTRICAS (Dicionário Semântico)
{{METRIC_DEFINITIONS}}

# THRESHOLDS DE CLASSIFICAÇÃO
{{THRESHOLDS}}

# DADOS CONSOLIDADOS DO FUNIL
{{FUNNEL_DATA}}

# HISTÓRICO DIÁRIO DO PERÍODO
{{DAILY_METRICS}}

# FORMATO DE RESPOSTA (OBRIGATÓRIO)

Responda EXATAMENTE neste JSON válido:

{
  "resumo_executivo": "Resumo claro e objetivo da situação atual do funil em 2–3 frases.",
  "health_status": "excellent | good | attention | danger | no-return | inactive",
  "health_explanation": "Explicação detalhada do motivo deste status, citando métricas reais.",
  "pontos_fortes": [
    {
      "metrica": "nome_da_metrica",
      "valor": "valor_formatado",
      "explicacao": "por que este ponto é positivo"
    }
  ],
  "pontos_atencao": [
    {
      "metrica": "nome_da_metrica",
      "valor": "valor_formatado",
      "explicacao": "por que este ponto merece atenção",
      "impacto": "qual o risco se isso continuar"
    }
  ],
  "mudancas_periodo": [
    {
      "tipo": "melhoria | piora | estavel",
      "descricao": "o que mudou ao longo do período analisado"
    }
  ],
  "alertas_risco": [
    {
      "tipo": "refund | chargeback | inatividade | outro",
      "descricao": "descrição objetiva do risco",
      "severidade": "baixa | media | alta"
    }
  ],
  "observacoes_adicionais": "Insights relevantes que não envolvem recomendações."
}

# TOM E LINGUAGEM

- Português brasileiro
- Linguagem executiva e clara
- Sem jargões técnicos excessivos
- Foco em clareza e confiança
- Sempre explicável para um gestor

# LEMBRETE FINAL

Esta IA é DESCRITIVA, não diagnóstica nem prescritiva.
O sucesso dela é não errar, não "parecer inteligente".`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { funnel_id, start_date, end_date, client_summary, client_daily } = await req.json();

    if (!funnel_id) {
      return new Response(
        JSON.stringify({ error: "funnel_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase: any = createClient(supabaseUrl, supabaseKey);

    // Check if we have client-provided data (from frontend)
    const hasClientData = client_summary && typeof client_summary === 'object';
    console.log(`[FunnelAI] Analysis mode: ${hasClientData ? 'CLIENT_PAYLOAD' : 'DATABASE_VIEWS'}`);

    // 1. Validate funnel exists (fast query)
    const { data: funnel, error: funnelError } = await supabase
      .from("funnels")
      .select("id, name, project_id, funnel_type, roas_target")
      .eq("id", funnel_id)
      .maybeSingle();

    if (funnelError) {
      console.error("Error fetching funnels:", funnelError);
      return new Response(
        JSON.stringify({ error: "Erro ao validar funil", details: funnelError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!funnel) {
      return new Response(
        JSON.stringify({ error: "Funil não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helpers
    const toNumber = (v: any) => {
      if (v === null || v === undefined) return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const formatBRL = (v: any) => {
      const n = toNumber(v);
      if (n === null) return "N/A";
      return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Date range
    const endDateParam = end_date || new Date().toISOString().split("T")[0];
    const startDateParam =
      start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Build funnel data and daily metrics based on data source
    let funnelDataText: string;
    let dailyMetricsText: string;
    let currentMetrics: any;

    if (hasClientData) {
      // Use client-provided data (fast path - no DB queries for heavy views)
      console.log("[FunnelAI] Using client payload:", JSON.stringify(client_summary, null, 2));
      
      funnelDataText = JSON.stringify({
        funnel_id: funnel_id,
        funnel_name: client_summary.funnel_name || funnel.name,
        health_status: client_summary.health_status,
        total_revenue: client_summary.total_revenue,
        total_investment: client_summary.total_investment,
        total_sales: client_summary.total_sales,
        front_sales: client_summary.front_sales,
        roas: client_summary.roas,
        ticket_medio: client_summary.ticket_medio,
        cpa_real: client_summary.cpa_real,
        cpa_maximo: client_summary.cpa_maximo,
        roas_target: client_summary.roas_target,
        campaign_pattern_used: client_summary.campaign_pattern_used,
      }, null, 2);

      if (client_daily && Array.isArray(client_daily) && client_daily.length > 0) {
        dailyMetricsText = client_daily
          .slice(0, 30)
          .map((d: any) => {
            const roas = d.investment > 0 ? (d.revenue / d.investment).toFixed(2) : "N/A";
            return `${d.date}: vendas=${d.sales}, receita=${formatBRL(d.revenue)}, investimento=${formatBRL(d.investment)}, ROAS=${roas}`;
          })
          .join("\n");
      } else {
        dailyMetricsText = "Dados diários não fornecidos pelo cliente";
      }

      currentMetrics = {
        health_status: client_summary.health_status,
        total_revenue: toNumber(client_summary.total_revenue) ?? 0,
        total_investment: toNumber(client_summary.total_investment) ?? 0,
        roas: toNumber(client_summary.roas) ?? 0,
        total_sales: toNumber(client_summary.total_sales) ?? 0,
      };
    } else {
      // Fallback to database views (may be slow)
      console.log("[FunnelAI] Fetching from database views...");

      // Fetch funnel summary
      const { data: funnelSummary, error: summaryError } = await supabase
        .from("funnel_summary")
        .select("*")
        .eq("funnel_id", funnel_id)
        .maybeSingle();

      if (summaryError) {
        console.error("Error fetching funnel_summary:", summaryError);
        const isTimeout = summaryError.code === "57014" || summaryError.message?.includes("statement timeout");
        return new Response(
          JSON.stringify({
            error: isTimeout
              ? "Tempo limite ao consultar. Recarregue a página e tente novamente."
              : "Erro ao consultar o resumo do funil.",
            details: summaryError.message,
          }),
          { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!funnelSummary) {
        return new Response(
          JSON.stringify({ error: "Resumo do funil não encontrado. Sincronize os dados primeiro." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      funnelDataText = JSON.stringify(funnelSummary, null, 2);

      // Fetch daily metrics
      const { data: dailyData, error: dailyError } = await supabase
        .from("funnel_metrics_daily")
        .select("*")
        .eq("funnel_id", funnel_id)
        .gte("metric_date", startDateParam)
        .lte("metric_date", endDateParam)
        .order("metric_date", { ascending: false })
        .limit(60);

      if (dailyError) {
        console.error("Error fetching funnel_metrics_daily:", dailyError);
        dailyMetricsText = "Erro ao consultar dados diários";
      } else if (!dailyData || dailyData.length === 0) {
        dailyMetricsText = "Sem dados diários disponíveis para o período";
      } else {
        dailyMetricsText = dailyData
          .slice(0, 30)
          .map((d: any) => {
            const roas = toNumber(d.roas);
            const roasStr = roas === null ? "N/A" : roas.toFixed(2);
            return `${d.metric_date}: vendas_confirmadas=${d.confirmed_sales ?? "N/A"}, receita_bruta=${formatBRL(d.gross_revenue)}, investimento=${formatBRL(d.investment)}, ROAS=${roasStr}`;
          })
          .join("\n");
      }

      currentMetrics = {
        health_status: funnelSummary.health_status,
        total_revenue: toNumber(funnelSummary.total_gross_revenue) ?? 0,
        total_investment: toNumber(funnelSummary.total_investment) ?? 0,
        roas: toNumber(funnelSummary.overall_roas) ?? 0,
        total_sales: toNumber(funnelSummary.total_confirmed_sales) ?? 0,
      };
    }

    // Fetch metric definitions (small, fast)
    const { data: metricDefinitions } = await supabase
      .from("metric_definitions")
      .select("metric_key, metric_name, description, formula, unit, category, display_order")
      .order("display_order", { ascending: true });

    // Fetch thresholds (small, fast)
    const { data: thresholds } = await supabase
      .from("funnel_thresholds")
      .select("threshold_key, threshold_value, category, description, project_id")
      .or(`project_id.is.null,project_id.eq.${funnel.project_id}`);

    // Format data for prompt
    const metricDefsText = (metricDefinitions || [])
      .map((m: any) => {
        const name = m.metric_name || m.metric_key;
        const unit = m.unit ? ` Unidade: ${m.unit}.` : "";
        const formula = m.formula ? ` Fórmula: ${m.formula}.` : "";
        return `- ${m.metric_key}: ${name} - ${m.description || ""}.${formula}${unit}`;
      })
      .join("\n");

    const thresholdsText = (thresholds || [])
      .map((t: any) => `- ${t.threshold_key}: ${t.threshold_value} (${t.category}) - ${t.description || ""}`)
      .join("\n");

    // Build final prompt
    const finalPrompt = ANALYSIS_PROMPT_TEMPLATE
      .replace("{{METRIC_DEFINITIONS}}", metricDefsText || "Nenhuma definição encontrada")
      .replace("{{THRESHOLDS}}", thresholdsText || "Nenhum threshold encontrado")
      .replace("{{FUNNEL_DATA}}", funnelDataText)
      .replace("{{DAILY_METRICS}}", dailyMetricsText || "Sem dados diários disponíveis");

    console.log("[FunnelAI] Calling Lovable AI...");

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Você é uma IA analista descritiva de funis de vendas. Seu papel é APENAS interpretar e explicar dados já calculados. NUNCA recalcule métricas, NUNCA faça recomendações, NUNCA invente números. Responda SEMPRE em JSON válido seguindo exatamente o formato solicitado." 
          },
          { role: "user", content: finalPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para análise por IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar análise por IA", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return new Response(
        JSON.stringify({ error: "Resposta da IA vazia" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response (extract JSON from markdown if needed)
    let analysis;
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw AI content:", aiContent);
      
      analysis = {
        resumo_executivo: aiContent,
        parse_error: true,
        raw_response: aiContent,
      };
    }

    console.log("[FunnelAI] Analysis complete, data_source:", hasClientData ? 'client_payload' : 'database_views');

    // Return structured response
    return new Response(
      JSON.stringify({
        success: true,
        funnel_id,
        funnel_name: hasClientData ? (client_summary.funnel_name || funnel.name) : funnel.name,
        analysis_date: new Date().toISOString(),
        period: {
          start: startDateParam,
          end: endDateParam,
        },
        current_metrics: currentMetrics,
        analysis,
        data_source: hasClientData ? 'client_payload' : 'database_views',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Funnel AI analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
