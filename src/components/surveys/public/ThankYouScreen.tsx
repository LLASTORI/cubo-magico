import { motion } from 'framer-motion';
import { CheckCircle2, PartyPopper } from 'lucide-react';

interface ThankYouScreenProps {
  message?: string;
  logoUrl?: string;
  primaryColor?: string;
  textColor?: string;
}

export function ThankYouScreen({ 
  message = 'Obrigado por participar! Sua resposta foi enviada com sucesso.',
  logoUrl,
  primaryColor = '#6366f1',
  textColor = '#1e293b'
}: ThankYouScreenProps) {
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
        className="text-lg text-muted-foreground max-w-md"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
