import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SurveyResponse {
  id: string;
  survey_id: string;
  project_id: string;
  contact_id: string | null;
  answers: Record<string, any>;
  created_at: string;
}

interface KnowledgeBase {
  business_name: string | null;
  business_description: string | null;
  products_services: string | null;
  high_intent_indicators: string | null;
  pain_point_indicators: string | null;
  satisfaction_indicators: string | null;
  objection_patterns: string | null;
  high_intent_keywords: string[];
  pain_keywords: string[];
  satisfaction_keywords: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, projectId, surveyId, limit = 50 } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "process") {
      // Get knowledge base for context
      const { data: kb } = await supabase
        .from("survey_ai_knowledge_base")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      // Get unprocessed responses
      let query = supabase
        .from("survey_responses")
        .select(`
          id,
          survey_id,
          project_id,
          contact_id,
          answers,
          created_at,
          surveys!inner(name)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (surveyId) {
        query = query.eq("survey_id", surveyId);
      }

      const { data: responses, error: responsesError } = await query;

      if (responsesError) {
        console.error("Error fetching responses:", responsesError);
        throw responsesError;
      }

      // Check which responses are already analyzed
      const responseIds = responses?.map((r) => r.id) || [];
      const { data: existingAnalyses } = await supabase
        .from("survey_response_analysis")
        .select("response_id")
        .in("response_id", responseIds);

      const analyzedIds = new Set(existingAnalyses?.map((a) => a.response_id) || []);
      const unanalyzedResponses = responses?.filter((r) => !analyzedIds.has(r.id)) || [];

      if (unanalyzedResponses.length === 0) {
        return new Response(
          JSON.stringify({ message: "No new responses to process", processed: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Process each response with AI
      const analyses = await Promise.all(
        unanalyzedResponses.slice(0, 20).map((response: any) => analyzeResponse(response, kb))
      );

      // Insert analyses
      const validAnalyses = analyses.filter((a) => a !== null);
      if (validAnalyses.length > 0) {
        const { error: insertError } = await supabase
          .from("survey_response_analysis")
          .insert(validAnalyses);

        if (insertError) {
          console.error("Error inserting analyses:", insertError);
          throw insertError;
        }
      }

      return new Response(
        JSON.stringify({ 
          message: "Responses processed successfully", 
          processed: validAnalyses.length,
          total: unanalyzedResponses.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in survey-ai-analysis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function analyzeResponse(
  response: any,
  kb: KnowledgeBase | null
): Promise<any | null> {
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return createFallbackAnalysis(response, kb);
  }

  try {
    const answersText = formatAnswers(response.answers);
    
    const systemPrompt = buildSystemPrompt(kb);
    const userPrompt = `Analise as seguintes respostas de uma pesquisa chamada "${response.surveys?.name || 'Pesquisa'}":

${answersText}

Responda no seguinte formato JSON:
{
  "classification": "high_intent" | "pain_point" | "price_objection" | "confusion" | "feature_request" | "satisfaction" | "neutral",
  "sentiment": "positive" | "neutral" | "negative",
  "intent_score": número de 0 a 100,
  "summary": "resumo curto da resposta em até 50 palavras",
  "keywords": ["palavras-chave", "detectadas"],
  "insights": ["insight 1", "insight 2"]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      return createFallbackAnalysis(response, kb);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return createFallbackAnalysis(response, kb);
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createFallbackAnalysis(response, kb);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      response_id: response.id,
      project_id: response.project_id,
      survey_id: response.survey_id,
      contact_id: response.contact_id,
      classification: parsed.classification || "neutral",
      sentiment: parsed.sentiment || "neutral",
      intent_score: Math.min(100, Math.max(0, parseInt(parsed.intent_score) || 50)),
      ai_summary: parsed.summary || null,
      key_insights: parsed.insights || [],
      detected_keywords: parsed.keywords || [],
      processed_at: new Date().toISOString(),
      processed_by: "google/gemini-2.5-flash",
    };
  } catch (error) {
    console.error("Error analyzing response:", error);
    return createFallbackAnalysis(response, kb);
  }
}

function buildSystemPrompt(kb: KnowledgeBase | null): string {
  let prompt = `Você é um analista especializado em classificar respostas de pesquisas para identificar intenção de compra, dores do cliente, satisfação e oportunidades comerciais.

Classificações disponíveis:
- high_intent: Alta intenção de compra, interesse claro em adquirir
- pain_point: Dor ou frustração do cliente, problema que precisa resolver
- price_objection: Objeção relacionada a preço ou valor
- confusion: Dúvida ou confusão sobre o produto/serviço
- feature_request: Pedido de funcionalidade ou melhoria
- satisfaction: Satisfação, elogio, feedback positivo
- neutral: Resposta informativa sem emoção clara

O Intent Score (0-100) indica a probabilidade de conversão:
- 70-100: Lead quente, alta probabilidade
- 40-69: Lead morno, interesse moderado
- 0-39: Lead frio, baixa probabilidade`;

  if (kb) {
    if (kb.business_name || kb.business_description) {
      prompt += `\n\nContexto do negócio:
- Empresa: ${kb.business_name || "Não informado"}
- Descrição: ${kb.business_description || "Não informado"}
- Produtos/Serviços: ${kb.products_services || "Não informado"}`;
    }

    if (kb.high_intent_indicators) {
      prompt += `\n\nIndicadores de Alta Intenção: ${kb.high_intent_indicators}`;
    }
    if (kb.pain_point_indicators) {
      prompt += `\nIndicadores de Dor: ${kb.pain_point_indicators}`;
    }
    if (kb.satisfaction_indicators) {
      prompt += `\nIndicadores de Satisfação: ${kb.satisfaction_indicators}`;
    }
    if (kb.objection_patterns) {
      prompt += `\nPadrões de Objeção: ${kb.objection_patterns}`;
    }

    if (kb.high_intent_keywords?.length) {
      prompt += `\n\nPalavras de alta intenção: ${kb.high_intent_keywords.join(", ")}`;
    }
    if (kb.pain_keywords?.length) {
      prompt += `\nPalavras de dor: ${kb.pain_keywords.join(", ")}`;
    }
  }

  prompt += `\n\nResponda APENAS com o JSON solicitado, sem texto adicional.`;

  return prompt;
}

function formatAnswers(answers: Record<string, any>): string {
  if (!answers || typeof answers !== "object") {
    return "Sem respostas";
  }

  return Object.entries(answers)
    .map(([key, value]) => {
      const formattedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return `- ${key}: ${formattedValue}`;
    })
    .join("\n");
}

function createFallbackAnalysis(
  response: SurveyResponse,
  kb: KnowledgeBase | null
): any {
  const answersText = formatAnswers(response.answers).toLowerCase();
  
  // Simple keyword-based classification
  let classification = "neutral";
  let sentiment = "neutral";
  let intentScore = 50;

  const highIntentWords = kb?.high_intent_keywords || ["comprar", "preço", "quanto custa", "quero", "preciso"];
  const painWords = kb?.pain_keywords || ["problema", "frustrado", "difícil", "não funciona", "ruim"];
  const satisfactionWords = kb?.satisfaction_keywords || ["ótimo", "excelente", "adorei", "perfeito", "recomendo"];

  if (highIntentWords.some((w) => answersText.includes(w))) {
    classification = "high_intent";
    intentScore = 75;
  } else if (painWords.some((w) => answersText.includes(w))) {
    classification = "pain_point";
    sentiment = "negative";
    intentScore = 60;
  } else if (satisfactionWords.some((w) => answersText.includes(w))) {
    classification = "satisfaction";
    sentiment = "positive";
    intentScore = 40;
  }

  return {
    response_id: response.id,
    project_id: response.project_id,
    survey_id: response.survey_id,
    contact_id: response.contact_id,
    classification,
    sentiment,
    intent_score: intentScore,
    ai_summary: null,
    key_insights: [],
    detected_keywords: [],
    processed_at: new Date().toISOString(),
    processed_by: "fallback-keywords",
  };
}
