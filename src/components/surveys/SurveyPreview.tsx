import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, ExternalLink, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SurveyTheme {
  primary_color: string;
  background_color: string;
  background_image?: string;
  logo_url?: string;
  show_progress: boolean;
  one_question_per_page: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options?: string[];
}

interface SurveyPreviewProps {
  surveyName: string;
  surveyDescription?: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  theme: SurveyTheme;
  questions: Question[];
  previewUrl?: string;
  publicUrl?: string;
}

const defaultTheme: SurveyTheme = {
  primary_color: '#6366f1',
  background_color: '#f8fafc',
  show_progress: true,
  one_question_per_page: true,
};

export function SurveyPreview({
  surveyName,
  surveyDescription,
  welcomeMessage,
  thankYouMessage,
  theme,
  questions,
  previewUrl,
  publicUrl,
}: SurveyPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewStep, setPreviewStep] = useState<'welcome' | 'question' | 'thanks'>('welcome');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  
  const currentTheme = { ...defaultTheme, ...theme };
  const sampleQuestion = questions[currentQuestion] || {
    id: '1',
    question_text: 'Exemplo de pergunta',
    question_type: 'multiple_choice',
    options: ['Opção A', 'Opção B', 'Opção C'],
  };

  const containerClass = cn(
    "relative rounded-xl border-4 border-muted overflow-hidden transition-all mx-auto",
    viewMode === 'desktop' 
      ? "w-full max-w-2xl aspect-video" 
      : "w-[320px] aspect-[9/16]"
  );

  const handleNextPreview = () => {
    if (previewStep === 'welcome') {
      setPreviewStep('question');
    } else if (previewStep === 'question') {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setPreviewStep('thanks');
      }
    } else {
      setPreviewStep('welcome');
      setCurrentQuestion(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Desktop
          </Button>
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Mobile
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir aqui
            </Button>
          )}
          {publicUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(publicUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir no domínio
            </Button>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div className={containerClass}>
        <div 
          className="w-full h-full overflow-auto"
          style={{ 
            backgroundColor: currentTheme.background_color,
            backgroundImage: currentTheme.background_image ? `url(${currentTheme.background_image})` : undefined,
            backgroundSize: 'cover',
          }}
        >
          {/* Progress bar */}
          {currentTheme.show_progress && previewStep === 'question' && (
            <div className="absolute top-0 left-0 right-0 bg-background/80 p-2">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${((currentQuestion + 1) / Math.max(questions.length, 1)) * 100}%`,
                    backgroundColor: currentTheme.primary_color,
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-center h-full p-4 md:p-8">
            <AnimatePresence mode="wait">
              {/* Welcome */}
              {previewStep === 'welcome' && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center max-w-md"
                >
                  {currentTheme.logo_url && (
                    <img 
                      src={currentTheme.logo_url} 
                      alt="Logo" 
                      className="h-10 w-auto mx-auto mb-4 object-contain"
                    />
                  )}
                  <h2 className="text-lg md:text-xl font-bold mb-2">{surveyName}</h2>
                  {surveyDescription && (
                    <p className="text-sm text-muted-foreground mb-3">{surveyDescription}</p>
                  )}
                  {welcomeMessage && (
                    <p className="text-xs text-muted-foreground mb-4">{welcomeMessage}</p>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNextPreview}
                    style={{ backgroundColor: currentTheme.primary_color }}
                  >
                    Começar
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </motion.div>
              )}

              {/* Question */}
              {previewStep === 'question' && (
                <motion.div
                  key={`question-${currentQuestion}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full max-w-md space-y-4"
                >
                  <div className="space-y-1">
                    <span 
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${currentTheme.primary_color}20`, 
                        color: currentTheme.primary_color 
                      }}
                    >
                      {currentQuestion + 1} / {questions.length || 1}
                    </span>
                    <h3 className="text-base md:text-lg font-medium">
                      {sampleQuestion.question_text}
                    </h3>
                  </div>

                  {/* Sample answer options */}
                  {sampleQuestion.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {(sampleQuestion.options || ['Opção A', 'Opção B']).slice(0, 3).map((opt, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "p-2 rounded-lg border text-sm flex items-center gap-2 cursor-pointer transition-all",
                            i === 0 ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          )}
                          style={{
                            borderColor: i === 0 ? currentTheme.primary_color : undefined,
                            backgroundColor: i === 0 ? `${currentTheme.primary_color}10` : undefined,
                          }}
                        >
                          <span 
                            className={cn(
                              "w-5 h-5 rounded flex items-center justify-center text-xs",
                              i === 0 ? "text-white" : "bg-muted text-muted-foreground"
                            )}
                            style={{ backgroundColor: i === 0 ? currentTheme.primary_color : undefined }}
                          >
                            {i === 0 ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-xs">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {sampleQuestion.question_type === 'scale' && (
                    <div className="flex justify-center gap-1 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          className={cn(
                            "w-6 h-6 md:w-8 md:h-8 rounded text-xs font-medium transition-all",
                            n === 8 ? "text-white" : "bg-muted hover:bg-muted/80"
                          )}
                          style={{ backgroundColor: n === 8 ? currentTheme.primary_color : undefined }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}

                  {(sampleQuestion.question_type === 'text' || sampleQuestion.question_type === 'identity_field') && (
                    <div className="border-b-2 border-muted py-2">
                      <span className="text-muted-foreground/50 text-sm">Digite sua resposta...</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleNextPreview}
                    className="w-full"
                    style={{ backgroundColor: currentTheme.primary_color }}
                  >
                    {currentQuestion === questions.length - 1 ? 'Finalizar' : 'Próxima'}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </motion.div>
              )}

              {/* Thanks */}
              {previewStep === 'thanks' && (
                <motion.div
                  key="thanks"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center max-w-md"
                >
                  {currentTheme.logo_url && (
                    <img 
                      src={currentTheme.logo_url} 
                      alt="Logo" 
                      className="h-8 w-auto mx-auto mb-3 object-contain"
                    />
                  )}
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ backgroundColor: `${currentTheme.primary_color}20` }}
                  >
                    <Check className="h-6 w-6" style={{ color: currentTheme.primary_color }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Obrigado!</h3>
                  <p className="text-sm text-muted-foreground">
                    {thankYouMessage || 'Sua resposta foi enviada com sucesso.'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextPreview}
                    className="mt-4"
                  >
                    Reiniciar Preview
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navigation hint */}
      <p className="text-center text-xs text-muted-foreground">
        Clique nos botões para navegar pelo preview
      </p>
    </div>
  );
}
