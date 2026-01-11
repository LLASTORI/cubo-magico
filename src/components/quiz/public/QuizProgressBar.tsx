import { motion } from 'framer-motion';

interface QuizProgressBarProps {
  progress: number;
}

export function QuizProgressBar({ progress }: QuizProgressBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
