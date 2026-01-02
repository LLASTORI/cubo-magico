import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuestionScaleProps {
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number) => void;
  minLabel?: string;
  maxLabel?: string;
  primaryColor?: string;
}

export function QuestionScale({ 
  min, 
  max, 
  value, 
  onChange,
  minLabel,
  maxLabel,
  primaryColor = '#6366f1'
}: QuestionScaleProps) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const isNPS = min === 0 && max === 10;
  
  const getScaleColor = (num: number): string => {
    if (!isNPS) return primaryColor;
    
    // NPS colors: red (0-6), yellow (7-8), green (9-10)
    if (num <= 6) return '#ef4444';
    if (num <= 8) return '#f59e0b';
    return '#22c55e';
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        {numbers.map((num, index) => {
          const isSelected = value === num;
          const color = getScaleColor(num);
          
          return (
            <motion.button
              key={num}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => onChange(num)}
              className={cn(
                "w-12 h-12 md:w-14 md:h-14 rounded-xl font-semibold text-lg transition-all duration-200",
                "hover:scale-110 hover:shadow-lg",
                "flex items-center justify-center",
                isSelected 
                  ? "text-white shadow-lg scale-110" 
                  : "bg-card border-2 border-border text-foreground hover:border-primary/50"
              )}
              style={{
                backgroundColor: isSelected ? color : undefined,
                borderColor: isSelected ? color : undefined,
              }}
            >
              {num}
            </motion.button>
          );
        })}
      </div>
      
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-sm text-muted-foreground px-2">
          <span>{minLabel || min}</span>
          <span>{maxLabel || max}</span>
        </div>
      )}
    </motion.div>
  );
}
