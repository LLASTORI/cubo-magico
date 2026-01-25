import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Webhook, 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  Info 
} from 'lucide-react';

interface HotmartWebhookSectionProps {
  projectId: string;
}

export function HotmartWebhookSection({ projectId }: HotmartWebhookSectionProps) {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const webhookUrl = `https://jcbzwxgayxrnxlgmmlni.supabase.co/functions/v1/hotmart-webhook/${projectId}`;

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      toast({
        title: 'URL copiada!',
        description: 'Cole no painel da Hotmart.',
      });
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Tente selecionar e copiar manualmente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Webhook className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Webhook Hotmart (OBRIGATÓRIO)</h3>
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
          Fonte de Dados Financeiros
        </Badge>
      </div>

      <div className="p-4 rounded-lg border bg-card space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">URL do Webhook (única para este projeto)</Label>
          <div className="flex gap-2">
            <Input 
              value={webhookUrl} 
              readOnly 
              className="font-mono text-xs bg-muted"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopyWebhookUrl}
              className="shrink-0"
            >
              {copiedUrl ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="text-sm text-green-700 dark:text-green-400">
              <strong>Selecione TODOS os eventos disponíveis</strong>
              <p className="text-xs mt-1 opacity-80">
                Nosso sistema processa automaticamente apenas os eventos relevantes. 
                Isso inclui abandono de carrinho para recuperação via WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">Como configurar na Hotmart:</Label>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Acesse o painel da Hotmart → <strong>Ferramentas</strong> → <strong>Webhooks</strong></li>
            <li>Clique em <strong>"Configuração de Webhook"</strong></li>
            <li>Cole a URL acima no campo <strong>"URL de destino"</strong></li>
            <li>Selecione a versão <strong>2.0.0</strong></li>
            <li><strong className="text-foreground">Marque TODOS os eventos disponíveis</strong></li>
            <li>Clique em <strong>"Salvar"</strong></li>
          </ol>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.open('https://app-vlc.hotmart.com/tools/webhook', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir Configuração de Webhooks na Hotmart
        </Button>
      </div>

      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
          <div className="text-xs text-orange-700 dark:text-orange-400">
            <strong>Importante:</strong> O webhook captura dados em tempo real, incluindo <strong>telefone do comprador</strong> e <strong>abandono de carrinho</strong>. 
            É a única fonte de dados para o Ledger financeiro e cálculo de ROAS.
          </div>
        </div>
      </div>
    </div>
  );
}
