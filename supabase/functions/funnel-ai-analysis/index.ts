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
3. NUNCA usar dados fora das views canônicas - Não inferir dados de outras fontes
4. NUNCA fazer recomendações - Nada de "deveria", "sugiro", "recomendo"
5. NUNCA mascarar limitações - Se um dado estiver ausente ou inconsistente, mencione

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

# DADOS CONSOLIDADOS DO FUNIL (funnel_summary)
{{FUNNEL_DATA}}

# HISTÓRICO DIÁRIO DO PERÍODO (funnel_metrics_daily)
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
    const { funnel_id, start_date, end_date } = await req.json();

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

    // Helpers to avoid numeric/string surprises (PostgREST can return numerics as strings)
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

    // 2. Fetch funnel summary from canonical view (NO fallback, NO recalculation)
    const summarySelect = [
      "project_id",
      "funnel_id",
      "funnel_name",
      "funnel_type",
      "roas_target",
      "first_sale_date",
      "last_sale_date",
      "total_investment",
      "total_gross_revenue",
      "total_confirmed_sales",
      "total_front_sales",
      "total_refunds",
      "total_chargebacks",
      "overall_roas",
      "overall_cpa",
      "overall_avg_ticket",
      "overall_refund_rate",
      "overall_chargeback_rate",
      "health_status",
    ].join(",");

    const { data: funnelSummary, error: summaryError } = await supabase
      .from("funnel_summary")
      .select(summarySelect)
      .eq("funnel_id", funnel_id)
      .maybeSingle();

    if (summaryError) {
      console.error("Error fetching funnel_summary:", summaryError);

      const isTimeout = summaryError.code === "57014" || summaryError.message?.includes("statement timeout");
      return new Response(
        JSON.stringify({
          error: isTimeout
            ? "Tempo limite ao consultar o resumo do funil. Tente novamente."
            : "Erro ao consultar o resumo do funil.",
          details: summaryError.message,
        }),
        { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!funnelSummary) {
      return new Response(
        JSON.stringify({ error: "Resumo do funil não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Date range
    const endDateParam = end_date || new Date().toISOString().split("T")[0];
    const startDateParam =
      start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 4. Fetch daily metrics from canonical view (best-effort)
    const dailySelect = [
      "metric_date",
      "investment",
      "confirmed_sales",
      "front_sales",
      "refunds",
      "chargebacks",
      "unique_buyers",
      "gross_revenue",
      "net_revenue",
      "avg_ticket",
      "roas",
      "cpa_real",
      "refund_rate",
      "chargeback_rate",
    ].join(",");

    let dailyMetrics: any[] | null = null;
    const { data: dailyData, error: dailyError } = await supabase
      .from("funnel_metrics_daily")
      .select(dailySelect)
      .eq("funnel_id", funnel_id)
      .gte("metric_date", startDateParam)
      .lte("metric_date", endDateParam)
      .order("metric_date", { ascending: false })
      .limit(60);

    if (dailyError) {
      console.error("Error fetching funnel_metrics_daily:", dailyError);
      const isTimeout = dailyError.code === "57014" || dailyError.message?.includes("statement timeout");
      dailyMetrics = isTimeout ? null : (dailyData || null);
    } else {
      dailyMetrics = dailyData || [];
    }

    // 5. Fetch metric definitions
    const { data: metricDefinitions, error: defError } = await supabase
      .from("metric_definitions")
      .select("metric_key, metric_name, description, formula, unit, category, display_order")
      .order("display_order", { ascending: true });

    if (defError) {
      console.error("Error fetching metric_definitions:", defError);
    }

    // 6. Fetch thresholds
    const { data: thresholds, error: thresholdError } = await supabase
      .from("funnel_thresholds")
      .select("threshold_key, threshold_value, category, description, project_id")
      .or(`project_id.is.null,project_id.eq.${funnelSummary.project_id}`);

    if (thresholdError) {
      console.error("Error fetching funnel_thresholds:", thresholdError);
    }

    // 7. Format data for prompt
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

    const funnelDataText = JSON.stringify(funnelSummary, null, 2);

    const dailyMetricsText =
      dailyMetrics === null
        ? "Sem dados diários disponíveis (timeout na view funnel_metrics_daily)"
        : (dailyMetrics || [])
            .slice(0, 30)
            .map((d: any) => {
              const roas = toNumber(d.roas);
              const roasStr = roas === null ? "N/A" : roas.toFixed(2);
              return `${d.metric_date}: vendas_confirmadas=${d.confirmed_sales ?? "N/A"}, receita_bruta=${formatBRL(d.gross_revenue)}, investimento=${formatBRL(d.investment)}, ROAS=${roasStr}`;
            })
            .join("\n");

    // 8. Build final prompt
    const finalPrompt = ANALYSIS_PROMPT_TEMPLATE
      .replace("{{METRIC_DEFINITIONS}}", metricDefsText || "Nenhuma definição encontrada")
      .replace("{{THRESHOLDS}}", thresholdsText || "Nenhum threshold encontrado")
      .replace("{{FUNNEL_DATA}}", funnelDataText)
      .replace("{{DAILY_METRICS}}", dailyMetricsText || "Sem dados diários disponíveis");

    console.log("Calling Lovable AI for funnel analysis...");

    // 7. Call Lovable AI
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

    // 8. Parse AI response (extract JSON from markdown if needed)
    let analysis;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw AI content:", aiContent);
      
      // Return raw content if parsing fails
      analysis = {
        resumo_executivo: aiContent,
        parse_error: true,
        raw_response: aiContent,
      };
    }

    const currentMetrics = {
      health_status: funnelSummary.health_status,
      total_revenue: toNumber(funnelSummary.total_gross_revenue) ?? 0,
      total_investment: toNumber(funnelSummary.total_investment) ?? 0,
      roas: toNumber(funnelSummary.overall_roas) ?? 0,
      total_sales: toNumber(funnelSummary.total_confirmed_sales) ?? 0,
    };

    // 9. Return structured response
    return new Response(
      JSON.stringify({
        success: true,
        funnel_id,
        funnel_name: funnelSummary.funnel_name || funnel.name,
        analysis_date: new Date().toISOString(),
        period: {
          start: startDateParam,
          end: endDateParam,
        },
        current_metrics: currentMetrics,
        analysis,
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
