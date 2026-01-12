import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { 
  interpretProfile, 
  getSemanticLabel,
  INTENT_LABELS,
  TRAIT_LABELS 
} from "@/lib/semanticProfileEngine";

// Audience profile distribution
export interface ProfileDistribution {
  name: string;
  count: number;
  percentage: number;
}

// Trait/Intent distribution with human labels
export interface DimensionDistribution {
  key: string;
  label: string;
  count: number;
  percentage: number;
  avgValue: number;
}

// Aggregated vectors
export interface AggregatedVectors {
  traits: Record<string, number>;
  intents: Record<string, number>;
}

// Language insights
export interface LanguageInsights {
  dominantStyle: string;
  keywords: string[];
  toneRecommendation: string;
}

// Copy suggestions
export interface CopySuggestion {
  type: 'headline' | 'promise' | 'angle' | 'pain' | 'desire';
  text: string;
  targetProfile?: string;
}

// Main audience intelligence interface
export interface AudienceIntelligence {
  totalResponses: number;
  completedResponses: number;
  identifiedLeads: number;
  avgScore: number;
  
  // Profile distributions
  semanticProfiles: ProfileDistribution[];
  decisionStyles: ProfileDistribution[];
  
  // Dimension distributions (normalized)
  traitDistribution: DimensionDistribution[];
  intentDistribution: DimensionDistribution[];
  
  // Aggregated normalized vectors (for AI)
  aggregatedVectors: AggregatedVectors;
  
  // Insights
  dominantPain: string;
  dominantDesire: string;
  languageInsights: LanguageInsights;
  
  // Copy suggestions
  copySuggestions: CopySuggestion[];
  
  // Primary characteristics
  primaryTrait: string | null;
  primaryIntent: string | null;
  primaryProfile: string | null;
}

// Human-readable decision style labels
const DECISION_STYLE_LABELS: Record<string, string> = {
  conservative: 'Conservador',
  impulsive: 'Impulsivo',
  analytical: 'Analítico',
  emotional: 'Emocional',
  social: 'Social',
  ambitious: 'Ambicioso',
};

// Pain templates by dominant trait
const PAIN_TEMPLATES: Record<string, string> = {
  conservative: 'Insegurança ao tomar decisões e medo de fazer a escolha errada.',
  cautious: 'Medo de investir tempo ou dinheiro em algo que não funcione.',
  analytical: 'Frustração com informações incompletas e falta de clareza.',
  emotional: 'Sensação de desconexão com soluções genéricas e impessoais.',
  social: 'Solidão na jornada e falta de suporte genuíno.',
  ambitious: 'Resultados lentos que não acompanham seu ritmo e potencial.',
  spontaneous: 'Decepção com promessas vazias e soluções superficiais.',
  practical: 'Perda de tempo com métodos complicados e pouco práticos.',
};

// Desire templates by dominant intent
const DESIRE_TEMPLATES: Record<string, string> = {
  purchase: 'Encontrar uma solução definitiva que realmente entregue resultados.',
  learn: 'Entender profundamente antes de agir, com clareza e confiança.',
  curiosity: 'Descobrir algo novo e transformador que mude sua perspectiva.',
  research: 'Ter todas as informações necessárias para decidir com segurança.',
  trust: 'Encontrar alguém confiável que entenda suas necessidades.',
  urgency: 'Ver resultados rápidos e tangíveis que justifiquem o investimento.',
  solve: 'Resolver de uma vez por todas o problema que a incomoda.',
  compare: 'Fazer a melhor escolha entre as opções disponíveis.',
};

// Language style by profile type
const LANGUAGE_STYLES: Record<string, { style: string; keywords: string[]; tone: string }> = {
  conservative: {
    style: 'Segurança e Garantia',
    keywords: ['seguro', 'garantia', 'comprovado', 'confiável', 'sem risco'],
    tone: 'Tranquilizador e assertivo, com ênfase em provas e garantias'
  },
  analytical: {
    style: 'Clareza e Dados',
    keywords: ['resultado', 'método', 'passo a passo', 'funciona', 'testado'],
    tone: 'Objetivo e informativo, com dados e exemplos concretos'
  },
  emotional: {
    style: 'Conexão e Transformação',
    keywords: ['sentir', 'transformação', 'história', 'jornada', 'você merece'],
    tone: 'Empático e inspirador, com histórias e emoção'
  },
  social: {
    style: 'Comunidade e Validação',
    keywords: ['comunidade', 'milhares', 'juntas', 'suporte', 'pertencer'],
    tone: 'Acolhedor e inclusivo, com prova social forte'
  },
  ambitious: {
    style: 'Resultados e Velocidade',
    keywords: ['acelerar', 'resultados', 'próximo nível', 'exclusivo', 'diferencial'],
    tone: 'Direto e aspiracional, com foco em conquistas'
  },
  impulsive: {
    style: 'Urgência e Exclusividade',
    keywords: ['agora', 'único', 'oportunidade', 'limitado', 'especial'],
    tone: 'Urgente e empolgante, com chamadas claras para ação'
  },
};

// Generate copy suggestions based on audience profile
function generateCopySuggestions(
  primaryTrait: string,
  primaryIntent: string,
  dominantPain: string,
  dominantDesire: string
): CopySuggestion[] {
  const suggestions: CopySuggestion[] = [];
  
  const traitLabel = TRAIT_LABELS[primaryTrait]?.name || primaryTrait;
  const intentLabel = INTENT_LABELS[primaryIntent]?.name || primaryIntent;
  
  // Headlines
  suggestions.push({
    type: 'headline',
    text: `O método que ${traitLabel.toLowerCase()}s confiam`,
    targetProfile: traitLabel
  });
  suggestions.push({
    type: 'headline',
    text: `Para quem quer resultados, não promessas`,
  });
  suggestions.push({
    type: 'headline',
    text: `Finalmente: um caminho claro para você`,
  });
  
  // Promises
  suggestions.push({
    type: 'promise',
    text: `Você vai entender exatamente o que funciona para você`,
  });
  suggestions.push({
    type: 'promise',
    text: `Sem adivinhação. Sem perda de tempo. Só resultados.`,
  });
  
  // Angles
  suggestions.push({
    type: 'angle',
    text: `Abordagem: Foco em segurança e garantia`,
    targetProfile: 'conservative'
  });
  suggestions.push({
    type: 'angle',
    text: `Abordagem: Método comprovado com resultados mensuráveis`,
    targetProfile: 'analytical'
  });
  
  // Pain phrases
  suggestions.push({
    type: 'pain',
    text: dominantPain,
  });
  suggestions.push({
    type: 'pain',
    text: `Cansada de tentar coisas que não funcionam?`,
  });
  
  // Desire phrases
  suggestions.push({
    type: 'desire',
    text: dominantDesire,
  });
  suggestions.push({
    type: 'desire',
    text: `Imagine ter clareza total sobre o que fazer`,
  });
  
  return suggestions;
}

// Determine decision style from vectors
function determineDecisionStyle(
  traitVector: Record<string, number>,
  intentVector: Record<string, number>
): string {
  // Simplified logic based on dominant dimensions
  const sortedTraits = Object.entries(traitVector).sort((a, b) => b[1] - a[1]);
  const sortedIntents = Object.entries(intentVector).sort((a, b) => b[1] - a[1]);
  
  const primaryTrait = sortedTraits[0]?.[0] || '';
  const primaryIntent = sortedIntents[0]?.[0] || '';
  
  if (['cautious', 'conservative', 'stability'].includes(primaryTrait)) {
    return 'conservative';
  }
  if (['spontaneous', 'urgency'].includes(primaryTrait) || primaryIntent === 'urgency') {
    return 'impulsive';
  }
  if (['analytical', 'methodical', 'conscientiousness'].includes(primaryTrait)) {
    return 'analytical';
  }
  if (['emotional', 'intuitivo'].includes(primaryTrait)) {
    return 'emotional';
  }
  if (['social', 'influence'].includes(primaryTrait)) {
    return 'social';
  }
  if (['ambitious', 'dominance'].includes(primaryTrait)) {
    return 'ambitious';
  }
  
  return 'analytical'; // default
}

// Main hook
export function useQuizAudienceIntelligence(quizId?: string) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  return useQuery({
    queryKey: ['quiz-audience-intelligence', projectId, quizId],
    queryFn: async (): Promise<AudienceIntelligence | null> => {
      if (!projectId || !quizId) return null;

      // Fetch all completed results for this quiz
      const { data: results, error: resultsError } = await supabase
        .from('quiz_results')
        .select(`
          *,
          session:quiz_sessions!inner (
            id,
            quiz_id,
            status,
            contact_id,
            started_at,
            completed_at
          )
        `)
        .eq('project_id', projectId)
        .eq('session.quiz_id', quizId);

      if (resultsError) throw resultsError;
      if (!results || results.length === 0) return null;

      // Process results
      const completedResults = results.filter(r => 
        (r.session as any)?.status === 'completed'
      );
      const identifiedResults = results.filter(r => 
        (r.session as any)?.contact_id
      );

      // Aggregate vectors
      const traitSums: Record<string, number> = {};
      const traitCounts: Record<string, number> = {};
      const intentSums: Record<string, number> = {};
      const intentCounts: Record<string, number> = {};
      
      // Count profiles
      const profileCounts: Record<string, number> = {};
      const decisionStyleCounts: Record<string, number> = {};
      let totalScore = 0;

      completedResults.forEach(result => {
        const traitsVector = (result.traits_vector as Record<string, number>) || {};
        const intentVector = (result.intent_vector as Record<string, number>) || {};
        const normalizedScore = typeof result.normalized_score === 'number' 
          ? result.normalized_score 
          : parseFloat(String(result.normalized_score)) || 0;
        
        totalScore += normalizedScore;

        // Aggregate traits
        Object.entries(traitsVector).forEach(([key, value]) => {
          traitSums[key] = (traitSums[key] || 0) + value;
          traitCounts[key] = (traitCounts[key] || 0) + 1;
        });

        // Aggregate intents
        Object.entries(intentVector).forEach(([key, value]) => {
          intentSums[key] = (intentSums[key] || 0) + value;
          intentCounts[key] = (intentCounts[key] || 0) + 1;
        });

        // Generate semantic profile
        const profile = interpretProfile({
          vectors: {
            intent_vector: intentVector,
            traits_vector: traitsVector
          },
          normalized_score: normalizedScore
        });

        // Count profiles
        profileCounts[profile.profile_name] = (profileCounts[profile.profile_name] || 0) + 1;

        // Determine and count decision styles
        const decisionStyle = determineDecisionStyle(traitsVector, intentVector);
        decisionStyleCounts[decisionStyle] = (decisionStyleCounts[decisionStyle] || 0) + 1;
      });

      // Calculate averages and normalize
      const avgTraits: Record<string, number> = {};
      Object.keys(traitSums).forEach(key => {
        avgTraits[key] = traitSums[key] / traitCounts[key];
      });

      const avgIntents: Record<string, number> = {};
      Object.keys(intentSums).forEach(key => {
        avgIntents[key] = intentSums[key] / intentCounts[key];
      });

      // Normalize to 100%
      const normalizeVector = (vec: Record<string, number>): Record<string, number> => {
        const total = Object.values(vec).reduce((a, b) => a + Math.abs(b), 0);
        if (total === 0) return vec;
        const normalized: Record<string, number> = {};
        Object.entries(vec).forEach(([key, value]) => {
          normalized[key] = (value / total) * 100;
        });
        return normalized;
      };

      const normalizedTraits = normalizeVector(avgTraits);
      const normalizedIntents = normalizeVector(avgIntents);

      // Build distributions
      const totalCompleted = completedResults.length;

      const traitDistribution: DimensionDistribution[] = Object.entries(normalizedTraits)
        .sort((a, b) => b[1] - a[1])
        .map(([key, avgValue]) => ({
          key,
          label: getSemanticLabel(key, 'trait'),
          count: traitCounts[key] || 0,
          percentage: Math.round(avgValue),
          avgValue
        }));

      const intentDistribution: DimensionDistribution[] = Object.entries(normalizedIntents)
        .sort((a, b) => b[1] - a[1])
        .map(([key, avgValue]) => ({
          key,
          label: getSemanticLabel(key, 'intent'),
          count: intentCounts[key] || 0,
          percentage: Math.round(avgValue),
          avgValue
        }));

      const semanticProfiles: ProfileDistribution[] = Object.entries(profileCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalCompleted) * 100)
        }));

      const decisionStyles: ProfileDistribution[] = Object.entries(decisionStyleCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({
          name: DECISION_STYLE_LABELS[key] || key,
          count,
          percentage: Math.round((count / totalCompleted) * 100)
        }));

      // Determine primary characteristics
      const primaryTrait = traitDistribution[0]?.key || null;
      const primaryIntent = intentDistribution[0]?.key || null;
      const primaryProfile = semanticProfiles[0]?.name || null;
      const primaryDecisionStyle = Object.entries(decisionStyleCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'analytical';

      // Generate insights
      const dominantPain = PAIN_TEMPLATES[primaryTrait || 'analytical'] || 
        'Frustração com soluções genéricas que não atendem suas necessidades específicas.';
      
      const dominantDesire = DESIRE_TEMPLATES[primaryIntent || 'learn'] ||
        'Encontrar uma solução personalizada que realmente funcione.';

      const languageConfig = LANGUAGE_STYLES[primaryDecisionStyle] || LANGUAGE_STYLES.analytical;
      const languageInsights: LanguageInsights = {
        dominantStyle: languageConfig.style,
        keywords: languageConfig.keywords,
        toneRecommendation: languageConfig.tone
      };

      // Generate copy suggestions
      const copySuggestions = generateCopySuggestions(
        primaryTrait || 'analytical',
        primaryIntent || 'learn',
        dominantPain,
        dominantDesire
      );

      return {
        totalResponses: results.length,
        completedResponses: completedResults.length,
        identifiedLeads: identifiedResults.length,
        avgScore: totalCompleted > 0 ? totalScore / totalCompleted : 0,
        semanticProfiles,
        decisionStyles,
        traitDistribution,
        intentDistribution,
        aggregatedVectors: {
          traits: normalizedTraits,
          intents: normalizedIntents
        },
        dominantPain,
        dominantDesire,
        languageInsights,
        copySuggestions,
        primaryTrait,
        primaryIntent,
        primaryProfile
      };
    },
    enabled: !!projectId && !!quizId,
  });
}
