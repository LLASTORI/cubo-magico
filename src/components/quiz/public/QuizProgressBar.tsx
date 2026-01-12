import { motion } from 'framer-motion';

interface QuizProgressBarProps {
  progress: number;
  /** Use quiz primary color instead of global theme primary */
  color?: string;
  /** When true, uses absolute positioning inside a relative container (for embedded previews) */
  embedded?: boolean;
}

export function QuizProgressBar({ progress, color, embedded }: QuizProgressBarProps) {
  const wrapperClass = embedded
    ? 'absolute top-0 left-0 right-0 z-50'
    : 'fixed top-0 left-0 right-0 z-50';

  return (
    <div className={wrapperClass}>
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

