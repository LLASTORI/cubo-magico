import { motion } from 'framer-motion';
import { Check, Square, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionMultipleChoiceProps {
  options: string[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  primaryColor?: string;
  allowMultiple?: boolean;
  maxSelections?: number;
}

export function QuestionMultipleChoice({ 
  options, 
  value, 
  onChange,
  primaryColor = '#6366f1',
  allowMultiple = false,
  maxSelections = 0,
}: QuestionMultipleChoiceProps) {
  // Normalize value to array for multiple selection mode
  const selectedValues: string[] = allowMultiple 
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : [];
  
  const singleValue = allowMultiple ? '' : (Array.isArray(value) ? value[0] || '' : value || '');

  const handleSelect = (option: string) => {
    if (allowMultiple) {
      const isSelected = selectedValues.includes(option);
      let newValues: string[];
      
      if (isSelected) {
        // Remove from selection
        newValues = selectedValues.filter(v => v !== option);
      } else {
        // Check max selections limit
        if (maxSelections > 0 && selectedValues.length >= maxSelections) {
          // Already at max, don't add more
          return;
        }
        // Add to selection
        newValues = [...selectedValues, option];
      }
      
      onChange(newValues);
    } else {
      // Single selection mode
      onChange(option);
    }
  };

  const isAtMaxSelections = allowMultiple && maxSelections > 0 && selectedValues.length >= maxSelections;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="space-y-3"
    >
      {allowMultiple && maxSelections > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Selecione até {maxSelections} {maxSelections === 1 ? 'opção' : 'opções'}
          {selectedValues.length > 0 && (
            <span className="ml-1 font-medium">
              ({selectedValues.length}/{maxSelections})
            </span>
          )}
        </p>
      )}
      
      {allowMultiple && maxSelections === 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Selecione uma ou mais opções
          {selectedValues.length > 0 && (
            <span className="ml-1 font-medium">
              ({selectedValues.length} selecionadas)
            </span>
          )}
        </p>
      )}

      {options.map((option, index) => {
        const isSelected = allowMultiple 
          ? selectedValues.includes(option)
          : singleValue === option;
        const letter = String.fromCharCode(65 + index); // A, B, C...
        const isDisabled = allowMultiple && !isSelected && isAtMaxSelections;
        
        return (
          <motion.button
            key={index}
            type="button"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            onClick={() => handleSelect(option)}
            disabled={isDisabled}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200",
              "text-left group",
              isDisabled 
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-[1.02] hover:shadow-lg",
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
              {allowMultiple ? (
                isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />
              ) : (
                isSelected ? <Check className="h-4 w-4" /> : letter
              )}
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
