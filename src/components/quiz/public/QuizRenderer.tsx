import { useState, useEffect } from 'react';
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
  quizId: string;
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

export function QuizRenderer({ quizId }: QuizRendererProps) {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
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

  // Start quiz
  const startQuiz = async () => {
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

      // Set project ID for event dispatcher
      if (data.quiz?.project_id) {
        setProjectId(data.quiz.project_id);
      }

      setState(s => ({
        ...s,
        sessionId: data.session_id,
        questions: data.questions || [],
        quizConfig: data.quiz,
        currentQuestionIndex: 0,
        progress: 0,
        showStart: false,
        isLoading: false,
      }));

      // Track quiz started event
      if (data.quiz?.enable_pixel_events !== false) {
        trackQuizStarted(data.quiz?.name || 'Quiz', {
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

  // Initial load - just set loading false
  useEffect(() => {
    setState(s => ({ ...s, isLoading: false }));
  }, []);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <CubeLoader size="lg" />
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">Ops!</h1>
          <p className="text-muted-foreground mb-6">{state.error}</p>
        </div>
      </div>
    );
  }

  // Start screen
  if (state.showStart) {
    return (
      <QuizStartScreen
        config={state.quizConfig?.start_screen_config}
        quizName={state.quizConfig?.name}
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
        result={state.result}
      />
    );
  }

  // Question screen
  const currentQuestion = state.questions[state.currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Nenhuma pergunta encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted">
      {/* Progress bar */}
      <QuizProgressBar progress={state.progress} />

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
