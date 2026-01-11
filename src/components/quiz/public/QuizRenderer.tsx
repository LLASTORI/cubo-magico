import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizStartScreen } from './QuizStartScreen';
import { QuizEndScreen } from './QuizEndScreen';
import { QuestionRenderer } from './QuestionRenderer';
import { QuizProgressBar } from './QuizProgressBar';
import { QuizIdentificationModal } from './QuizIdentificationModal';
import { CubeLoader } from '@/components/CubeLoader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuizEventDispatcher } from '@/hooks/useQuizEventDispatcher';

interface QuizRendererProps {
  quizIdentifier: string; // Can be UUID or slug
  projectCode?: string; // Optional project code for multi-tenant lookup
}

interface QuizState {
  sessionId: string | null;
  currentQuestionIndex: number;
  questions: any[];
  answers: Record<string, any>;
  quizConfig: any;
  progress: number;
  isCompleted: boolean;
  showStart: boolean;
  showEnd: boolean;
  showIdentification: boolean;
  result: any;
  isLoading: boolean;
  error: string | null;
}

interface ThemeConfig {
  primary_color?: string;
  text_color?: string;
  secondary_text_color?: string;
  input_text_color?: string;
  background_color?: string;
  background_image?: string;
  logo_url?: string;
  show_progress?: boolean;
}

export function QuizRenderer({ quizIdentifier, projectCode }: QuizRendererProps) {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [quizId, setQuizId] = useState<string | undefined>(undefined);
  const [state, setState] = useState<QuizState>({
    sessionId: null,
    currentQuestionIndex: 0,
    questions: [],
    answers: {},
    quizConfig: null,
    progress: 0,
    isCompleted: false,
    showStart: true,
    showEnd: false,
    showIdentification: false,
    result: null,
    isLoading: true,
    error: null,
  });

  // Event dispatcher for pixel tracking
  const {
    trackQuizStarted,
    trackQuestionAnswered,
    trackQuizCompleted,
    trackLeadIdentified,
    trackOutcomeSelected,
  } = useQuizEventDispatcher(projectId, quizId);

  // Extract theme from quiz config
  const theme: ThemeConfig = useMemo(() => {
    if (!state.quizConfig?.theme_config) return {};
    return state.quizConfig.theme_config as ThemeConfig;
  }, [state.quizConfig?.theme_config]);

  // Generate CSS variables for theming
  const themeStyles = useMemo(() => {
    const styles: Record<string, string> = {};
    
    if (theme.primary_color) {
      styles['--quiz-primary'] = theme.primary_color;
    }
    if (theme.text_color) {
      styles['--quiz-text'] = theme.text_color;
    }
    if (theme.secondary_text_color) {
      styles['--quiz-text-secondary'] = theme.secondary_text_color;
    }
    if (theme.background_color) {
      styles['--quiz-background'] = theme.background_color;
    }
    
    return styles;
  }, [theme]);

  // Background style with optional image
  const backgroundStyle = useMemo(() => {
    const style: React.CSSProperties = {
      backgroundColor: theme.background_color || undefined,
    };
    
    if (theme.background_image) {
      style.backgroundImage = `url(${theme.background_image})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
    }
    
    return style;
  }, [theme.background_color, theme.background_image]);

  // Get UTM data from URL
  const getUtmData = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
    };
  };

  // Load quiz on mount - fetch quiz data with theme config for start screen
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        let resolvedQuizId = quizIdentifier;
        let resolvedProjectId: string | null = null;
        
        // Check if it's a UUID (36 chars with dashes)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizIdentifier);
        
        if (!isUUID && projectCode) {
          // It's a slug with project code - look up the project first
          const { data: projectData } = await supabase
            .from('projects')
            .select('id')
            .eq('public_code', projectCode)
            .maybeSingle();
          
          if (projectData) {
            resolvedProjectId = projectData.id;
          }
        }
        
        // Fetch quiz with all config data needed for rendering
        let quizQuery = supabase
          .from('quizzes')
          .select('id, project_id, name, description, is_active, requires_identification, allow_anonymous, theme_config, start_screen_config, end_screen_config, enable_pixel_events');
        
        if (isUUID) {
          quizQuery = quizQuery.eq('id', quizIdentifier);
        } else {
          quizQuery = quizQuery.eq('slug', quizIdentifier);
          if (resolvedProjectId) {
            quizQuery = quizQuery.eq('project_id', resolvedProjectId);
          }
        }
        
        const { data: quizData, error: quizError } = await quizQuery.maybeSingle();
        
        if (quizError || !quizData) {
          setState(s => ({ ...s, error: 'Quiz não encontrado', isLoading: false }));
          return;
        }
        
        if (!quizData.is_active) {
          setState(s => ({ ...s, error: 'Este quiz está inativo', isLoading: false }));
          return;
        }
        
        resolvedQuizId = quizData.id;
        setQuizId(resolvedQuizId);
        setProjectId(quizData.project_id);
        
        // Set quiz config so theme and start screen are available immediately
        setState(s => ({ 
          ...s, 
          quizConfig: quizData,
          isLoading: false 
        }));
        
      } catch (err: any) {
        console.error('Error loading quiz:', err);
        setState(s => ({ ...s, error: err.message, isLoading: false }));
      }
    };
    
    loadQuiz();
  }, [quizIdentifier, projectCode]);

  // Start quiz
  const startQuiz = async () => {
    if (!quizId) return;
    
    try {
      setState(s => ({ ...s, isLoading: true }));
      
      const { data, error } = await supabase.functions.invoke('quiz-public-start', {
        body: {
          quiz_id: quizId,
          utm_data: getUtmData(),
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Set project ID for event dispatcher if not already set
      if (data.quiz?.project_id && !projectId) {
        setProjectId(data.quiz.project_id);
      }

      // Merge incoming quiz data with existing config (preserve theme, start/end screen configs)
      const mergedConfig = {
        ...state.quizConfig,
        ...data.quiz,
        // Preserve local configs if the function didn't return them
        theme_config: data.quiz?.theme_config || state.quizConfig?.theme_config,
        start_screen_config: data.quiz?.start_screen_config || state.quizConfig?.start_screen_config,
        end_screen_config: data.quiz?.end_screen_config || state.quizConfig?.end_screen_config,
      };

      setState(s => ({
        ...s,
        sessionId: data.session_id,
        questions: data.questions || [],
        quizConfig: mergedConfig,
        currentQuestionIndex: 0,
        progress: 0,
        showStart: false,
        isLoading: false,
      }));

      // Track quiz started event
      if (mergedConfig?.enable_pixel_events !== false) {
        trackQuizStarted(mergedConfig?.name || 'Quiz', {
          session_id: data.session_id,
          total_questions: data.questions?.length || 0,
        });
      }
    } catch (err: any) {
      console.error('Error starting quiz:', err);
      setState(s => ({ ...s, error: err.message, isLoading: false }));
      toast({ title: 'Erro ao iniciar quiz', variant: 'destructive' });
    }
  };

  // Answer question
  const answerQuestion = async (questionId: string, answer: any) => {
    if (!state.sessionId) return;

    try {
      const { data, error } = await supabase.functions.invoke('quiz-public-answer', {
        body: {
          session_id: state.sessionId,
          question_id: questionId,
          ...answer,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Track question answered event
      if (state.quizConfig?.enable_pixel_events !== false) {
        trackQuestionAnswered(questionId, state.currentQuestionIndex, {
          session_id: state.sessionId,
          answer_value: answer.selected_option_id || answer.text_value,
        });
      }

      const newAnswers = { ...state.answers, [questionId]: answer };
      const nextIndex = state.currentQuestionIndex + 1;
      const progress = (nextIndex / state.questions.length) * 100;

      // Check if this was the last question
      if (data.is_last_question || nextIndex >= state.questions.length) {
        // Check if identification is required
        if (state.quizConfig?.requires_identification && !state.quizConfig?.allow_anonymous) {
          setState(s => ({
            ...s,
            answers: newAnswers,
            progress: 100,
            showIdentification: true,
          }));
        } else {
          await completeQuiz(newAnswers);
        }
      } else {
        setState(s => ({
          ...s,
          answers: newAnswers,
          currentQuestionIndex: nextIndex,
          progress,
        }));
      }
    } catch (err: any) {
      console.error('Error answering question:', err);
      toast({ title: 'Erro ao salvar resposta', variant: 'destructive' });
    }
  };

  // Identify lead
  const identifyLead = async (identityData: any) => {
    if (!state.sessionId) return;

    try {
      setState(s => ({ ...s, isLoading: true }));

      const { data, error } = await supabase.functions.invoke('quiz-identify', {
        body: {
          session_id: state.sessionId,
          ...identityData,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Track lead identified event
      if (state.quizConfig?.enable_pixel_events !== false && data.contact_id) {
        trackLeadIdentified(data.contact_id, {
          session_id: state.sessionId,
          email: identityData.email,
        });
      }

      setState(s => ({ ...s, showIdentification: false }));
      await completeQuiz(state.answers, data.contact_id);
    } catch (err: any) {
      console.error('Error identifying lead:', err);
      toast({ title: 'Erro ao salvar dados', variant: 'destructive' });
      setState(s => ({ ...s, isLoading: false }));
    }
  };

  // Complete quiz
  const completeQuiz = async (answers: Record<string, any>, contactId?: string) => {
    if (!state.sessionId) return;

    try {
      setState(s => ({ ...s, isLoading: true }));

      const { data, error } = await supabase.functions.invoke('quiz-public-complete', {
        body: {
          session_id: state.sessionId,
          contact_id: contactId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Track quiz completed event
      if (state.quizConfig?.enable_pixel_events !== false) {
        trackQuizCompleted(state.sessionId!, {
          total_questions: state.questions.length,
          score: data.result?.score,
          confidence: data.result?.confidence,
        });

        // Track outcome selected if applicable
        if (data.result?.outcome) {
          trackOutcomeSelected(
            data.result.outcome.id,
            data.result.outcome.name,
            { session_id: state.sessionId }
          );
        }
      }

      setState(s => ({
        ...s,
        isCompleted: true,
        showEnd: true,
        result: data.result,
        isLoading: false,
      }));
    } catch (err: any) {
      console.error('Error completing quiz:', err);
      toast({ title: 'Erro ao finalizar quiz', variant: 'destructive' });
      setState(s => ({ ...s, isLoading: false }));
    }
  };

  // Show progress bar based on theme config
  const showProgress = theme.show_progress !== false;

  // Loading state
  if (state.isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted"
        style={backgroundStyle}
      >
        <CubeLoader size="lg" />
      </div>
    );
  }

  // Error state
  if (state.error) {
    const isInactiveError = state.error.includes('inativo') || state.error.includes('não encontrado');
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6"
        style={backgroundStyle}
      >
        <div className="text-center max-w-md">
          <h1 
            className="text-2xl font-bold mb-4"
            style={{ color: theme.text_color }}
          >
            {isInactiveError ? 'Quiz indisponível' : 'Ops!'}
          </h1>
          <p 
            className="mb-6"
            style={{ color: theme.secondary_text_color }}
          >
            {state.error}
          </p>
          {isInactiveError && (
            <p 
              className="text-sm"
              style={{ color: theme.secondary_text_color }}
            >
              Este quiz pode estar temporariamente desativado ou o link não é válido.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Start screen - show before quiz is fetched
  if (state.showStart) {
    return (
      <QuizStartScreen
        config={state.quizConfig?.start_screen_config}
        theme={theme}
        quizName={state.quizConfig?.name || 'Quiz'}
        logoUrl={theme.logo_url}
        onStart={startQuiz}
      />
    );
  }

  // Identification modal
  if (state.showIdentification) {
    return (
      <QuizIdentificationModal
        isOpen={true}
        onSubmit={identifyLead}
        onSkip={state.quizConfig?.allow_anonymous ? () => completeQuiz(state.answers) : undefined}
      />
    );
  }

  // End screen
  if (state.showEnd) {
    return (
      <QuizEndScreen
        config={state.quizConfig?.end_screen_config}
        theme={theme}
        result={state.result}
        logoUrl={theme.logo_url}
      />
    );
  }

  // Question screen - normalize question data from edge function format
  const rawQuestion = state.questions[state.currentQuestionIndex];
  
  // Normalize the question to the expected format for QuestionRenderer
  const currentQuestion = rawQuestion ? {
    id: rawQuestion.id,
    question_text: rawQuestion.title || rawQuestion.question_text,
    description: rawQuestion.subtitle || rawQuestion.description,
    question_type: rawQuestion.type || rawQuestion.question_type,
    is_required: rawQuestion.is_required ?? true,
    config: rawQuestion.config,
    quiz_options: (rawQuestion.quiz_options || []).map((opt: any) => ({
      id: opt.id,
      option_text: opt.label || opt.option_text,
      position: opt.order_index ?? opt.position ?? 0,
    })),
  } : null;

  if (!currentQuestion) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6"
        style={backgroundStyle}
      >
        <div className="text-center">
          <p style={{ color: theme.secondary_text_color }}>
            Nenhuma pergunta encontrada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        ...backgroundStyle,
        ...themeStyles as React.CSSProperties,
      }}
    >
      {/* Progress bar */}
      {showProgress && (
        <QuizProgressBar 
          progress={state.progress} 
        />
      )}

      {/* Logo */}
      {theme.logo_url && (
        <div className="flex justify-center pt-6">
          <img 
            src={theme.logo_url} 
            alt="Logo" 
            className="h-12 object-contain"
          />
        </div>
      )}

      {/* Question content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <QuestionRenderer
              question={currentQuestion}
              questionNumber={state.currentQuestionIndex + 1}
              totalQuestions={state.questions.length}
              onAnswer={(answer) => answerQuestion(currentQuestion.id, answer)}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
