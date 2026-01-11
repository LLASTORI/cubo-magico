import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types for the Cognitive Quiz Architect
interface InterviewAnswers {
  objective: string;
  objectiveDetail?: string;
  funnelPosition: string;
  persona: {
    demographics?: string;
    painPoints?: string;
    objections?: string;
  };
  postQuizDecision: string[];
  quizLength: string;
  businessContext: {
    ticketSize?: string;
    emotionalVsRational?: string;
    urgency?: string;
  };
  additionalContext?: string;
}

interface DesignRationale {
  questionCount: number;
  cognitiveDimensions: string[];
  outcomeCount: number;
  flowType: string;
  primarySignals: string[];
  secondarySignals: string[];
  explanation: string;
}

interface GeneratedQuestion {
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'text';
  title: string;
  subtitle?: string;
  purpose: string;
  isRequired: boolean;
  order: number;
  weight: number;
  traitsImpact: Record<string, number>;
  intentsImpact: Record<string, number>;
  options?: GeneratedOption[];
}

interface GeneratedOption {
  label: string;
  value: string;
  traitsVector: Record<string, number>;
  intentVector: Record<string, number>;
  weight: number;
}

interface GeneratedOutcome {
  name: string;
  description: string;
  priority: number;
  conditions: OutcomeCondition[];
  actions: OutcomeAction[];
}

interface OutcomeCondition {
  type: string;
  field: string;
  operator: string;
  value: any;
  group?: number;
}

interface OutcomeAction {
  type: string;
  config: Record<string, any>;
}

interface QuizArchitecture {
  name: string;
  description: string;
  type: string;
  questions: GeneratedQuestion[];
  outcomes: GeneratedOutcome[];
  designRationale: DesignRationale;
  validation: ValidationReport;
}

interface ValidationReport {
  overallScore: number;
  isStrong: boolean;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  metrics: {
    coverageScore: number;
    signalQuality: number;
    discriminationPower: number;
    ambiguityRisk: number;
    outcomeDistinguishability: number;
  };
}

// System prompts for the AI
const INTERVIEW_ANALYSIS_PROMPT = `Você é um Arquiteto Cognitivo de Quizzes. Sua função é analisar as respostas da entrevista e criar uma estratégia de design de quiz.

Analise as respostas e retorne um JSON com a estrutura:
{
  "questionCount": número (baseado no tamanho escolhido),
  "cognitiveDimensions": ["lista de dimensões cognitivas a medir"],
  "outcomeCount": número de outcomes sugeridos,
  "flowType": "linear" ou "adaptive",
  "primarySignals": ["sinais principais a capturar"],
  "secondarySignals": ["sinais secundários"],
  "explanation": "explicação detalhada da estratégia"
}

Dimensões cognitivas possíveis:
- analytical, emotional, impulsive, methodical, social, autonomous, risk_taker, conservative
- purchase, learn, compare, support, churn, upgrade, refer

Considere:
- O objetivo principal e posição no funil
- O perfil da persona e suas dores
- As decisões que serão tomadas pós-quiz
- O contexto do negócio (ticket, emocional vs racional, urgência)`;

const QUIZ_GENERATION_PROMPT = `Você é um Arquiteto Cognitivo de Quizzes especialista. Gere um quiz COMPLETO e REAL baseado na análise.

REGRAS CRÍTICAS:
1. Gere perguntas REAIS com textos significativos (não placeholders)
2. Cada opção deve ter vetores de traços e intenções calculados
3. Os outcomes devem ter condições lógicas baseadas nos vetores
4. O quiz deve ser usável imediatamente, sem edição manual

Retorne um JSON com a estrutura:
{
  "name": "nome do quiz",
  "description": "descrição detalhada",
  "type": "lead|qualification|funnel|onboarding|entertainment|viral|research",
  "questions": [
    {
      "type": "single_choice|multiple_choice|scale|text",
      "title": "texto da pergunta",
      "subtitle": "subtítulo opcional",
      "purpose": "intent_signal|objection_detection|urgency_measure|profile_trait|context_gather|pain_point_discovery|awareness_level|trust_signal|decision_factor",
      "isRequired": true/false,
      "order": número,
      "weight": número (1.0-2.0),
      "traitsImpact": {"trait": valor},
      "intentsImpact": {"intent": valor},
      "options": [
        {
          "label": "texto da opção",
          "value": "valor_unico",
          "traitsVector": {"trait": valor entre -1 e 1},
          "intentVector": {"intent": valor entre -1 e 1},
          "weight": número
        }
      ]
    }
  ],
  "outcomes": [
    {
      "name": "nome do outcome",
      "description": "descrição",
      "priority": número (maior = mais importante),
      "conditions": [
        {
          "type": "intent_score|trait_score|vector_threshold|specific_answer",
          "field": "nome do campo",
          "operator": ">=|<=|==|>|<",
          "value": valor,
          "group": número (para agrupamento OR)
        }
      ],
      "actions": [
        {
          "type": "tag|redirect|webhook|show_content|pipeline_stage",
          "config": {}
        }
      ]
    }
  ]
}

Traços disponíveis: analytical, emotional, impulsive, methodical, social, autonomous, risk_taker, conservative
Intenções disponíveis: purchase, learn, compare, support, churn, upgrade, refer

IMPORTANTE: 
- Valores de vetores devem estar entre -1 e 1
- Cada pergunta deve contribuir para pelo menos uma dimensão
- Os outcomes devem ser mutuamente exclusivos quando possível
- Gere copy real e profissional em português brasileiro`;

const VALIDATION_PROMPT = `Você é um auditor de qualidade de quizzes cognitivos. Analise o quiz gerado e identifique:

1. Cobertura: Todas as dimensões necessárias estão sendo medidas?
2. Qualidade do sinal: As perguntas produzem sinais fortes e distintos?
3. Poder de discriminação: É possível diferenciar claramente os perfis?
4. Ambiguidade: Há perguntas ou opções confusas?
5. Distinguibilidade de outcomes: Os outcomes são claramente diferentes?

Retorne um JSON com:
{
  "overallScore": número de 0-100,
  "isStrong": true/false,
  "strengths": ["lista de pontos fortes"],
  "weaknesses": ["lista de fraquezas"],
  "recommendations": ["lista de recomendações de melhoria"],
  "metrics": {
    "coverageScore": 0-100,
    "signalQuality": 0-100,
    "discriminationPower": 0-100,
    "ambiguityRisk": 0-100 (menor é melhor),
    "outcomeDistinguishability": 0-100
  }
}`;

const REFINEMENT_PROMPT = `Você é um Arquiteto Cognitivo de Quizzes. O usuário pediu para refinar o quiz.

Considerando o pedido do usuário, ajuste o quiz mantendo a mesma estrutura JSON mas:
- Implementando as mudanças solicitadas
- Mantendo a coerência cognitiva
- Preservando os vetores e outcomes válidos
- Recalculando pesos e vetores se necessário

Retorne o quiz completo atualizado no mesmo formato JSON.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { action, data } = await req.json();
    console.log(`[quiz-copilot] Action: ${action}`);

    switch (action) {
      case "analyzeInterview": {
        const interview = data.interview as InterviewAnswers;
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: INTERVIEW_ANALYSIS_PROMPT },
              { 
                role: "user", 
                content: `Analise esta entrevista e crie a estratégia de design:\n\n${JSON.stringify(interview, null, 2)}` 
              }
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[quiz-copilot] AI error:", response.status, errorText);
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content || "";
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Failed to parse AI response");
        }
        
        const designRationale = JSON.parse(jsonMatch[0]) as DesignRationale;
        
        return new Response(JSON.stringify({ designRationale }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "generateQuiz": {
        const { interview, designRationale } = data;
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: QUIZ_GENERATION_PROMPT },
              { 
                role: "user", 
                content: `Gere um quiz completo baseado nesta análise:

ENTREVISTA:
${JSON.stringify(interview, null, 2)}

ESTRATÉGIA DE DESIGN:
${JSON.stringify(designRationale, null, 2)}

Gere ${designRationale.questionCount} perguntas focando nas dimensões: ${designRationale.cognitiveDimensions.join(', ')}
Sinais primários: ${designRationale.primarySignals.join(', ')}
Sinais secundários: ${designRationale.secondarySignals.join(', ')}
Tipo de fluxo: ${designRationale.flowType}
Número de outcomes: ${designRationale.outcomeCount}` 
              }
            ],
            temperature: 0.8,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[quiz-copilot] AI error:", response.status, errorText);
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content || "";
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error("[quiz-copilot] Failed to parse quiz JSON:", content);
          throw new Error("Failed to parse quiz from AI response");
        }
        
        const quizData = JSON.parse(jsonMatch[0]);
        
        return new Response(JSON.stringify({ quiz: quizData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "validateQuiz": {
        const { quiz, interview, designRationale } = data;
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: VALIDATION_PROMPT },
              { 
                role: "user", 
                content: `Valide este quiz:

QUIZ GERADO:
${JSON.stringify(quiz, null, 2)}

OBJETIVO ORIGINAL:
${JSON.stringify(interview, null, 2)}

ESTRATÉGIA DE DESIGN:
${JSON.stringify(designRationale, null, 2)}` 
              }
            ],
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[quiz-copilot] AI error:", response.status, errorText);
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Failed to parse validation from AI response");
        }
        
        const validation = JSON.parse(jsonMatch[0]) as ValidationReport;
        
        return new Response(JSON.stringify({ validation }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "refineQuiz": {
        const { quiz, refinementRequest, interview, designRationale } = data;
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: REFINEMENT_PROMPT },
              { 
                role: "user", 
                content: `O usuário pediu: "${refinementRequest}"

QUIZ ATUAL:
${JSON.stringify(quiz, null, 2)}

CONTEXTO ORIGINAL:
${JSON.stringify(interview, null, 2)}

ESTRATÉGIA:
${JSON.stringify(designRationale, null, 2)}

Refine o quiz conforme solicitado e retorne o JSON completo atualizado.` 
              }
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[quiz-copilot] AI error:", response.status, errorText);
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Failed to parse refined quiz from AI response");
        }
        
        const refinedQuiz = JSON.parse(jsonMatch[0]);
        
        return new Response(JSON.stringify({ quiz: refinedQuiz }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("[quiz-copilot] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
