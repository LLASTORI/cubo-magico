import { motion } from 'framer-motion';
import { Play, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuizStartScreenProps {
  config?: {
    headline?: string;
    subheadline?: string;
    image_url?: string;
    cta_text?: string;
    estimated_time?: string;
    benefits?: string[];
  };
  quizName?: string;
  onStart: () => void;
}

export function QuizStartScreen({ config, quizName, onStart }: QuizStartScreenProps) {
  const headline = config?.headline || quizName || 'Descubra seu perfil';
  const subheadline = config?.subheadline || 'Responda algumas perguntas rápidas e descubra insights valiosos sobre você.';
  const ctaText = config?.cta_text || 'Começar Quiz';
  const estimatedTime = config?.estimated_time || '2 minutos';
  const benefits = config?.benefits || [
    'Perguntas rápidas e objetivas',
    'Resultado personalizado',
    'Insights exclusivos',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg text-center space-y-8"
      >
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
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            {headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            {subheadline}
          </motion.p>
        </div>

        {/* Time estimate */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 text-muted-foreground"
        >
          <Clock className="h-4 w-4" />
          <span className="text-sm">Aproximadamente {estimatedTime}</span>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-left justify-center">
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </motion.div>

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
          >
            <Play className="h-5 w-5" />
            {ctaText}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
