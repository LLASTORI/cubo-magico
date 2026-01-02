import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';

interface PublicSurvey {
  id: string;
  name: string;
  description: string | null;
  settings: any;
  survey_questions: {
    id: string;
    question_text: string;
    description: string | null;
    question_type: string;
    is_required: boolean;
    options: any;
    settings: any;
    position: number;
  }[];
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function SurveyPublic() {
  const { slug } = useParams();
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('surveys')
        .select(`
          id,
          name,
          description,
          settings,
          survey_questions (
            id,
            question_text,
            description,
            question_type,
            is_required,
            options,
            settings,
            position
          )
        `)
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        // Sort questions by position
        data.survey_questions.sort((a, b) => a.position - b.position);
        setSurvey(data);
      }
      setLoading(false);
    };

    fetchSurvey();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setErrorMessage('Email é obrigatório');
      setSubmitState('error');
      return;
    }

    // Check required fields
    const requiredQuestions = survey?.survey_questions.filter(q => q.is_required) || [];
    for (const q of requiredQuestions) {
      if (!answers[q.id]) {
        setErrorMessage(`Por favor, responda: "${q.question_text}"`);
        setSubmitState('error');
        return;
      }
    }

    setSubmitState('submitting');
    setErrorMessage('');

    try {
      const response = await supabase.functions.invoke('survey-public', {
        body: {
          slug,
          email,
          answers,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar resposta');
      }

      setSubmitState('success');
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao enviar resposta');
      setSubmitState('error');
    }
  };

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Pesquisa não encontrada</CardTitle>
            <CardDescription>
              Esta pesquisa pode ter sido desativada ou o link está incorreto.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitState === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Obrigado!</h2>
            <p className="text-muted-foreground">
              {survey?.settings?.thank_you_message || 'Sua resposta foi enviada com sucesso.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{survey?.name}</CardTitle>
            {survey?.description && (
              <CardDescription className="text-base">{survey.description}</CardDescription>
            )}
            {survey?.settings?.welcome_message && (
              <p className="text-sm mt-4">{survey.settings.welcome_message}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">Seu Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {/* Questions */}
              {survey?.survey_questions.map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <Label>
                    {index + 1}. {question.question_text}
                    {question.is_required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {question.description && (
                    <p className="text-sm text-muted-foreground">{question.description}</p>
                  )}

                  {question.question_type === 'text' && (
                    <Textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => updateAnswer(question.id, e.target.value)}
                      placeholder="Sua resposta..."
                    />
                  )}

                  {question.question_type === 'identity_field' && (
                    <Input
                      value={answers[question.id] || ''}
                      onChange={(e) => updateAnswer(question.id, e.target.value)}
                      placeholder="Sua resposta..."
                    />
                  )}

                  {question.question_type === 'multiple_choice' && (
                    <RadioGroup
                      value={answers[question.id] || ''}
                      onValueChange={(value) => updateAnswer(question.id, value)}
                    >
                      {(question.options as string[]).map((option, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                          <Label htmlFor={`${question.id}-${i}`} className="font-normal">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {question.question_type === 'scale' && (
                    <div className="flex gap-2 flex-wrap">
                      {Array.from({ length: (question.settings?.max || 10) - (question.settings?.min || 1) + 1 }).map((_, i) => {
                        const value = (question.settings?.min || 1) + i;
                        return (
                          <Button
                            key={value}
                            type="button"
                            variant={answers[question.id] === value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateAnswer(question.id, value)}
                          >
                            {value}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {submitState === 'error' && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitState === 'submitting'}
              >
                {submitState === 'submitting' ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Resposta
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
