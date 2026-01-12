import { motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateConversionNarrative, detectTopicFromName } from '@/lib/resultNarrativeEngine';

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

  // Generate 4-layer conversion narrative
  const detectedTopic = detectTopicFromName(quizName);
  const narrative = generateConversionNarrative(
    {
      intent_vector: result?.intent_vector,
      traits_vector: result?.traits_vector,
      confidence: result?.confidence,
      entropy: result?.entropy,
      normalized_score: result?.normalized_score
    },
    { name: quizName, topic: detectedTopic }
  );

  // Use custom config if provided, otherwise use generated narrative
  const headline = config?.headline || narrative.title;
  const ctaText = config?.cta_text || 'Quero saber mais';
  const ctaUrl = config?.cta_url;

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
        text: narrative.mirror,
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

        {/* 1️⃣ Profile Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl md:text-3xl font-bold"
          style={{ color: theme?.text_color }}
        >
          {headline}
        </motion.h1>

        {/* 4-Layer Persuasive Narrative */}
        {showResults && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-xl p-6 shadow-sm border space-y-5 text-left"
          >
            {/* 2️⃣ Psychological Mirror */}
            <p 
              className="text-base leading-relaxed"
              style={{ color: theme?.text_color }}
            >
              {narrative.mirror}
            </p>

            {/* 3️⃣ Implicit Pain */}
            <p 
              className="text-sm leading-relaxed"
              style={{ color: theme?.secondary_text_color }}
            >
              {narrative.pain}
            </p>

            {/* 4️⃣ Bridge to Offer */}
            <p 
              className="text-sm leading-relaxed font-medium"
              style={{ color: theme?.primary_color || 'hsl(var(--primary))' }}
            >
              {narrative.bridge}
            </p>
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
