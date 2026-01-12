// Result Narrative Engine
// Transforms semantic profiles into 4-layer persuasive conversion copy
// 100% human language - NO technical terms (vectors, scores, percentages)

import { 
  interpretProfile, 
  type SemanticProfile,
  type SemanticProfileInput 
} from './semanticProfileEngine';

export interface NarrativeInput {
  intent_vector?: Record<string, number>;
  traits_vector?: Record<string, number>;
  confidence?: number;
  entropy?: number;
  normalized_score?: number;
}

export interface QuizTheme {
  name?: string;
  topic?: string; // maquiagem, finanças, relacionamento, saúde, etc.
}

export interface ConversionNarrative {
  title: string;      // Título do perfil
  mirror: string;     // Espelho psicológico - como ela decide
  pain: string;       // Dor implícita - problema conectado ao estilo
  bridge: string;     // Ponte para oferta - prepara o CTA
}

// Decision style archetypes for mirror generation
interface DecisionArchetype {
  style: string;
  mirror_template: string;
  pain_template: string;
  bridge_template: string;
}

const DECISION_ARCHETYPES: Record<string, DecisionArchetype> = {
  conservative: {
    style: 'Cautelosa',
    mirror_template: 'Você gosta de se sentir segura antes de investir em algo. Pesquisa, compara, busca garantias – e não há nada errado nisso. Seu cuidado é uma qualidade.',
    pain_template: 'Por isso, você provavelmente já tentou {action} sozinha, mas ficou insegura sobre o que realmente funciona para você. Talvez tenha gastado tempo (ou dinheiro) em soluções que não entregaram o que prometeram.',
    bridge_template: 'É exatamente por isso que este {product} foi criado – para pessoas que, assim como você, querem ter certeza de que estão fazendo a escolha certa.'
  },
  impulsive: {
    style: 'Decidida',
    mirror_template: 'Quando você sente que algo é certo, você age. Confia na sua intuição e não gosta de perder oportunidades. Seu entusiasmo é contagiante.',
    pain_template: 'Mas às vezes, essa rapidez fez você {action} sem ter o resultado que esperava. A empolgação inicial nem sempre se transformou em resultados duradouros.',
    bridge_template: 'Este {product} foi pensado para quem quer resultados reais, não apenas promessas. Para quem, como você, está pronta para transformar intenção em ação.'
  },
  analytical: {
    style: 'Analítica',
    mirror_template: 'Você gosta de entender como as coisas funcionam antes de se comprometer. Dados, lógica e resultados comprovados são importantes para suas decisões.',
    pain_template: 'Por isso, você já deve ter pesquisado muito sobre {topic}, comparado opções, lido reviews – mas ainda sente que falta clareza sobre qual caminho seguir.',
    bridge_template: 'Este {product} foi desenvolvido com base em resultados reais e metodologia comprovada – exatamente o que você precisa para decidir com confiança.'
  },
  emotional: {
    style: 'Intuitiva',
    mirror_template: 'Você decide pelo coração. Quando algo ressoa com você, quando sente aquela conexão genuína – é aí que você sabe que é certo.',
    pain_template: 'Mas talvez você já tenha se decepcionado antes. {Action} que pareciam perfeitas no início, mas não entregaram a transformação que você buscava.',
    bridge_template: 'Este {product} nasceu de uma história real, de alguém que passou pelo mesmo caminho que você. Foi criado com propósito e coração – você vai sentir a diferença.'
  },
  social: {
    style: 'Colaborativa',
    mirror_template: 'Você valoriza opiniões de pessoas em quem confia. Gosta de saber que outros já passaram pelo mesmo caminho e tiveram sucesso.',
    pain_template: 'Talvez você já tenha tentado {action} seguindo dicas genéricas, mas sem aquele suporte personalizado que faz toda a diferença. É difícil crescer sozinha.',
    bridge_template: 'Este {product} não é apenas conteúdo – é uma comunidade de pessoas como você, com suporte real e resultados compartilhados.'
  },
  ambitious: {
    style: 'Ambiciosa',
    mirror_template: 'Você quer mais. Não se contenta com o básico, busca excelência e está sempre em evolução. Seu drive por resultados é admirável.',
    pain_template: 'Mas às vezes, mesmo com todo esse esforço, os resultados não chegam na velocidade que você espera. {Action} demanda tempo que você não tem.',
    bridge_template: 'Este {product} foi criado para quem quer acelerar resultados sem comprometer qualidade. Para quem, como você, está pronta para dar o próximo salto.'
  }
};

// Topic-specific action phrases
const TOPIC_ACTIONS: Record<string, { action: string; action_past: string; product: string }> = {
  maquiagem: {
    action: 'aprender maquiagem',
    action_past: 'Produtos ou cursos',
    product: 'método'
  },
  beleza: {
    action: 'cuidar da sua beleza',
    action_past: 'Tratamentos ou produtos',
    product: 'programa'
  },
  finanças: {
    action: 'organizar suas finanças',
    action_past: 'Aplicativos ou cursos',
    product: 'método'
  },
  relacionamento: {
    action: 'melhorar seus relacionamentos',
    action_past: 'Conselhos ou terapias',
    product: 'programa'
  },
  saúde: {
    action: 'cuidar da sua saúde',
    action_past: 'Dietas ou treinos',
    product: 'método'
  },
  carreira: {
    action: 'avançar na carreira',
    action_past: 'Cursos ou mentorias',
    product: 'programa'
  },
  negócios: {
    action: 'crescer seu negócio',
    action_past: 'Estratégias ou ferramentas',
    product: 'método'
  },
  emagrecimento: {
    action: 'emagrecer de forma saudável',
    action_past: 'Dietas restritivas',
    product: 'método'
  },
  produtividade: {
    action: 'ser mais produtiva',
    action_past: 'Apps ou técnicas',
    product: 'sistema'
  },
  default: {
    action: 'alcançar seus objetivos',
    action_past: 'Soluções genéricas',
    product: 'método'
  }
};

// Profile name generators based on decision style and topic
function generateProfileTitle(
  profile: SemanticProfile, 
  decisionStyle: string,
  topic?: string
): string {
  // Use buying style to create human-friendly title
  const styleMap: Record<string, string> = {
    conservative: 'Compradora Consciente',
    impulsive: 'Compradora Decidida',
    analytical: 'Compradora Estratégica',
    emotional: 'Compradora Intuitiva',
    social: 'Compradora Social',
    ambitious: 'Compradora Visionária'
  };

  const topicAdjectives: Record<string, string> = {
    maquiagem: 'de Beleza',
    beleza: 'de Beleza',
    finanças: 'Financeira',
    relacionamento: 'de Conexões',
    saúde: 'de Bem-Estar',
    carreira: 'de Carreira',
    negócios: 'de Negócios'
  };

  const baseTitle = styleMap[decisionStyle] || profile.profile_name;
  const topicSuffix = topic ? topicAdjectives[topic.toLowerCase()] : '';

  if (topicSuffix) {
    return `${baseTitle} ${topicSuffix}`;
  }

  return baseTitle;
}

// Determine decision style from profile
function determineDecisionStyle(profile: SemanticProfile): string {
  const riskProfile = profile.risk_profile.toLowerCase();
  const buyingStyle = profile.buying_style.toLowerCase();
  const copyAngle = profile.copy_angle.toLowerCase();

  // Map from profile characteristics to decision style
  if (riskProfile.includes('muito baixo') || buyingStyle.includes('garantia') || copyAngle.includes('garantia')) {
    return 'conservative';
  }
  if (riskProfile.includes('alto') && (buyingStyle.includes('rápido') || copyAngle.includes('urgência'))) {
    return 'impulsive';
  }
  if (buyingStyle.includes('analisa') || buyingStyle.includes('compara') || copyAngle.includes('dados')) {
    return 'analytical';
  }
  if (buyingStyle.includes('conexão') || buyingStyle.includes('coração') || copyAngle.includes('emocional')) {
    return 'emotional';
  }
  if (buyingStyle.includes('comunidade') || buyingStyle.includes('recomendações') || copyAngle.includes('social')) {
    return 'social';
  }
  if (buyingStyle.includes('valor claro') || buyingStyle.includes('resultados') || copyAngle.includes('autoridade')) {
    return 'ambitious';
  }

  // Default based on risk profile
  if (riskProfile.includes('baixo')) return 'conservative';
  if (riskProfile.includes('alto')) return 'impulsive';
  return 'analytical';
}

// Generate narrative with variable substitution
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || key);
}

// Main narrative generation function
export function generateConversionNarrative(
  input: NarrativeInput,
  theme: QuizTheme = {}
): ConversionNarrative {
  // Build semantic profile
  const profileInput: SemanticProfileInput = {
    vectors: {
      intent_vector: input.intent_vector || {},
      traits_vector: input.traits_vector || {}
    },
    entropy: input.entropy || 0.5,
    confidence: input.confidence || 0.5,
    normalized_score: input.normalized_score
  };

  const semanticProfile = interpretProfile(profileInput);
  const decisionStyle = determineDecisionStyle(semanticProfile);
  
  // Get archetype templates
  const archetype = DECISION_ARCHETYPES[decisionStyle] || DECISION_ARCHETYPES.analytical;
  
  // Get topic-specific phrases
  const topicKey = theme.topic?.toLowerCase() || 'default';
  const topicPhrases = TOPIC_ACTIONS[topicKey] || TOPIC_ACTIONS.default;

  // Generate title
  const title = `Seu perfil é: ${generateProfileTitle(semanticProfile, decisionStyle, theme.topic)}`;

  // Generate mirror with profile details
  const mirror = archetype.mirror_template;

  // Generate pain with topic-specific action
  const pain = interpolate(archetype.pain_template, {
    action: topicPhrases.action,
    Action: topicPhrases.action_past,
    topic: theme.topic || theme.name || 'isso'
  });

  // Generate bridge with product type
  const bridge = interpolate(archetype.bridge_template, {
    product: topicPhrases.product
  });

  return {
    title,
    mirror,
    pain,
    bridge
  };
}

// Helper: detect topic from quiz name
export function detectTopicFromName(quizName?: string): string | undefined {
  if (!quizName) return undefined;
  
  const name = quizName.toLowerCase();
  
  const topicKeywords: Record<string, string[]> = {
    maquiagem: ['maquiagem', 'makeup', 'make-up', 'make up', 'beleza natural'],
    beleza: ['beleza', 'skincare', 'pele', 'cabelo', 'estética'],
    finanças: ['finanças', 'financeiro', 'dinheiro', 'investimento', 'renda'],
    relacionamento: ['relacionamento', 'amor', 'casal', 'namoro', 'casamento'],
    saúde: ['saúde', 'bem-estar', 'wellness', 'fitness', 'exercício'],
    carreira: ['carreira', 'profissional', 'emprego', 'trabalho', 'promoção'],
    negócios: ['negócio', 'empreendedor', 'empresa', 'vendas', 'marketing'],
    emagrecimento: ['emagrecimento', 'emagrecer', 'peso', 'dieta', 'gordura'],
    produtividade: ['produtividade', 'foco', 'organização', 'tempo', 'rotina']
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => name.includes(kw))) {
      return topic;
    }
  }

  return undefined;
}

// Export for testing
export { DECISION_ARCHETYPES, TOPIC_ACTIONS };
