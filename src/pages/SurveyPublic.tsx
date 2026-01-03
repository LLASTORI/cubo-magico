import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Send, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  SurveyProgress,
  QuestionText,
  QuestionMultipleChoice,
  QuestionScale,
  QuestionIdentity,
  WelcomeScreen,
  ThankYouScreen,
} from '@/components/surveys/public';

interface SurveyQuestion {
  id: string;
  question_text: string;
  description: string | null;
  question_type: string;
  is_required: boolean;
  options: any;
  settings: any;
  position: number;
  identity_field_target?: string;
}

interface SurveyTheme {
  primary_color: string;
  text_color?: string;
  secondary_text_color?: string;
  input_text_color?: string;
  background_color: string;
  background_image?: string;
  logo_url?: string;
  show_progress: boolean;
  one_question_per_page: boolean;
}

interface CTAButton {
  id: string;
  label: string;
  url: string;
  style: 'primary' | 'secondary' | 'outline';
  open_in_new_tab: boolean;
}

interface CompletionSettings {
  enable_auto_redirect?: boolean;
  redirect_url?: string;
  redirect_delay_seconds?: number;
  cta_buttons?: CTAButton[];
  reward_message?: string;
  reward_highlight?: string;
}

interface PublicSurvey {
  id: string;
  name: string;
  description: string | null;
  settings: {
    welcome_message?: string;
    thank_you_message?: string;
    theme?: SurveyTheme;
    completion?: CompletionSettings;
  } | null;
  survey_questions: SurveyQuestion[];
}

interface RawSurveyData {
  id: string;
  name: string;
  description: string | null;
  settings: any;
  survey_questions: SurveyQuestion[];
}

// Alias for backwards compatibility
type ParsedSurvey = PublicSurvey;

const parseSurveyData = (data: RawSurveyData): PublicSurvey => ({
  id: data.id,
  name: data.name,
  description: data.description,
  settings: data.settings as PublicSurvey['settings'],
  survey_questions: data.survey_questions,
});

interface PublicSurveyLegacy {
  id: string;
  name: string;
  description: string | null;
  settings: {
    welcome_message?: string;
    thank_you_message?: string;
    theme?: SurveyTheme;
  } | null;
  survey_questions: SurveyQuestion[];
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';
type ScreenState = 'welcome' | 'questions' | 'email' | 'submitting' | 'success';

const defaultTheme: SurveyTheme = {
  primary_color: '#6366f1',
  text_color: '#1e293b',
  secondary_text_color: '#64748b',
  input_text_color: '#1e293b',
  background_color: '#f8fafc',
  show_progress: true,
  one_question_per_page: true,
};

export default function SurveyPublic() {
  const { slug } = useParams();
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [screenState, setScreenState] = useState<ScreenState>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const theme = useMemo(() => ({
    ...defaultTheme,
    ...survey?.settings?.theme,
  }), [survey?.settings?.theme]);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-public?slug=${encodeURIComponent(slug)}`;
        const res = await fetch(fnUrl, {
          method: 'GET',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });

        if (!res.ok) {
          setNotFound(true);
        } else {
          const data = (await res.json()) as RawSurveyData;
          data.survey_questions?.sort((a, b) => a.position - b.position);
          setSurvey(parseSurveyData(data));
        }
      } catch {
        setNotFound(true);
      }

      setLoading(false);
    };

    fetchSurvey();
  }, [slug]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screenState !== 'questions') return;
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screenState, currentQuestionIndex, answers]);

  const currentQuestion = survey?.survey_questions[currentQuestionIndex];
  const totalQuestions = survey?.survey_questions.length || 0;

  const isCurrentAnswerValid = useCallback(() => {
    if (!currentQuestion) return true;
    if (!currentQuestion.is_required) return true;
    const answer = answers[currentQuestion.id];
    return answer !== undefined && answer !== '' && answer !== null;
  }, [currentQuestion, answers]);

  const handleNext = useCallback(() => {
    if (!isCurrentAnswerValid()) {
      setErrorMessage('Esta pergunta é obrigatória');
      return;
    }
    setErrorMessage('');
    
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setScreenState('email');
    }
  }, [currentQuestionIndex, totalQuestions, isCurrentAnswerValid]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setErrorMessage('');
    } else {
      setScreenState('welcome');
    }
  }, [currentQuestionIndex]);

  const updateAnswer = useCallback((questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setErrorMessage('');
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMessage('Email é obrigatório');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Email inválido');
      return;
    }

    setSubmitState('submitting');
    setScreenState('submitting');
    setErrorMessage('');

    try {
      const response = await supabase.functions.invoke('survey-public', {
        body: { slug, email, answers },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar resposta');
      }

      setSubmitState('success');
      setScreenState('success');
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao enviar resposta');
      setSubmitState('error');
      setScreenState('email');
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const questionProps = {
      primaryColor: theme.primary_color,
      secondaryColor: theme.secondary_text_color,
      inputTextColor: theme.input_text_color,
    };

    switch (currentQuestion.question_type) {
      case 'text':
        return (
          <QuestionText
            value={answers[currentQuestion.id] || ''}
            onChange={(value) => updateAnswer(currentQuestion.id, value)}
            {...questionProps}
          />
        );
      
      case 'multiple_choice':
        return (
          <QuestionMultipleChoice
            options={(currentQuestion.options as string[]) || []}
            value={answers[currentQuestion.id] || ''}
            onChange={(value) => updateAnswer(currentQuestion.id, value)}
            {...questionProps}
          />
        );
      
      case 'scale':
        return (
          <QuestionScale
            min={currentQuestion.settings?.min || 1}
            max={currentQuestion.settings?.max || 10}
            value={answers[currentQuestion.id] ?? null}
            onChange={(value) => updateAnswer(currentQuestion.id, value)}
            minLabel={currentQuestion.settings?.minLabel}
            maxLabel={currentQuestion.settings?.maxLabel}
            {...questionProps}
          />
        );
      
      case 'identity_field':
        return (
          <QuestionIdentity
            value={answers[currentQuestion.id] || ''}
            onChange={(value) => updateAnswer(currentQuestion.id, value)}
            fieldType={currentQuestion.identity_field_target}
            {...questionProps}
          />
        );
      
      default:
        return (
          <QuestionText
            value={answers[currentQuestion.id] || ''}
            onChange={(value) => updateAnswer(currentQuestion.id, value)}
            {...questionProps}
          />
        );
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.background_color }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pesquisa não encontrada</h1>
          <p className="text-muted-foreground">
            Esta pesquisa pode ter sido desativada ou o link está incorreto.
          </p>
        </div>
      </div>
    );
  }

  const backgroundStyle = {
    backgroundColor: theme.background_color,
    backgroundImage: theme.background_image ? `url(${theme.background_image})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      {/* Progress bar - fixed at top */}
      {theme.show_progress && screenState === 'questions' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm p-4">
          <div className="max-w-2xl mx-auto">
            <SurveyProgress 
              current={currentQuestionIndex + 1} 
              total={totalQuestions} 
            />
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col justify-center py-16 px-4">
        <div className="max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {/* Welcome Screen */}
            {screenState === 'welcome' && survey && (
              <WelcomeScreen
                key="welcome"
                title={survey.name}
                description={survey.description || undefined}
                welcomeMessage={survey.settings?.welcome_message}
                logoUrl={theme.logo_url}
                onStart={() => setScreenState('questions')}
                primaryColor={theme.primary_color}
                textColor={theme.text_color}
                secondaryTextColor={theme.secondary_text_color}
              />
            )}

            {/* Question Screen */}
            {screenState === 'questions' && currentQuestion && (
              <motion.div
                key={`question-${currentQuestionIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Question header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${theme.primary_color}20`, color: theme.primary_color }}
                    >
                      {currentQuestionIndex + 1} / {totalQuestions}
                    </span>
                    {currentQuestion.is_required && (
                      <span className="text-destructive">*</span>
                    )}
                  </div>
                  
                  <h2 
                    className="text-2xl md:text-3xl font-semibold leading-tight"
                    style={{ color: theme.text_color }}
                  >
                    {currentQuestion.question_text}
                  </h2>
                  
                  {currentQuestion.description && (
                    <p style={{ color: theme.secondary_text_color }}>
                      {currentQuestion.description}
                    </p>
                  )}
                </div>

                {/* Question content */}
                <div className="min-h-[200px]">
                  {renderQuestion()}
                </div>

                {/* Error message */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-destructive text-sm"
                  >
                    <AlertCircle className="h-4 w-4" />
                    {errorMessage}
                  </motion.div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={handlePrevious}
                    className="gap-2"
                    style={{ color: theme.secondary_text_color }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  
                  <Button
                    onClick={handleNext}
                    className="gap-2 px-6"
                    style={{ backgroundColor: theme.primary_color }}
                  >
                    {currentQuestionIndex === totalQuestions - 1 ? 'Finalizar' : 'Próxima'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Keyboard hint */}
                <p className="text-center text-xs" style={{ color: theme.secondary_text_color }}>
                  Pressione <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: `${theme.secondary_text_color}20` }}>Enter ↵</kbd> para continuar
                </p>
              </motion.div>
            )}

            {/* Email Screen */}
            {screenState === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-semibold">
                    Por último, seu email
                  </h2>
                  <p className="text-muted-foreground">
                    Para registrarmos sua resposta
                  </p>
                </div>

                <div className="space-y-4">
                  <QuestionIdentity
                    value={email}
                    onChange={setEmail}
                    fieldType="email"
                    primaryColor={theme.primary_color}
                  />
                  
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-destructive text-sm"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {errorMessage}
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setScreenState('questions');
                      setCurrentQuestionIndex(totalQuestions - 1);
                    }}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  
                  <Button
                    onClick={handleSubmit}
                    className="gap-2 px-6"
                    style={{ backgroundColor: theme.primary_color }}
                    disabled={submitState === 'submitting'}
                  >
                    {submitState === 'submitting' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Enviar
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Submitting Screen */}
            {screenState === 'submitting' && (
              <motion.div
                key="submitting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh]"
              >
                <Loader2 
                  className="h-12 w-12 animate-spin mb-4"
                  style={{ color: theme.primary_color }}
                />
                <p style={{ color: theme.secondary_text_color }}>Enviando sua resposta...</p>
              </motion.div>
            )}

            {/* Success Screen */}
            {screenState === 'success' && (
              <ThankYouScreen
                key="success"
                message={survey?.settings?.thank_you_message}
                logoUrl={theme.logo_url}
                primaryColor={theme.primary_color}
                textColor={theme.text_color}
                secondaryTextColor={theme.secondary_text_color}
                completionSettings={survey?.settings?.completion}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
