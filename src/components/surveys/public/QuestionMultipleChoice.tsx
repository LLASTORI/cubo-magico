import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionMultipleChoiceProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  primaryColor?: string;
}

export function QuestionMultipleChoice({ 
  options, 
  value, 
  onChange,
  primaryColor = '#6366f1'
}: QuestionMultipleChoiceProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      {options.map((option, index) => {
        const isSelected = value === option;
        const letter = String.fromCharCode(65 + index); // A, B, C...
        
        return (
          <motion.button
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            onClick={() => onChange(option)}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200",
              "hover:scale-[1.02] hover:shadow-lg",
              "text-left group",
              isSelected 
                ? "border-primary bg-primary/5 shadow-md" 
                : "border-border hover:border-primary/50 bg-card"
            )}
            style={{
              borderColor: isSelected ? primaryColor : undefined,
              backgroundColor: isSelected ? `${primaryColor}10` : undefined,
            }}
          >
            <span 
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all",
                isSelected 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground group-hover:bg-primary/20"
              )}
              style={{
                backgroundColor: isSelected ? primaryColor : undefined,
              }}
            >
              {isSelected ? <Check className="h-4 w-4" /> : letter}
            </span>
            <span className={cn(
              "text-lg transition-colors",
              isSelected ? "text-foreground font-medium" : "text-foreground/80"
            )}>
              {option}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
