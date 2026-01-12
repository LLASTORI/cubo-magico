/**
 * Experience Preview Component
 * 
 * Unified preview component used by both Quiz and Survey.
 * This renders EXACTLY what the public page will show - no mocks, no placeholders.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, ExternalLink, ArrowRight, Check, Play, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExperienceTheme, ExperienceStartScreen, ExperienceEndScreen, DEFAULT_THEME, DEFAULT_START_SCREEN, DEFAULT_END_SCREEN } from './types';

interface Question {
  id: string;
  title?: string;
  question_text?: string;
  type?: string;
  question_type?: string;
  options?: Array<{ label: string } | string>;
}

interface TemplateConfig {
  layout?: 'centered' | 'grid' | 'sidebar' | 'fullscreen';
  image_position?: 'top' | 'left' | 'right' | 'background' | 'hidden';
  progress_style?: 'bar' | 'dots' | 'percentage' | 'segments' | 'steps';
  navigation_style?: 'buttons' | 'cards' | 'tap' | 'numbered';
  animation?: 'slide' | 'fade' | 'slide-up' | 'none';
  cta_style?: 'full_width' | 'inline' | 'outline' | 'floating';
}

interface ExperiencePreviewProps {
  name: string;
  description?: string;
  theme: ExperienceTheme;
  startScreen: ExperienceStartScreen;
  endScreen: ExperienceEndScreen;
  templateConfig?: TemplateConfig;
  templateName?: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  questions: Question[];
  previewUrl?: string;
  publicUrl?: string;
  type: 'quiz' | 'survey';
}

export function ExperiencePreview({
  name,
  description,
  theme,
  startScreen,
  endScreen,
  templateConfig,
  templateName,
  welcomeMessage,
  thankYouMessage,
  questions,
  previewUrl,
  publicUrl,
  type,
}: ExperiencePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewStep, setPreviewStep] = useState<'start' | 'question' | 'end'>('start');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  
  // Merge with defaults
  const currentTheme = useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme]);
  const currentStartScreen = useMemo(() => ({ ...DEFAULT_START_SCREEN, ...startScreen }), [startScreen]);
  const currentEndScreen = useMemo(() => ({ ...DEFAULT_END_SCREEN, ...endScreen }), [endScreen]);
  
  // Default template config
  const currentTemplateConfig = useMemo(() => ({
    layout: 'centered' as const,
    image_position: 'top' as const,
    progress_style: 'bar' as const,
    navigation_style: 'buttons' as const,
    animation: 'slide' as const,
    cta_style: 'full_width' as const,
    ...templateConfig,
  }), [templateConfig]);

  const containerClass = cn(
    "relative rounded-xl border-4 border-muted overflow-hidden transition-all mx-auto",
    viewMode === 'desktop' 
      ? "w-full max-w-2xl aspect-video" 
      : "w-[320px] aspect-[9/16]"
  );

  const handleNext = useCallback(() => {
    if (previewStep === 'start') {
      if (questions.length > 0) {
        setPreviewStep('question');
      } else {
        setPreviewStep('end');
      }
    } else if (previewStep === 'question') {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setPreviewStep('end');
      }
    } else {
      setPreviewStep('start');
      setCurrentQuestion(0);
    }
  }, [previewStep, currentQuestion, questions.length]);

  const question = questions[currentQuestion];
  const questionText = question?.title || question?.question_text || 'Pergunta de exemplo';
  const questionType = question?.type || question?.question_type || 'single_choice';
  const questionOptions = question?.options || ['Opção A', 'Opção B', 'Opção C'];

  // Animation variants based on template config
  const animationVariants = useMemo(() => {
    switch (currentTemplateConfig.animation) {
      case 'fade':
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
      case 'slide-up':
        return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };
      case 'none':
        return { initial: {}, animate: {}, exit: {} };
      case 'slide':
      default:
        return { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };
    }
  }, [currentTemplateConfig.animation]);

  const totalSteps = Math.max(questions.length, 1);
  const progressRatio = previewStep === 'question' ? (currentQuestion + 1) / totalSteps : 0;

  // If template wants image as "background", let it override the theme background per-screen.
  const backgroundImageUrl = useMemo(() => {
    if (currentTemplateConfig.image_position === 'background') {
      if (previewStep === 'start' && currentStartScreen.image_url) return currentStartScreen.image_url;
      if (previewStep === 'end' && currentEndScreen.image_url) return currentEndScreen.image_url;
    }
    return currentTheme.background_image;
  }, [
    currentTemplateConfig.image_position,
    previewStep,
    currentStartScreen.image_url,
    currentEndScreen.image_url,
    currentTheme.background_image,
  ]);

  const stageRootClass = useMemo(() => {
    switch (currentTemplateConfig.layout) {
      case 'sidebar':
        return "h-full flex";
      case 'fullscreen':
        return "h-full";
      case 'grid':
      case 'centered':
      default:
        return "h-full flex items-center justify-center p-4 md:p-8";
    }
  }, [currentTemplateConfig.layout]);

  const mainAreaClass = useMemo(
    () =>
      cn(
        "flex-1",
        currentTemplateConfig.layout === 'sidebar'
          ? 'flex items-center justify-center p-4 md:p-8'
          : currentTemplateConfig.layout === 'fullscreen'
            ? 'h-full'
            : 'flex items-center justify-center'
      ),
    [currentTemplateConfig.layout]
  );

  const surfaceClass = useMemo(() => {
    switch (currentTemplateConfig.layout) {
      case 'fullscreen':
        return 'h-full w-full flex flex-col justify-end p-6 md:p-8 bg-background/70 backdrop-blur-sm';
      case 'grid':
        return 'w-full max-w-2xl rounded-xl border border-border bg-background/80 backdrop-blur-sm shadow-sm p-6';
      case 'sidebar':
        return 'w-full max-w-xl rounded-xl border border-border bg-background/80 backdrop-blur-sm shadow-sm p-6';
      case 'centered':
      default:
        return 'w-full max-w-md rounded-xl border border-border bg-background/80 backdrop-blur-sm shadow-sm p-6';
    }
  }, [currentTemplateConfig.layout]);

  const optionsLayoutClass = useMemo(
    () =>
      cn(
        currentTemplateConfig.layout === 'grid' || currentTemplateConfig.navigation_style === 'cards'
          ? 'grid grid-cols-2 gap-2'
          : 'space-y-2'
      ),
    [currentTemplateConfig.layout, currentTemplateConfig.navigation_style]
  );

  const optionItemBaseClass = useMemo(
    () =>
      cn(
        'rounded-lg border flex items-center gap-2 cursor-pointer transition-all',
        currentTemplateConfig.layout === 'grid' || currentTemplateConfig.navigation_style === 'cards' ? 'p-3' : 'p-2'
      ),
    [currentTemplateConfig.layout, currentTemplateConfig.navigation_style]
  );

  const isOutlineCta = currentTemplateConfig.cta_style === 'outline';
  const ctaClass = useMemo(
    () =>
      cn(
        'gap-2',
        currentTemplateConfig.cta_style === 'full_width' || currentTemplateConfig.layout === 'fullscreen' ? 'w-full' : undefined
      ),
    [currentTemplateConfig.cta_style, currentTemplateConfig.layout]
  );

  const progressEl = useMemo(() => {
    if (!currentTheme.show_progress || previewStep !== 'question') return null;

    // Steps progress is rendered in the sidebar for the sidebar layout.
    if (currentTemplateConfig.progress_style === 'steps' && currentTemplateConfig.layout === 'sidebar') return null;

    const pct = Math.round(progressRatio * 100);

    switch (currentTemplateConfig.progress_style) {
      case 'dots':
        return (
          <div className="absolute top-0 left-0 right-0 bg-background/80 p-2 z-10">
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn('h-1.5 w-1.5 rounded-full transition-all', i === currentQuestion ? 'scale-125' : 'opacity-40')}
                  style={{ backgroundColor: currentTheme.primary_color }}
                />
              ))}
            </div>
          </div>
        );

      case 'percentage':
        return (
          <div className="absolute top-0 left-0 right-0 bg-background/80 p-2 z-10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {currentQuestion + 1}/{totalSteps}
              </span>
              <span>{pct}%</span>
            </div>
          </div>
        );

      case 'segments':
        return (
          <div className="absolute top-0 left-0 right-0 bg-background/80 p-2 z-10">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full"
                  style={{
                    backgroundColor: i <= currentQuestion ? currentTheme.primary_color : 'hsl(var(--muted))',
                    opacity: i <= currentQuestion ? 1 : 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        );

      case 'bar':
      default:
        return (
          <div className="absolute top-0 left-0 right-0 bg-background/80 p-2 z-10">
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: currentTheme.primary_color }}
              />
            </div>
          </div>
        );
    }
  }, [
    currentTheme.show_progress,
    currentTheme.primary_color,
    previewStep,
    currentTemplateConfig.progress_style,
    currentTemplateConfig.layout,
    progressRatio,
    totalSteps,
    currentQuestion,
  ]);

  const sidebarEl = useMemo(() => {
    if (currentTemplateConfig.layout !== 'sidebar') return null;

    const showSteps =
      currentTheme.show_progress &&
      previewStep === 'question' &&
      currentTemplateConfig.progress_style === 'steps' &&
      totalSteps > 1;

    return (
      <div className="hidden md:flex w-56 shrink-0 flex-col gap-4 border-r border-border bg-background/70 backdrop-blur-sm p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Diagnóstico</p>
          <p className="text-sm font-semibold text-foreground line-clamp-2">{name || 'Quiz'}</p>
          {description && <p className="text-xs text-muted-foreground line-clamp-3">{description}</p>}
        </div>

        {showSteps && (
          <div className="space-y-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    i === currentQuestion ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-50'
                  )}
                  style={{ backgroundColor: currentTheme.primary_color }}
                />
                <span className={cn('text-xs', i === currentQuestion ? 'text-foreground' : 'text-muted-foreground')}>
                  Etapa {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [
    currentTemplateConfig.layout,
    currentTemplateConfig.progress_style,
    currentTheme.show_progress,
    currentTheme.primary_color,
    previewStep,
    totalSteps,
    currentQuestion,
    name,
    description,
  ]);

  return (
    <div className="space-y-4">
      {/* Template indicator */}
      {templateName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-muted">Layout: {templateName}</span>
          <span className="px-2 py-1 rounded bg-muted">Animação: {currentTemplateConfig.animation}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
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
              Preview
            </Button>
          )}
          {publicUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(publicUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Produção
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
            <div className="absolute top-0 left-0 right-0 bg-background/80 p-2 z-10">
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
              {/* Start Screen */}
              {previewStep === 'start' && (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center max-w-md space-y-4"
                >
                  {currentTheme.logo_url && (
                    <img 
                      src={currentTheme.logo_url} 
                      alt="Logo" 
                      className="h-10 w-auto mx-auto object-contain"
                    />
                  )}
                  {currentStartScreen.image_url && (
                    <img 
                      src={currentStartScreen.image_url} 
                      alt="" 
                      className="w-24 h-24 mx-auto rounded-xl object-cover"
                    />
                  )}
                  <h2 
                    className="text-lg md:text-xl font-bold"
                    style={{ color: currentTheme.text_color }}
                  >
                    {currentStartScreen.headline || name}
                  </h2>
                  {currentStartScreen.subheadline && (
                    <p 
                      className="text-sm"
                      style={{ color: currentTheme.secondary_text_color }}
                    >
                      {currentStartScreen.subheadline}
                    </p>
                  )}
                  {welcomeMessage && (
                    <p 
                      className="text-xs"
                      style={{ color: currentTheme.secondary_text_color }}
                    >
                      {welcomeMessage}
                    </p>
                  )}
                  
                  {currentStartScreen.estimated_time && (
                    <div 
                      className="flex items-center justify-center gap-2 text-xs"
                      style={{ color: currentTheme.secondary_text_color }}
                    >
                      <Clock className="h-3 w-3" />
                      <span>Aprox. {currentStartScreen.estimated_time}</span>
                    </div>
                  )}

                  {(currentStartScreen.benefits || []).length > 0 && (
                    <div className="space-y-1 text-left">
                      {currentStartScreen.benefits?.map((benefit, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-2 text-xs"
                          style={{ color: currentTheme.benefits_text_color || currentTheme.secondary_text_color }}
                        >
                          <CheckCircle 
                            className="h-3 w-3 shrink-0" 
                            style={{ color: currentTheme.benefits_icon_color || currentTheme.primary_color }}
                          />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleNext}
                    style={{ backgroundColor: currentTheme.primary_color }}
                    className="gap-2"
                  >
                    <Play className="h-3 w-3" />
                    {currentStartScreen.cta_text || 'Começar'}
                  </Button>
                </motion.div>
              )}

              {/* Question Screen */}
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
                    <h3 
                      className="text-base md:text-lg font-medium"
                      style={{ color: currentTheme.text_color }}
                    >
                      {questionText}
                    </h3>
                  </div>

                  {/* Options based on question type */}
                  {(questionType === 'single_choice' || questionType === 'multiple_choice') && (
                    <div className="space-y-2">
                      {questionOptions.slice(0, 4).map((opt, i) => {
                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                        return (
                          <div 
                            key={i}
                            className={cn(
                              "p-2 rounded-lg border text-sm flex items-center gap-2 cursor-pointer transition-all",
                              i === 0 ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                            )}
                            style={{
                              borderColor: i === 0 ? currentTheme.primary_color : undefined,
                              backgroundColor: i === 0 ? `${currentTheme.primary_color}10` : undefined,
                              color: currentTheme.input_text_color,
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
                            <span className="text-xs">{optLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {questionType === 'scale' && (
                    <div className="flex justify-center gap-1 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          className={cn(
                            "w-6 h-6 md:w-8 md:h-8 rounded text-xs font-medium transition-all",
                            n === 8 ? "text-white" : "bg-muted hover:bg-muted/80"
                          )}
                          style={{ 
                            backgroundColor: n === 8 ? currentTheme.primary_color : undefined,
                            color: n === 8 ? 'white' : currentTheme.input_text_color,
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}

                  {(questionType === 'text' || questionType === 'identity_field') && (
                    <div 
                      className="border-b-2 border-muted py-2"
                      style={{ color: currentTheme.secondary_text_color }}
                    >
                      <span className="text-sm opacity-50">Digite sua resposta...</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="w-full"
                    style={{ backgroundColor: currentTheme.primary_color }}
                  >
                    {currentQuestion === questions.length - 1 ? 'Finalizar' : 'Próxima'}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </motion.div>
              )}

              {/* End Screen */}
              {previewStep === 'end' && (
                <motion.div
                  key="end"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center max-w-md space-y-4"
                >
                  {currentTheme.logo_url && (
                    <img 
                      src={currentTheme.logo_url} 
                      alt="Logo" 
                      className="h-8 w-auto mx-auto object-contain"
                    />
                  )}
                  <div 
                    className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                    style={{ backgroundColor: `${currentTheme.primary_color}20` }}
                  >
                    <Check className="h-6 w-6" style={{ color: currentTheme.primary_color }} />
                  </div>
                  {currentEndScreen.image_url && (
                    <img 
                      src={currentEndScreen.image_url} 
                      alt="" 
                      className="w-20 h-20 mx-auto rounded-xl object-cover"
                    />
                  )}
                  <h3 
                    className="text-lg font-bold"
                    style={{ color: currentTheme.text_color }}
                  >
                    {currentEndScreen.headline || 'Obrigado!'}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: currentTheme.secondary_text_color }}
                  >
                    {currentEndScreen.subheadline || thankYouMessage || 'Sua resposta foi enviada com sucesso.'}
                  </p>
                  
                  {currentEndScreen.cta_text && currentEndScreen.cta_url && (
                    <Button
                      size="sm"
                      style={{ backgroundColor: currentTheme.primary_color }}
                    >
                      {currentEndScreen.cta_text}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
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
        Clique nos botões para navegar pelo preview • Este é exatamente o que o usuário verá
      </p>
    </div>
  );
}
