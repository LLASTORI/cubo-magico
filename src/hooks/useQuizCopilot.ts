import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useQuizOutcomes } from '@/hooks/useQuizOutcomes';
import { Json } from '@/integrations/supabase/types';

// Types
export interface InterviewAnswers {
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

export interface DesignRationale {
  questionCount: number;
  cognitiveDimensions: string[];
  outcomeCount: number;
  flowType: string;
  primarySignals: string[];
  secondarySignals: string[];
  explanation: string;
}

export interface GeneratedQuestion {
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

export interface GeneratedOption {
  label: string;
  value: string;
  traitsVector: Record<string, number>;
  intentVector: Record<string, number>;
  weight: number;
}

export interface GeneratedOutcome {
  name: string;
  description: string;
  priority: number;
  conditions: OutcomeCondition[];
  actions: OutcomeAction[];
}

export interface OutcomeCondition {
  type: string;
  field: string;
  operator: string;
  value: any;
  group?: number;
}

export interface OutcomeAction {
  type: string;
  config: Record<string, any>;
}

export interface GeneratedQuiz {
  name: string;
  description: string;
  type: string;
  questions: GeneratedQuestion[];
  outcomes: GeneratedOutcome[];
  
  // Experience Engine suggestions (optional, from Co-Pilot)
  suggestedTemplateSlug?: string;
  suggestedTheme?: {
    primary_color: string;
    background_color: string;
    text_color: string;
  };
  suggestedStartScreen?: {
    headline?: string;
    subheadline?: string;
    cta_text?: string;
    estimated_time?: string;
    benefits?: string[];
  };
  suggestedEndScreen?: {
    headline?: string;
    subheadline?: string;
    cta_text?: string;
    cta_url?: string;
  };
}

export interface ValidationReport {
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

export interface CopilotState {
  step: 'interview' | 'reasoning' | 'generating' | 'validating' | 'review' | 'saving' | 'complete';
  interview: InterviewAnswers | null;
  designRationale: DesignRationale | null;
  generatedQuiz: GeneratedQuiz | null;
  validation: ValidationReport | null;
  error: string | null;
  createdQuizId: string | null;
}

export function useQuizCopilot() {
  const { toast } = useToast();
  const { createQuiz } = useQuizzes();
  
  const [state, setState] = useState<CopilotState>({
    step: 'interview',
    interview: null,
    designRationale: null,
    generatedQuiz: null,
    validation: null,
    error: null,
    createdQuizId: null,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const updateState = (updates: Partial<CopilotState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Analyze interview and get design rationale
  const analyzeInterview = async (interview: InterviewAnswers): Promise<DesignRationale | null> => {
    setIsProcessing(true);
    updateState({ step: 'reasoning', interview, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('quiz-copilot', {
        body: { action: 'analyzeInterview', data: { interview } }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const designRationale = data.designRationale as DesignRationale;
      updateState({ designRationale });
      
      return designRationale;
    } catch (err: any) {
      console.error('[useQuizCopilot] analyzeInterview error:', err);
      updateState({ error: err.message });
      toast({ title: 'Erro na análise', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate quiz based on interview and rationale
  const generateQuiz = async (): Promise<GeneratedQuiz | null> => {
    if (!state.interview || !state.designRationale) {
      toast({ title: 'Dados incompletos', description: 'Complete a entrevista primeiro', variant: 'destructive' });
      return null;
    }

    setIsProcessing(true);
    updateState({ step: 'generating', error: null });

    try {
      const { data, error } = await supabase.functions.invoke('quiz-copilot', {
        body: { 
          action: 'generateQuiz', 
          data: { 
            interview: state.interview, 
            designRationale: state.designRationale 
          } 
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const generatedQuiz = data.quiz as GeneratedQuiz;
      updateState({ generatedQuiz, step: 'validating' });

      // Auto-validate
      await validateQuiz(generatedQuiz);
      
      return generatedQuiz;
    } catch (err: any) {
      console.error('[useQuizCopilot] generateQuiz error:', err);
      updateState({ error: err.message, step: 'interview' });
      toast({ title: 'Erro ao gerar quiz', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Validate generated quiz
  const validateQuiz = async (quiz?: GeneratedQuiz): Promise<ValidationReport | null> => {
    const quizToValidate = quiz || state.generatedQuiz;
    if (!quizToValidate) return null;

    try {
      const { data, error } = await supabase.functions.invoke('quiz-copilot', {
        body: { 
          action: 'validateQuiz', 
          data: { 
            quiz: quizToValidate, 
            interview: state.interview,
            designRationale: state.designRationale 
          } 
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const validation = data.validation as ValidationReport;
      updateState({ validation, step: 'review' });
      
      return validation;
    } catch (err: any) {
      console.error('[useQuizCopilot] validateQuiz error:', err);
      // Don't fail the whole process if validation fails
      updateState({ step: 'review' });
      return null;
    }
  };

  // Refine quiz based on user feedback
  const refineQuiz = async (refinementRequest: string): Promise<GeneratedQuiz | null> => {
    if (!state.generatedQuiz) {
      toast({ title: 'Nenhum quiz para refinar', variant: 'destructive' });
      return null;
    }

    setIsProcessing(true);
    updateState({ step: 'generating', error: null });

    try {
      const { data, error } = await supabase.functions.invoke('quiz-copilot', {
        body: { 
          action: 'refineQuiz', 
          data: { 
            quiz: state.generatedQuiz,
            refinementRequest,
            interview: state.interview, 
            designRationale: state.designRationale 
          } 
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const refinedQuiz = data.quiz as GeneratedQuiz;
      updateState({ generatedQuiz: refinedQuiz, step: 'validating' });

      // Re-validate
      await validateQuiz(refinedQuiz);
      
      toast({ title: 'Quiz refinado com sucesso!' });
      return refinedQuiz;
    } catch (err: any) {
      console.error('[useQuizCopilot] refineQuiz error:', err);
      updateState({ error: err.message, step: 'review' });
      toast({ title: 'Erro ao refinar quiz', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Save quiz to database
  const saveQuizToDatabase = async (): Promise<string | null> => {
    if (!state.generatedQuiz) {
      toast({ title: 'Nenhum quiz para salvar', variant: 'destructive' });
      return null;
    }

    setIsProcessing(true);
    updateState({ step: 'saving', error: null });

    try {
      const quiz = state.generatedQuiz;

      // Map quiz type to valid enum value
      const validTypes = ['lead', 'qualification', 'funnel', 'onboarding', 'entertainment', 'viral', 'research'];
      const quizType = validTypes.includes(quiz.type) ? quiz.type : 'lead';

      // 1. Create the quiz
      const createdQuiz = await createQuiz.mutateAsync({
        name: quiz.name,
        description: quiz.description,
        type: quizType as any,
        requires_identification: true,
        allow_anonymous: false,
      });

      const quizId = createdQuiz.id;

      // 2. Create questions
      for (const question of quiz.questions) {
        const { data: createdQuestion, error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quizId,
            type: question.type,
            title: question.title,
            subtitle: question.subtitle || null,
            order_index: question.order,
            is_required: question.isRequired,
          })
          .select()
          .single();

        if (questionError) {
          console.error('[useQuizCopilot] Error creating question:', questionError);
          throw questionError;
        }

        // 3. Create options for choice questions
        if (question.options && question.options.length > 0) {
          const optionsToInsert = question.options.map((opt, idx) => ({
            question_id: createdQuestion.id,
            label: opt.label,
            value: opt.value,
            order_index: idx,
            weight: opt.weight,
            traits_vector: opt.traitsVector as unknown as Json,
            intent_vector: opt.intentVector as unknown as Json,
          }));

          const { error: optionsError } = await supabase
            .from('quiz_options')
            .insert(optionsToInsert);

          if (optionsError) {
            console.error('[useQuizCopilot] Error creating options:', optionsError);
            throw optionsError;
          }
        }
      }

      // 4. Create outcomes
      for (const outcome of quiz.outcomes) {
        const { error: outcomeError } = await supabase
          .from('quiz_outcomes')
          .insert({
            quiz_id: quizId,
            name: outcome.name,
            description: outcome.description,
            priority: outcome.priority,
            is_active: true,
            conditions: outcome.conditions as unknown as Json,
            actions: outcome.actions as unknown as Json,
          });

        if (outcomeError) {
          console.error('[useQuizCopilot] Error creating outcome:', outcomeError);
          throw outcomeError;
        }
      }

      updateState({ step: 'complete', createdQuizId: quizId });
      toast({ 
        title: 'Quiz criado com sucesso!', 
        description: `${quiz.questions.length} perguntas e ${quiz.outcomes.length} outcomes criados.` 
      });

      return quizId;
    } catch (err: any) {
      console.error('[useQuizCopilot] saveQuizToDatabase error:', err);
      updateState({ error: err.message, step: 'review' });
      toast({ title: 'Erro ao salvar quiz', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset the copilot state
  const reset = () => {
    setState({
      step: 'interview',
      interview: null,
      designRationale: null,
      generatedQuiz: null,
      validation: null,
      error: null,
      createdQuizId: null,
    });
  };

  // Confirm design rationale and proceed to generation
  const confirmDesignAndGenerate = async () => {
    return await generateQuiz();
  };

  return {
    state,
    isProcessing,
    analyzeInterview,
    confirmDesignAndGenerate,
    refineQuiz,
    saveQuizToDatabase,
    reset,
  };
}
