import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SurveyProgressProps {
  current: number;
  total: number;
  showPercentage?: boolean;
}

export function SurveyProgress({ current, total, showPercentage = true }: SurveyProgressProps) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="w-full space-y-2">
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{current} de {total}</span>
          <span>{percentage}%</span>
        </div>
      )}
    </div>
  );
}
