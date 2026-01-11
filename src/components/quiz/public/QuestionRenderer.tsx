import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface QuestionRendererProps {
  question: {
    id: string;
    question_text: string;
    description?: string;
    question_type: 'single_choice' | 'multiple_choice' | 'scale' | 'text';
    is_required: boolean;
    config?: Record<string, any>;
    quiz_options?: Array<{
      id: string;
      option_text: string;
      position: number;
    }>;
  };
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: { option_id?: string; option_ids?: string[]; answer_text?: string; answer_value?: number }) => void;
}

export function QuestionRenderer({ question, questionNumber, totalQuestions, onAnswer }: QuestionRendererProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [scaleValue, setScaleValue] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const options = question.quiz_options || [];
  const scaleMin = question.config?.scale_min ?? 1;
  const scaleMax = question.config?.scale_max ?? 10;

  const handleSingleChoice = (optionId: string) => {
    setSelectedOption(optionId);
    setIsSubmitting(true);
    // Auto-advance after short delay
    setTimeout(() => {
      onAnswer({ option_id: optionId });
    }, 400);
  };

  const handleMultipleChoice = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const submitMultipleChoice = () => {
    if (selectedOptions.length === 0 && question.is_required) return;
    setIsSubmitting(true);
    onAnswer({ option_ids: selectedOptions });
  };

  const submitTextAnswer = () => {
    if (!textAnswer.trim() && question.is_required) return;
    setIsSubmitting(true);
    onAnswer({ answer_text: textAnswer });
  };

  const submitScaleAnswer = () => {
    setIsSubmitting(true);
    onAnswer({ answer_value: scaleValue });
  };

  return (
    <div className="space-y-8">
      {/* Question header */}
      <div className="text-center space-y-3">
        <span className="text-sm text-muted-foreground">
          Pergunta {questionNumber} de {totalQuestions}
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
          {question.question_text}
        </h2>
        {question.description && (
          <p className="text-muted-foreground">{question.description}</p>
        )}
      </div>

      {/* Question content */}
      <div className="space-y-4">
        {question.question_type === 'single_choice' && (
          <div className="space-y-3">
            {options.map((option, index) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSingleChoice(option.id)}
                disabled={isSubmitting}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                  "hover:border-primary hover:bg-primary/5",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  selectedOption === option.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                )}
                aria-label={option.option_text}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{option.option_text}</span>
                  {selectedOption === option.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {question.question_type === 'multiple_choice' && (
          <div className="space-y-3">
            {options.map((option, index) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleMultipleChoice(option.id)}
                disabled={isSubmitting}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                  "hover:border-primary hover:bg-primary/5",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  selectedOptions.includes(option.id)
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                )}
                aria-label={option.option_text}
                aria-pressed={selectedOptions.includes(option.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{option.option_text}</span>
                  {selectedOptions.includes(option.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
            <Button 
              onClick={submitMultipleChoice} 
              disabled={isSubmitting || (selectedOptions.length === 0 && question.is_required)}
              className="w-full mt-4"
              size="lg"
            >
              Continuar
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {question.question_type === 'text' && (
          <div className="space-y-4">
            <Textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Digite sua resposta..."
              className="min-h-[120px] text-lg"
              disabled={isSubmitting}
            />
            <Button 
              onClick={submitTextAnswer} 
              disabled={isSubmitting || (!textAnswer.trim() && question.is_required)}
              className="w-full"
              size="lg"
            >
              Continuar
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {question.question_type === 'scale' && (
          <div className="space-y-8 py-4">
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-5xl font-bold text-primary">{scaleValue}</span>
              </div>
              <Slider
                value={[scaleValue]}
                min={scaleMin}
                max={scaleMax}
                step={1}
                onValueChange={([val]) => setScaleValue(val)}
                className="cursor-pointer"
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{scaleMin}</span>
                <span>{scaleMax}</span>
              </div>
            </div>
            <Button 
              onClick={submitScaleAnswer} 
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              Continuar
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
