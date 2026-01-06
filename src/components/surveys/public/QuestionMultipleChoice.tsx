import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Square, CheckSquare, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface QuestionMultipleChoiceProps {
  options: string[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  primaryColor?: string;
  allowMultiple?: boolean;
  maxSelections?: number;
  allowOther?: boolean;
  otherPlaceholder?: string;
}

export function QuestionMultipleChoice({ 
  options, 
  value, 
  onChange,
  primaryColor = '#6366f1',
  allowMultiple = false,
  maxSelections = 0,
  allowOther = false,
  otherPlaceholder = 'Digite sua resposta...',
}: QuestionMultipleChoiceProps) {
  const [otherText, setOtherText] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  // Normalize value to array for multiple selection mode
  const selectedValues: string[] = allowMultiple 
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : [];
  
  const singleValue = allowMultiple ? '' : (Array.isArray(value) ? value[0] || '' : value || '');

  // Detect if "Other" is already selected (value starts with "other:")
  useEffect(() => {
    if (allowMultiple) {
      const otherValue = selectedValues.find(v => v?.startsWith('other:'));
      if (otherValue) {
        setIsOtherSelected(true);
        setOtherText(otherValue.replace('other:', ''));
      } else {
        setIsOtherSelected(false);
        setOtherText('');
      }
    } else {
      if (singleValue?.startsWith('other:')) {
        setIsOtherSelected(true);
        setOtherText(singleValue.replace('other:', ''));
      } else if (!singleValue) {
        // Only reset if value is empty (not when selecting a regular option)
      }
    }
  }, [value, allowMultiple]);

  const handleSelect = (option: string) => {
    // Deselect "Other" when selecting a regular option in single mode
    if (!allowMultiple && isOtherSelected) {
      setIsOtherSelected(false);
      setOtherText('');
    }

    if (allowMultiple) {
      const isSelected = selectedValues.includes(option);
      let newValues: string[];
      
      if (isSelected) {
        // Remove from selection
        newValues = selectedValues.filter(v => v !== option);
      } else {
        // Check max selections limit (count "other" as one selection)
        const currentCount = selectedValues.filter(v => !v.startsWith('other:')).length + (isOtherSelected ? 1 : 0);
        if (maxSelections > 0 && currentCount >= maxSelections) {
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

  const handleOtherSelect = () => {
    if (allowMultiple) {
      if (isOtherSelected) {
        // Remove "Other" from selection
        const newValues = selectedValues.filter(v => !v.startsWith('other:'));
        onChange(newValues);
        setIsOtherSelected(false);
        setOtherText('');
      } else {
        // Check max selections limit
        const currentCount = selectedValues.filter(v => !v.startsWith('other:')).length;
        if (maxSelections > 0 && currentCount >= maxSelections) {
          return;
        }
        setIsOtherSelected(true);
      }
    } else {
      if (isOtherSelected) {
        setIsOtherSelected(false);
        setOtherText('');
        onChange('');
      } else {
        setIsOtherSelected(true);
        onChange('other:');
      }
    }
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(text);
    const otherValue = `other:${text}`;
    
    if (allowMultiple) {
      const filteredValues = selectedValues.filter(v => !v.startsWith('other:'));
      onChange([...filteredValues, otherValue]);
    } else {
      onChange(otherValue);
    }
  };

  const currentSelectionCount = allowMultiple 
    ? selectedValues.filter(v => !v.startsWith('other:')).length + (isOtherSelected ? 1 : 0)
    : 0;
  const isAtMaxSelections = allowMultiple && maxSelections > 0 && currentSelectionCount >= maxSelections;

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

      {/* Other option */}
      {allowOther && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * (options.length + 1) }}
            onClick={handleOtherSelect}
            disabled={!isOtherSelected && isAtMaxSelections}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200",
              "text-left group",
              !isOtherSelected && isAtMaxSelections
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-[1.02] hover:shadow-lg",
              isOtherSelected 
                ? "border-primary bg-primary/5 shadow-md" 
                : "border-border hover:border-primary/50 bg-card"
            )}
            style={{
              borderColor: isOtherSelected ? primaryColor : undefined,
              backgroundColor: isOtherSelected ? `${primaryColor}10` : undefined,
            }}
          >
            <span 
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all",
                isOtherSelected 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground group-hover:bg-primary/20"
              )}
              style={{
                backgroundColor: isOtherSelected ? primaryColor : undefined,
              }}
            >
              {allowMultiple ? (
                isOtherSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />
              ) : (
                isOtherSelected ? <Check className="h-4 w-4" /> : <PenLine className="h-4 w-4" />
              )}
            </span>
            <span className={cn(
              "text-lg transition-colors",
              isOtherSelected ? "text-foreground font-medium" : "text-foreground/80"
            )}>
              Outro
            </span>
          </motion.button>
          
          {isOtherSelected && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-12"
            >
              <Input
                value={otherText}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                placeholder={otherPlaceholder}
                className="mt-2"
                autoFocus
              />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
