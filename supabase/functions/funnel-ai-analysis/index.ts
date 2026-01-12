import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced prompt template for comprehensive funnel analysis
const ANALYSIS_PROMPT_TEMPLATE = `# PAPEL DA IA

Você é uma IA ANALISTA DESCRITIVA DE FUNIS DE VENDAS PERPÉTUOS (Cubo Mágico).

## Seu papel é:
- Interpretar TODOS os dados fornecidos em profundidade
- Explicar padrões de conversão por posição (FRONT, OB, UPSELL)
- Analisar performance de criativos/campanhas
- Identificar padrões de pagamento
- Avaliar retenção e LTV
- Identificar gargalos no funil de conversão

## Você NÃO deve:
- Recomendar ações prescritivas ("você deveria fazer X")
- Inventar causas não evidenciadas nos dados
- Criar métricas novas ou recalcular valores existentes
- Mascarar limitações dos dados

# REGRAS ABSOLUTAS (NÃO QUEBRAR)

1. NUNCA recalcular métricas - Use EXATAMENTE os valores fornecidos
2. NUNCA inventar números - Se algo não existir, mencione explicitamente
3. Use EXATAMENTE o health_status informado nos dados
4. CITE DADOS ESPECÍFICOS ao analisar (ex: "o orderbump X tem taxa de 53%")
5. COMPARE elementos similares (ex: "criativo A vs B")

# O QUE VOCÊ PODE FAZER

Você PODE e DEVE:
- Explicar o health_status do funil
- Identificar QUAL posição (FRONT, OB, US) performa melhor/pior
- Apontar os TOP 3 criativos por ROAS e explicar por quê
- Identificar o criativo com PIOR performance
- Analisar distribuição de pagamento (PIX vs cartão)
- Comentar sobre LTV e taxa de recompra
- Identificar gargalos no funil de conversão (onde perde mais leads)
- Comparar início vs fim do período

# DEFINIÇÕES DE MÉTRICAS (Dicionário Semântico)
{{METRIC_DEFINITIONS}}

# THRESHOLDS DE CLASSIFICAÇÃO
{{THRESHOLDS}}

# DADOS CONSOLIDADOS DO FUNIL
{{FUNNEL_DATA}}

# BREAKDOWN POR POSIÇÃO DO FUNIL
{{POSITION_BREAKDOWN}}

# TOP CAMPANHAS
{{TOP_CAMPAIGNS}}

# TOP CRIATIVOS
{{TOP_ADS}}

# DISTRIBUIÇÃO DE PAGAMENTOS
{{PAYMENT_DISTRIBUTION}}

# MÉTRICAS DE LTV E RETENÇÃO
{{LTV_METRICS}}

# FUNIL DE CONVERSÃO META
{{CONVERSION_FUNNEL}}

# HISTÓRICO DIÁRIO DO PERÍODO
{{DAILY_METRICS}}

# FORMATO DE RESPOSTA (OBRIGATÓRIO)

Responda EXATAMENTE neste JSON válido:

{
  "resumo_executivo": "Resumo claro e objetivo (3-5 frases) mencionando: receita total, ROAS, status de saúde, e 1-2 destaques principais.",
  "health_status": "excellent | good | attention | danger | no-return | inactive",
  "health_explanation": "Explicação detalhada do motivo deste status, citando CPA real vs máximo, ROAS vs alvo.",
  "analise_posicoes": {
    "resumo": "Visão geral do funil por posição (FRONT→OB→US)",
    "destaque_positivo": "Qual posição/produto converte melhor e por quê",
    "destaque_negativo": "Qual posição/produto precisa atenção e por quê"
  },
  "analise_criativos": {
    "top_performers": "Análise dos 3 melhores criativos com métricas específicas",
    "underperformers": "Análise dos criativos com baixo desempenho",
    "padrao_identificado": "Padrão observado (tipo de criativo, tema, etc) que funciona melhor"
  },
  "analise_pagamentos": {
    "distribuicao": "Como as vendas se dividem por método",
    "ticket_por_metodo": "Diferença de ticket médio entre métodos",
    "insight": "Insight sobre preferência do público"
  },
  "analise_ltv": {
    "taxa_recompra": "Análise da taxa de recompra",
    "concentracao_receita": "Análise da contribuição dos top 20%",
    "insight": "Insight sobre retenção/fidelização"
  },
  "funil_conversao": {
    "gargalo_principal": "Onde o funil perde mais leads (clique→landing, landing→checkout, checkout→compra)",
    "taxas": "Descrição das taxas de cada etapa",
    "insight": "Insight sobre otimização possível"
  },
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
      "tipo": "refund | chargeback | inatividade | criativo_saturado | ltv_baixo | outro",
      "descricao": "descrição objetiva do risco",
      "severidade": "baixa | media | alta"
    }
  ],
  "observacoes_adicionais": "Insights finais que conectam os diferentes aspectos analisados."
}

# TOM E LINGUAGEM

- Português brasileiro
- Linguagem executiva e clara
- Sempre cite números específicos (não "bom ROAS", mas "ROAS de 2.5")
- Foco em insights acionáveis através da descrição
- Sempre explicável para um gestor

# LEMBRETE FINAL

Esta IA é DESCRITIVA e ANALÍTICA. O sucesso dela é fornecer insights profundos baseados em TODOS os dados disponíveis.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      funnel_id, 
      start_date, 
      end_date, 
      client_summary, 
      client_daily,
      position_breakdown,
      top_campaigns,
      top_adsets,
      top_ads,
      payment_distribution,
      ltv_metrics,
      conversion_funnel,
      // Financial Core flags
      use_financial_core,
      financial_core_start_date,
      data_source,
    } = await req.json();

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

    // Check if we have comprehensive client-provided data
    const hasClientData = client_summary && typeof client_summary === 'object';
    const hasEnrichedData = hasClientData && position_breakdown && top_ads;
    const usingFinancialCore = use_financial_core === true || data_source === 'financial_core';
    
    console.log(`[FunnelAI] Analysis mode: ${hasEnrichedData ? 'ENRICHED_PAYLOAD' : hasClientData ? 'BASIC_PAYLOAD' : 'DATABASE_VIEWS'}`);
    console.log(`[FunnelAI] Financial Core: ${usingFinancialCore ? 'YES' : 'NO'}, Core start date: ${financial_core_start_date || 'not specified'}`);
    
    if (hasEnrichedData) {
      console.log(`[FunnelAI] Enriched data: ${position_breakdown?.length || 0} positions, ${top_campaigns?.length || 0} campaigns, ${top_ads?.length || 0} ads`);
    }

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

    const formatPercent = (v: any) => {
      const n = toNumber(v);
      if (n === null) return "N/A";
      return `${n.toFixed(1)}%`;
    };

    // Date range
    const endDateParam = end_date || new Date().toISOString().split("T")[0];
    const startDateParam =
      start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Build all data sections based on data source
    let funnelDataText: string;
    let dailyMetricsText: string;
    let positionBreakdownText: string;
    let topCampaignsText: string;
    let topAdsText: string;
    let paymentDistributionText: string;
    let ltvMetricsText: string;
    let conversionFunnelText: string;
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

      // Position breakdown
      if (position_breakdown && Array.isArray(position_breakdown) && position_breakdown.length > 0) {
        positionBreakdownText = position_breakdown.map((p: any) => {
          const produtosList = p.produtos?.map((prod: any) => 
            `    - ${prod.nome_produto}: ${prod.vendas} vendas, ${formatBRL(prod.receita)}`
          ).join('\n') || '';
          return `${p.tipo} (ordem ${p.ordem}): ${p.vendas} vendas, ${formatBRL(p.receita)}, taxa conversão: ${formatPercent(p.taxaConversao)}\n${produtosList}`;
        }).join('\n\n');
      } else {
        positionBreakdownText = "Dados de posição não fornecidos";
      }

      // Top campaigns
      if (top_campaigns && Array.isArray(top_campaigns) && top_campaigns.length > 0) {
        topCampaignsText = top_campaigns.slice(0, 10).map((c: any, idx: number) => 
          `${idx + 1}. ${c.name} | Gasto: ${formatBRL(c.spend)} | ROAS: ${c.roas?.toFixed(2) || 'N/A'} | CTR: ${formatPercent(c.ctr)} | Status: ${c.status || 'N/A'}`
        ).join('\n');
      } else {
        topCampaignsText = "Dados de campanhas não fornecidos";
      }

      // Top ads (creatives)
      if (top_ads && Array.isArray(top_ads) && top_ads.length > 0) {
        topAdsText = top_ads.slice(0, 15).map((a: any, idx: number) => 
          `${idx + 1}. ${a.name} | Gasto: ${formatBRL(a.spend)} | ROAS: ${a.roas?.toFixed(2) || 'N/A'} | CPC: ${formatBRL(a.cpc)} | CTR: ${formatPercent(a.ctr)}`
        ).join('\n');
      } else {
        topAdsText = "Dados de criativos não fornecidos";
      }

      // Payment distribution
      if (payment_distribution && Array.isArray(payment_distribution) && payment_distribution.length > 0) {
        paymentDistributionText = payment_distribution.map((p: any) => 
          `${p.method}: ${p.sales} vendas (${formatPercent(p.percentage)}), Receita: ${formatBRL(p.revenue)}, Ticket Médio: ${formatBRL(p.avg_ticket)}${p.avg_installments ? `, Parcelas médias: ${p.avg_installments.toFixed(1)}` : ''}`
        ).join('\n');
      } else {
        paymentDistributionText = "Dados de pagamento não fornecidos";
      }

      // LTV metrics
      if (ltv_metrics && typeof ltv_metrics === 'object') {
        ltvMetricsText = `
Total de clientes: ${ltv_metrics.total_customers || 0}
LTV médio: ${formatBRL(ltv_metrics.avg_ltv)}
Taxa de recompra: ${formatPercent(ltv_metrics.repeat_rate)}
Compras por cliente: ${ltv_metrics.avg_purchases_per_customer?.toFixed(2) || 'N/A'}
Contribuição top 20%: ${formatPercent(ltv_metrics.top_20_contribution)}
        `.trim();
      } else {
        ltvMetricsText = "Dados de LTV não fornecidos";
      }

      // Conversion funnel
      if (conversion_funnel && typeof conversion_funnel === 'object') {
        conversionFunnelText = `
Link Clicks: ${conversion_funnel.link_clicks || 0}
Landing Page Views: ${conversion_funnel.landing_page_views || 0} (Connect Rate: ${formatPercent(conversion_funnel.connect_rate)})
Initiate Checkouts: ${conversion_funnel.initiate_checkouts || 0} (Taxa página→checkout: ${formatPercent(conversion_funnel.tx_pagina_checkout)})
Purchases: ${conversion_funnel.purchases || 0} (Taxa checkout→compra: ${formatPercent(conversion_funnel.tx_checkout_compra)})
        `.trim();
      } else {
        conversionFunnelText = "Dados de funil de conversão não fornecidos";
      }

      // Daily metrics
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

      // Set defaults for enriched data when using DB fallback
      positionBreakdownText = "Dados de posição não disponíveis (modo DB)";
      topCampaignsText = "Dados de campanhas não disponíveis (modo DB)";
      topAdsText = "Dados de criativos não disponíveis (modo DB)";
      paymentDistributionText = "Dados de pagamento não disponíveis (modo DB)";
      ltvMetricsText = "Dados de LTV não disponíveis (modo DB)";
      conversionFunnelText = "Dados de funil de conversão não disponíveis (modo DB)";

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

    // Build final prompt with all data sections
    const finalPrompt = ANALYSIS_PROMPT_TEMPLATE
      .replace("{{METRIC_DEFINITIONS}}", metricDefsText || "Nenhuma definição encontrada")
      .replace("{{THRESHOLDS}}", thresholdsText || "Nenhum threshold encontrado")
      .replace("{{FUNNEL_DATA}}", funnelDataText)
      .replace("{{POSITION_BREAKDOWN}}", positionBreakdownText)
      .replace("{{TOP_CAMPAIGNS}}", topCampaignsText)
      .replace("{{TOP_ADS}}", topAdsText)
      .replace("{{PAYMENT_DISTRIBUTION}}", paymentDistributionText)
      .replace("{{LTV_METRICS}}", ltvMetricsText)
      .replace("{{CONVERSION_FUNNEL}}", conversionFunnelText)
      .replace("{{DAILY_METRICS}}", dailyMetricsText || "Sem dados diários disponíveis");

    console.log("[FunnelAI] Calling Lovable AI with enriched prompt...");

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
            content: "Você é uma IA analista descritiva de funis de vendas. Seu papel é interpretar e explicar dados já calculados com profundidade. NUNCA recalcule métricas, NUNCA faça recomendações prescritivas, NUNCA invente números. SEMPRE cite dados específicos. Responda SEMPRE em JSON válido seguindo exatamente o formato solicitado." 
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

    const resolvedDataSource = usingFinancialCore ? 'financial_core' : (hasEnrichedData ? 'enriched_payload' : hasClientData ? 'basic_payload' : 'database_views');
    console.log("[FunnelAI] Analysis complete, data_source:", resolvedDataSource);
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
        data_source: resolvedDataSource,
        financial_core: usingFinancialCore,
        financial_core_start_date: financial_core_start_date || null,
        data_summary: hasEnrichedData ? {
          positions: position_breakdown?.length || 0,
          campaigns: top_campaigns?.length || 0,
          ads: top_ads?.length || 0,
          payment_methods: payment_distribution?.length || 0,
        } : null,
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
