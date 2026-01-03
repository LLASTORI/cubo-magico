/**
 * SendSurveyDialog
 * 
 * Dialog para enviar uma pesquisa a um contato do CRM a partir do Social Listening.
 * Permite selecionar uma pesquisa existente e gerar o link público para envio.
 * 
 * Integração: Social Listening → Pesquisas → CRM
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Copy, ExternalLink, Send } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SendSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contactId: string;
  contactName?: string | null;
  contactEmail: string;
}

export function SendSurveyDialog({
  open,
  onOpenChange,
  projectId,
  contactId,
  contactName,
  contactEmail,
}: SendSurveyDialogProps) {
  const { toast } = useToast();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');

  // Fetch active surveys for the project (including slug)
  const { data: surveys, isLoading } = useQuery({
    queryKey: ['surveys-for-send', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, name, description, status, slug')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
  });

  // Fetch project public_code for URL generation
  const { data: projectData } = useQuery({
    queryKey: ['project-public-code-for-send', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('public_code')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!projectId,
  });

  const selectedSurvey = surveys?.find(s => s.id === selectedSurveyId);
  const projectCode = projectData?.public_code;

  // Get correct base URL (production domain when in Lovable preview)
  const getBaseUrl = () => {
    const currentOrigin = window.location.origin;
    const lovablePreviewDomains = ['lovableproject.com', 'lovable.app', 'localhost'];
    const isLovablePreview = lovablePreviewDomains.some(domain => currentOrigin.includes(domain));
    
    return isLovablePreview 
      ? 'https://cubomagico.leandrolastori.com.br' 
      : currentOrigin;
  };

  // Generate public survey URL with project_code + slug (multi-tenant format)
  const generateSurveyUrl = () => {
    if (!selectedSurveyId || !selectedSurvey?.slug || !projectCode) return '';
    const baseUrl = getBaseUrl();
    const params = new URLSearchParams({
      email: contactEmail,
      contact_id: contactId,
      source: 'social_listening',
    });
    return `${baseUrl}/s/${projectCode}/${selectedSurvey.slug}?${params.toString()}`;
  };

  const surveyUrl = generateSurveyUrl();

  const handleCopyLink = async () => {
    if (!surveyUrl) return;
    
    try {
      await navigator.clipboard.writeText(surveyUrl);
      toast({
        title: 'Link copiado!',
        description: 'Cole o link para enviar ao contato.',
      });
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenLink = () => {
    if (!surveyUrl) return;
    window.open(surveyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Enviar Pesquisa
          </DialogTitle>
          <DialogDescription>
            Selecione uma pesquisa para enviar ao contato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="text-sm font-medium">{contactName || 'Sem nome'}</p>
            <p className="text-xs text-muted-foreground">{contactEmail}</p>
            <Badge variant="outline" className="text-xs">
              via Social Listening
            </Badge>
          </div>

          {/* Survey selector */}
          <div className="space-y-2">
            <Label>Pesquisa</Label>
            <Select 
              value={selectedSurveyId} 
              onValueChange={setSelectedSurveyId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Carregando...' : 'Selecione uma pesquisa'} />
              </SelectTrigger>
              <SelectContent>
                {surveys?.map((survey) => (
                  <SelectItem key={survey.id} value={survey.id}>
                    <div className="flex flex-col">
                      <span>{survey.name}</span>
                      {survey.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {survey.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {surveys?.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhuma pesquisa ativa
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Generated link */}
          {selectedSurveyId && (
            <div className="space-y-2">
              <Label>Link da Pesquisa</Label>
              <div className="flex gap-2">
                <Input 
                  value={surveyUrl} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                  title="Copiar link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleOpenLink}
                  title="Abrir pesquisa"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O email do contato será pré-preenchido automaticamente
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button 
              onClick={handleCopyLink}
              disabled={!selectedSurveyId}
            >
              <Send className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
