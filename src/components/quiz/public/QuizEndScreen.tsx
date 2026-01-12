import { motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, Share2, Sparkles, Heart, Target, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateQuizResultCopy, type QuizResultData } from '@/lib/quizResultNarrative';
import { getSemanticLabels } from '@/lib/semanticProfileEngine';

interface ThemeConfig {
  primary_color?: string;
  text_color?: string;
  secondary_text_color?: string;
  background_color?: string;
  background_image?: string;
}

interface QuizEndScreenProps {
  config?: {
    headline?: string;
    subheadline?: string;
    image_url?: string;
    cta_text?: string;
    cta_url?: string;
    show_results?: boolean;
    show_share?: boolean;
  };
  theme?: ThemeConfig;
  logoUrl?: string;
  result?: {
    summary?: {
      text?: string;
      primary_trait?: string;
      primary_intent?: string;
    };
    traits_vector?: Record<string, number>;
    intent_vector?: Record<string, number>;
    normalized_score?: number;
    confidence?: number;
    entropy?: number;
  };
  quizName?: string;
}

export function QuizEndScreen({ config, theme, logoUrl, result, quizName }: QuizEndScreenProps) {
  const showResults = config?.show_results !== false;
  const showShare = config?.show_share !== false;

  // Generate semantic narrative from result
  const resultData: QuizResultData = result || {};
  const narrative = generateQuizResultCopy(resultData, { quiz_name: quizName });

  // Use custom config or generated narrative
  const headline = config?.headline || narrative.title;
  const subheadline = config?.subheadline || narrative.subtitle;
  const ctaText = config?.cta_text || narrative.cta_text;
  const ctaUrl = config?.cta_url;

  // Get semantic labels for display
  const intentLabels = result?.intent_vector 
    ? getSemanticLabels(result.intent_vector, 'intent', 3)
    : [];
  const traitLabels = result?.traits_vector 
    ? getSemanticLabels(result.traits_vector, 'trait', 3)
    : [];

  // Background style
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: theme?.background_color || undefined,
  };
  
  if (theme?.background_image) {
    backgroundStyle.backgroundImage = `url(${theme.background_image})`;
    backgroundStyle.backgroundSize = 'cover';
    backgroundStyle.backgroundPosition = 'center';
  }

  // Button style with primary color
  const buttonStyle: React.CSSProperties = theme?.primary_color ? {
    backgroundColor: theme.primary_color,
    borderColor: theme.primary_color,
  } : {};

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: headline,
        text: narrative.explanation,
        url: window.location.href,
      });
    }
  };

  // Fix: when user sets background color/image, remove gradient background-image from Tailwind
  const hasCustomBackground = Boolean(theme?.background_color || theme?.background_image);
  const containerClass = `min-h-screen flex items-center justify-center p-6 ${
    hasCustomBackground ? '' : 'bg-gradient-to-br from-background via-background to-muted'
  }`;

  return (
    <div className={containerClass} style={backgroundStyle}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg text-center space-y-6"
      >
        {/* Logo */}
        {logoUrl && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            src={logoUrl}
            alt="Logo"
            className="h-16 mx-auto object-contain"
          />
        )}

        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <div 
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: theme?.primary_color 
                ? `${theme.primary_color}20` 
                : 'hsl(var(--success) / 0.1)' 
            }}
          >
            <CheckCircle2 
              className="h-10 w-10" 
              style={{ color: theme?.primary_color || 'hsl(var(--success))' }}
            />
          </div>
        </motion.div>

        {/* Image */}
        {config?.image_url && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            src={config.image_url}
            alt=""
            className="w-32 h-32 mx-auto rounded-2xl object-cover shadow-lg"
          />
        )}

        {/* Headlines */}
        <div className="space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl md:text-3xl font-bold"
            style={{ color: theme?.text_color }}
          >
            {headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-base"
            style={{ color: theme?.secondary_text_color }}
          >
            {subheadline}
          </motion.p>
        </div>

        {/* Semantic Profile Summary - Human-Readable */}
        {showResults && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-xl p-5 shadow-sm border space-y-4 text-left"
          >
            {/* Profile Description */}
            <p 
              className="text-sm leading-relaxed"
              style={{ color: theme?.secondary_text_color }}
            >
              {narrative.explanation}
            </p>

            {/* Key Insights - Human Labels */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Buying Style */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  <ShoppingBag className="h-3 w-3" />
                  Estilo de Decisão
                </div>
                <p className="text-xs font-medium">
                  {narrative.semantic_profile.buying_style}
                </p>
              </div>

              {/* Emotional Driver */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  <Heart className="h-3 w-3" />
                  O Que Te Motiva
                </div>
                <p className="text-xs font-medium capitalize">
                  {narrative.semantic_profile.emotional_driver}
                </p>
              </div>
            </div>

            {/* Semantic Labels - NOT raw vectors */}
            {(intentLabels.length > 0 || traitLabels.length > 0) && (
              <div className="space-y-3 pt-3 border-t">
                {/* Intent Labels */}
                {intentLabels.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Target className="h-3 w-3" />
                      Seu Momento
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {intentLabels.map(({ key, label, value }) => (
                        <Badge 
                          key={key} 
                          variant="secondary"
                          className="text-[10px] font-normal"
                          style={theme?.primary_color ? { 
                            backgroundColor: `${theme.primary_color}15`,
                            color: theme.primary_color 
                          } : undefined}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trait Labels */}
                {traitLabels.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      Suas Características
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {traitLabels.map(({ key, label, value }) => (
                        <Badge 
                          key={key} 
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          {ctaText && ctaUrl && (
            <Button
              onClick={() => window.location.href = ctaUrl}
              size="lg"
              className="w-full max-w-xs h-14 text-lg gap-2 shadow-lg hover:shadow-xl transition-shadow"
              style={buttonStyle}
            >
              {ctaText}
              <ExternalLink className="h-5 w-5" />
            </Button>
          )}

          {showShare && (
            <Button
              variant="outline"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar resultado
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
