import { motion } from 'framer-motion';
import { Play, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeConfig {
  primary_color?: string;
  text_color?: string;
  secondary_text_color?: string;
  background_color?: string;
  background_image?: string;
  benefits_text_color?: string;
  benefits_icon_color?: string;
}

interface QuizStartScreenProps {
  config?: {
    headline?: string;
    subheadline?: string;
    description?: string;
    image_url?: string;
    cta_text?: string;
    estimated_time?: string;
    benefits?: string[];
  };
  theme?: ThemeConfig;
  quizName?: string;
  logoUrl?: string;
  onStart: () => void;
}

export function QuizStartScreen({ config, theme, quizName, logoUrl, onStart }: QuizStartScreenProps) {
  const headline = config?.headline || quizName || 'Descubra seu perfil';
  const subheadline = config?.subheadline || 'Responda algumas perguntas rápidas e descubra insights valiosos sobre você.';
  const ctaText = config?.cta_text || 'Começar Quiz';
  const estimatedTime = config?.estimated_time || '2 minutos';
  const benefits = config?.benefits?.length ? config.benefits : [
    'Perguntas rápidas e objetivas',
    'Resultado personalizado',
    'Insights exclusivos',
  ];

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

  // Fix: when user sets background color/image, remove gradient background-image from Tailwind
  const hasCustomBackground = Boolean(theme?.background_color || theme?.background_image);
  const containerClass = `min-h-screen flex items-center justify-center p-6 ${
    hasCustomBackground ? '' : 'bg-gradient-to-br from-background via-background to-muted'
  }`;

  const benefitsIconColor = theme?.benefits_icon_color || theme?.primary_color || 'hsl(var(--success))';
  const benefitsTextColor = theme?.benefits_text_color || theme?.secondary_text_color;

  return (
    <div className={containerClass} style={backgroundStyle}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg text-center space-y-8"
      >
        {/* Logo */}
        {logoUrl && (
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            src={logoUrl}
            alt="Logo"
            className="h-16 mx-auto object-contain"
          />
        )}

        {/* Image */}
        {config?.image_url && (
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            src={config.image_url}
            alt=""
            className="w-32 h-32 mx-auto rounded-2xl object-cover shadow-lg"
          />
        )}

        {/* Headlines */}
        <div className="space-y-4">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold"
            style={{ color: theme?.text_color }}
          >
            {headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg"
            style={{ color: theme?.secondary_text_color }}
          >
            {subheadline}
          </motion.p>
          {config?.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-base"
              style={{ color: theme?.secondary_text_color }}
            >
              {config.description}
            </motion.p>
          )}
        </div>

        {/* Time estimate */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2"
          style={{ color: theme?.secondary_text_color }}
        >
          <Clock className="h-4 w-4" />
          <span className="text-sm">Aproximadamente {estimatedTime}</span>
        </motion.div>

        {/* Benefits */}
        {benefits.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
              {benefits.map((benefit, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 text-left justify-center"
                >
                  <CheckCircle 
                    className="h-4 w-4 shrink-0" 
                    style={{ color: benefitsIconColor }}
                  />
                  <span 
                    className="text-sm"
                    style={{ color: benefitsTextColor }}
                  >
                    {benefit}
                  </span>
                </div>
              ))}
          </motion.div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onStart}
            size="lg"
            className="w-full max-w-xs h-14 text-lg gap-2 shadow-lg hover:shadow-xl transition-shadow"
            style={buttonStyle}
          >
            <Play className="h-5 w-5" />
            {ctaText}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
