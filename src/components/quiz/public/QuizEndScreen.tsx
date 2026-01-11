import { motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizVectorBars } from '@/components/crm/QuizVectorBars';

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
  };
}

export function QuizEndScreen({ config, theme, logoUrl, result }: QuizEndScreenProps) {
  const headline = config?.headline || 'Parabéns!';
  const subheadline = config?.subheadline || 'Você completou o quiz com sucesso.';
  const ctaText = config?.cta_text;
  const ctaUrl = config?.cta_url;
  const showResults = config?.show_results !== false;
  const showShare = config?.show_share !== false;

  const summaryText = result?.summary?.text || 
    (result?.summary?.primary_trait && result?.summary?.primary_intent
      ? `Seu perfil indica tendência ${result.summary.primary_trait} com alta intenção de ${result.summary.primary_intent}.`
      : 'Seu resultado foi processado com sucesso.');

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
        title: 'Meu resultado do quiz',
        text: summaryText,
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
        className="w-full max-w-lg text-center space-y-8"
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
        <div className="space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold"
            style={{ color: theme?.text_color }}
          >
            {headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg"
            style={{ color: theme?.secondary_text_color }}
          >
            {subheadline}
          </motion.p>
        </div>

        {/* Summary */}
        {showResults && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card rounded-xl p-6 shadow-sm border space-y-4 text-left"
          >
            <p 
              className="text-sm"
              style={{ color: theme?.secondary_text_color }}
            >
              {summaryText}
            </p>

            {result.intent_vector && Object.keys(result.intent_vector).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: theme?.secondary_text_color }}>
                  Perfil de Intenção
                </h4>
                <QuizVectorBars vector={result.intent_vector} type="intent" maxItems={3} />
              </div>
            )}

            {result.traits_vector && Object.keys(result.traits_vector).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: theme?.secondary_text_color }}>
                  Perfil Comportamental
                </h4>
                <QuizVectorBars vector={result.traits_vector} type="traits" maxItems={3} />
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
