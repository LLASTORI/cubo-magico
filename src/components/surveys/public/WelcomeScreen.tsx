import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeScreenProps {
  title: string;
  description?: string;
  welcomeMessage?: string;
  logoUrl?: string;
  onStart: () => void;
  primaryColor?: string;
}

export function WelcomeScreen({ 
  title, 
  description, 
  welcomeMessage,
  logoUrl,
  onStart,
  primaryColor = '#6366f1'
}: WelcomeScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      {logoUrl && (
        <motion.img
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          src={logoUrl}
          alt="Logo"
          className="h-16 w-auto mb-8 object-contain"
        />
      )}
      
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl md:text-4xl font-bold mb-4"
      >
        {title}
      </motion.h1>
      
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-muted-foreground mb-6 max-w-xl"
        >
          {description}
        </motion.p>
      )}
      
      {welcomeMessage && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-base text-muted-foreground mb-8 max-w-lg"
        >
          {welcomeMessage}
        </motion.p>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          size="lg"
          onClick={onStart}
          className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          Começar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
