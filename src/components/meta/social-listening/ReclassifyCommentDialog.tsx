import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Edit3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  HelpCircle,
  ShoppingCart,
  Star,
  AlertCircle,
  MessageSquare,
  Users,
  Ban
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SocialComment } from '@/hooks/useSocialListening';

interface ReclassifyCommentDialogProps {
  comment: SocialComment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sentimentOptions = [
  { value: 'positive', label: 'Positivo', icon: TrendingUp, color: 'text-green-500' },
  { value: 'neutral', label: 'Neutro', icon: Minus, color: 'text-gray-500' },
  { value: 'negative', label: 'Negativo', icon: TrendingDown, color: 'text-red-500' },
];

const classificationOptions = [
  { value: 'product_question', label: 'Dúvida de Produto', icon: HelpCircle, color: 'text-blue-500' },
  { value: 'purchase_question', label: 'Dúvida de Compra', icon: ShoppingCart, color: 'text-blue-400' },
  { value: 'commercial_interest', label: 'Interesse Comercial', icon: ShoppingCart, color: 'text-green-500' },
  { value: 'praise', label: 'Elogio', icon: Star, color: 'text-yellow-500' },
  { value: 'complaint', label: 'Reclamação', icon: AlertCircle, color: 'text-red-500' },
  { value: 'contact_request', label: 'Pedido de Contato', icon: MessageSquare, color: 'text-purple-500' },
  { value: 'friend_tag', label: 'Marcação de Amigo', icon: Users, color: 'text-gray-400' },
  { value: 'spam', label: 'Spam', icon: Ban, color: 'text-gray-400' },
  { value: 'other', label: 'Outro', icon: MessageSquare, color: 'text-gray-500' },
];

export function ReclassifyCommentDialog({ 
  comment, 
  open, 
  onOpenChange 
}: ReclassifyCommentDialogProps) {
  const [sentiment, setSentiment] = useState<string>('');
  const [classification, setClassification] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update classification mutation
  const updateClassification = useMutation({
    mutationFn: async ({ newSentiment, newClassification }: { newSentiment: string; newClassification: string }) => {
      if (!comment) throw new Error('Comentário não selecionado');
      
      const { error } = await supabase
        .from('social_comments')
        .update({
          sentiment: newSentiment as 'positive' | 'neutral' | 'negative',
          classification: newClassification as 'commercial_interest' | 'complaint' | 'praise' | 'question' | 'spam' | 'other' | 'negative_feedback',
          manually_classified: true as unknown,
        } as Record<string, unknown>)
        .eq('id', comment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_comments'] });
      queryClient.invalidateQueries({ queryKey: ['social_stats'] });
      toast({
        title: 'Classificação atualizada!',
        description: 'O comentário foi reclassificado com sucesso.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reclassificar',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleSave = () => {
    if (!sentiment || !classification) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o sentimento e a classificação.',
        variant: 'destructive',
      });
      return;
    }
    updateClassification.mutate({ newSentiment: sentiment, newClassification: classification });
  };

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && comment) {
      setSentiment(comment.sentiment || '');
      setClassification(comment.classification || '');
    }
    onOpenChange(newOpen);
  };

  if (!comment) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Reclassificar Comentário
          </DialogTitle>
          <DialogDescription>
            Corrija a classificação feita pela IA selecionando o sentimento e tipo corretos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Comment */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">{comment.author_name || comment.author_username || 'Usuário'}</p>
            <p className="text-muted-foreground">{comment.text}</p>
          </div>

          {/* Sentiment Selection */}
          <div className="space-y-3">
            <Label>Sentimento</Label>
            <RadioGroup 
              value={sentiment} 
              onValueChange={setSentiment}
              className="grid grid-cols-3 gap-2"
            >
              {sentimentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={`sentiment-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`sentiment-${option.value}`}
                      className={`flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary`}
                    >
                      <Icon className={`h-4 w-4 ${option.color}`} />
                      <span className="text-sm">{option.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Classification Selection */}
          <div className="space-y-3">
            <Label>Classificação</Label>
            <RadioGroup 
              value={classification} 
              onValueChange={setClassification}
              className="grid grid-cols-2 gap-2"
            >
              {classificationOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={`class-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`class-${option.value}`}
                      className={`flex items-center gap-2 rounded-md border-2 border-muted bg-popover p-2.5 hover:bg-accent hover:text-accent-foreground cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary`}
                    >
                      <Icon className={`h-4 w-4 ${option.color}`} />
                      <span className="text-sm">{option.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateClassification.isPending || !sentiment || !classification}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
