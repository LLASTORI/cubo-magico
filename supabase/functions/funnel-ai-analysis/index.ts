import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base prompt template for funnel analysis
const ANALYSIS_PROMPT_TEMPLATE = `Você é um analista de marketing digital especializado em funis de vendas perpétuos.

## Sua Função
Analisar dados de performance de funis e fornecer insights acionáveis em português brasileiro.

## Regras Fundamentais
1. NUNCA invente números - use APENAS os dados fornecidos
2. NUNCA recalcule métricas - elas já estão prontas
3. SEMPRE explique o "porquê" por trás do status de saúde
4. Seja direto e objetivo, mas completo

## Definições de Métricas
{{METRIC_DEFINITIONS}}

## Thresholds de Performance
{{THRESHOLDS}}

## Dados do Funil
{{FUNNEL_DATA}}

## Histórico Recente (últimos 30 dias)
{{DAILY_METRICS}}

## Formato de Resposta Obrigatório
Responda EXATAMENTE neste formato JSON:

{
  "resumo_executivo": "Parágrafo de 2-3 frases resumindo a situação atual do funil",
  "health_status": "green|yellow|red",
  "health_explanation": "Explicação detalhada do porquê deste status",
  "pontos_fortes": [
    {"metrica": "nome", "valor": "X%", "explicacao": "por que é positivo"}
  ],
  "pontos_atencao": [
    {"metrica": "nome", "valor": "X%", "explicacao": "por que precisa atenção", "impacto": "qual o risco"}
  ],
  "mudancas_periodo": [
    {"tipo": "melhoria|piora|estavel", "descricao": "o que mudou e quando"}
  ],
  "alertas_risco": [
    {"tipo": "chargeback|refund|inatividade|outro", "descricao": "detalhes do risco", "severidade": "baixa|media|alta"}
  ],
  "observacoes_adicionais": "Qualquer insight relevante não coberto acima"
}`;

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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch funnel summary
    const { data: funnelSummary, error: summaryError } = await supabase
      .from("funnel_summary")
      .select("*")
      .eq("funnel_id", funnel_id)
      .single();

    if (summaryError) {
      console.error("Error fetching funnel_summary:", summaryError);
      return new Response(
        JSON.stringify({ error: "Funil não encontrado", details: summaryError.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch daily metrics (last 30 days or custom range)
    const endDateParam = end_date || new Date().toISOString().split("T")[0];
    const startDateParam = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: dailyMetrics, error: dailyError } = await supabase
      .from("funnel_metrics_daily")
      .select("*")
      .eq("funnel_id", funnel_id)
      .gte("metric_date", startDateParam)
      .lte("metric_date", endDateParam)
      .order("metric_date", { ascending: false });

    if (dailyError) {
      console.error("Error fetching funnel_metrics_daily:", dailyError);
    }

    // 3. Fetch metric definitions
    const { data: metricDefinitions, error: defError } = await supabase
      .from("metric_definitions")
      .select("*")
      .eq("is_active", true);

    if (defError) {
      console.error("Error fetching metric_definitions:", defError);
    }

    // 4. Fetch thresholds
    const { data: thresholds, error: thresholdError } = await supabase
      .from("funnel_thresholds")
      .select("*")
      .or(`project_id.is.null,project_id.eq.${funnelSummary.project_id}`);

    if (thresholdError) {
      console.error("Error fetching funnel_thresholds:", thresholdError);
    }

    // 5. Format data for prompt
    const metricDefsText = (metricDefinitions || [])
      .map((m: any) => `- ${m.metric_key}: ${m.display_name} - ${m.description}. Fórmula: ${m.formula || "N/A"}`)
      .join("\n");

    const thresholdsText = (thresholds || [])
      .map((t: any) => `- ${t.threshold_key}: ${t.threshold_value} (${t.category}) - ${t.description || ""}`)
      .join("\n");

    const funnelDataText = JSON.stringify(funnelSummary, null, 2);

    const dailyMetricsText = (dailyMetrics || [])
      .slice(0, 30) // Limit to 30 days
      .map((d: any) => `${d.metric_date}: vendas=${d.total_sales}, receita=${d.total_revenue}, invest=${d.total_investment}, ROAS=${d.roas?.toFixed(2) || "N/A"}`)
      .join("\n");

    // 6. Build final prompt
    const finalPrompt = ANALYSIS_PROMPT_TEMPLATE
      .replace("{{METRIC_DEFINITIONS}}", metricDefsText || "Nenhuma definição encontrada")
      .replace("{{THRESHOLDS}}", thresholdsText || "Usando thresholds padrão")
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
          { role: "system", content: "Você é um analista de dados especializado. Responda SEMPRE em JSON válido." },
          { role: "user", content: finalPrompt },
        ],
        temperature: 0.3,
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

    // 9. Return structured response
    return new Response(
      JSON.stringify({
        success: true,
        funnel_id,
        funnel_name: funnelSummary.funnel_name,
        analysis_date: new Date().toISOString(),
        period: {
          start: startDateParam,
          end: endDateParam,
        },
        current_metrics: {
          health_status: funnelSummary.health_status,
          total_revenue: funnelSummary.total_revenue,
          total_investment: funnelSummary.total_investment,
          roas: funnelSummary.roas,
          total_sales: funnelSummary.total_sales,
        },
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
