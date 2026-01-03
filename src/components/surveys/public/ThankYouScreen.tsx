import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, PartyPopper, Gift, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface ThankYouScreenProps {
  message?: string;
  logoUrl?: string;
  primaryColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  completionSettings?: CompletionSettings;
}

export function ThankYouScreen({ 
  message = 'Obrigado por participar! Sua resposta foi enviada com sucesso.',
  logoUrl,
  primaryColor = '#6366f1',
  textColor = '#1e293b',
  secondaryTextColor = '#64748b',
  completionSettings
}: ThankYouScreenProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Auto-redirect countdown
  useEffect(() => {
    if (
      completionSettings?.enable_auto_redirect && 
      completionSettings?.redirect_url
    ) {
      const delay = completionSettings.redirect_delay_seconds || 5;
      setCountdown(delay);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            window.location.href = completionSettings.redirect_url!;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [completionSettings]);

  const handleCTAClick = (button: CTAButton) => {
    if (button.open_in_new_tab) {
      window.open(button.url, '_blank');
    } else {
      window.location.href = button.url;
    }
  };

  const getButtonVariant = (style: CTAButton['style']) => {
    switch (style) {
      case 'primary': return 'default';
      case 'secondary': return 'secondary';
      case 'outline': return 'outline';
      default: return 'default';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      {logoUrl && (
        <motion.img
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          src={logoUrl}
          alt="Logo"
          className="h-12 w-auto mb-8 object-contain"
        />
      )}
      
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="relative mb-6"
      >
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <CheckCircle2 
            className="h-12 w-12"
            style={{ color: primaryColor }}
          />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-2 -right-2"
        >
          <PartyPopper className="h-8 w-8 text-yellow-500" />
        </motion.div>
      </motion.div>
      
      {/* Reward Highlight */}
      {completionSettings?.reward_highlight && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-4 px-4 py-2 rounded-full flex items-center gap-2"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
        >
          <Gift className="h-5 w-5" />
          <span className="font-semibold">{completionSettings.reward_highlight}</span>
        </motion.div>
      )}
      
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl md:text-3xl font-bold mb-4"
        style={{ color: textColor }}
      >
        Obrigado!
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg max-w-md"
        style={{ color: secondaryTextColor }}
      >
        {message}
      </motion.p>
      
      {/* Reward Message */}
      {completionSettings?.reward_message && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-base mt-4 max-w-md p-4 rounded-lg bg-muted/50"
          style={{ color: textColor }}
        >
          {completionSettings.reward_message}
        </motion.p>
      )}
      
      {/* CTA Buttons */}
      {completionSettings?.cta_buttons && completionSettings.cta_buttons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-md"
        >
          {completionSettings.cta_buttons.map((button, index) => (
            <Button
              key={button.id}
              variant={getButtonVariant(button.style)}
              size="lg"
              className="flex-1 gap-2"
              style={button.style === 'primary' ? { backgroundColor: primaryColor } : undefined}
              onClick={() => handleCTAClick(button)}
            >
              {button.label}
              {button.open_in_new_tab && <ExternalLink className="h-4 w-4" />}
            </Button>
          ))}
        </motion.div>
      )}
      
      {/* Auto-redirect countdown */}
      {countdown !== null && countdown > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 flex items-center gap-2 text-sm"
          style={{ color: secondaryTextColor }}
        >
          <Clock className="h-4 w-4" />
          <span>Redirecionando em {countdown} segundos...</span>
        </motion.div>
      )}
    </motion.div>
  );
}
