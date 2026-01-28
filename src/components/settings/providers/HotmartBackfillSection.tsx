import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  History, 
  Loader2, 
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HotmartBackfillSectionProps {
  projectId: string;
}

export function HotmartBackfillSection({ projectId }: HotmartBackfillSectionProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState('');

  // Check if API is configured (client_id exists - NO OAuth required)
  const { data: hotmartCredentials } = useQuery({
    queryKey: ['hotmart_credentials', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_credentials')
        .select('client_id')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // API is available if client_id is configured (NO OAuth required)
  const isAPIConfigured = !!hotmartCredentials?.client_id;

  // State for ledger backfill
  const [ledgerBackfilling, setLedgerBackfilling] = useState(false);
  const [ledgerMessage, setLedgerMessage] = useState('');

  const handleBackfillHistory = async () => {
    setBackfilling(true);
    setBackfillMessage('Iniciando reconstrução do histórico...');

    try {
      const { data, error } = await supabase.functions.invoke('hotmart-backfill', {
        body: {
          projectId,
          startDate: subMonths(new Date(), 24).getTime(),
        },
      });

      if (error) throw error;

      const result = data as {
        eventsCreated: number;
        eventsSkipped: number;
        totalSalesFound: number;
        errors: number;
      };

      setBackfillMessage(
        `✓ ${result.eventsCreated.toLocaleString()} eventos criados, ${result.eventsSkipped.toLocaleString()} já existentes`
      );

      toast({
        title: 'Histórico reconstruído!',
        description: `${result.eventsCreated.toLocaleString()} eventos de vendas criados.`,
      });

    } catch (error: any) {
      console.error('Backfill error:', error);
      setBackfillMessage(error.message || 'Erro ao reconstruir histórico');
      toast({
        title: 'Erro na reconstrução',
        description: error.message || 'Erro ao reconstruir histórico de vendas',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setBackfilling(false);
        setBackfillMessage('');
      }, 5000);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEDGER BACKFILL - Gera ledger_events para pedidos que não têm
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleLedgerBackfill = async () => {
    setLedgerBackfilling(true);
    setLedgerMessage('Reconstruindo ledger financeiro...');

    try {
      const { data, error } = await supabase.functions.invoke('hotmart-ledger-full-backfill', {
        body: {
          projectId,
          daysBack: 7,
          pageSize: 1000,
        },
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        totalEvents: number;
        eventsProcessed: number;
        ledgerCreated: number;
        ledgerSkipped: number;
        errors: number;
      };

      setLedgerMessage(
        `✓ ${result.ledgerCreated.toLocaleString()} eventos de ledger criados, ${result.ledgerSkipped.toLocaleString()} já existentes`
      );

      toast({
        title: 'Ledger reconstruído!',
        description: `${result.ledgerCreated.toLocaleString()} eventos financeiros criados.`,
      });

    } catch (error: any) {
      console.error('Ledger backfill error:', error);
      setLedgerMessage(error.message || 'Erro ao reconstruir ledger');
      toast({
        title: 'Erro na reconstrução do ledger',
        description: error.message || 'Erro ao reconstruir ledger financeiro',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setLedgerBackfilling(false);
        setLedgerMessage('');
      }, 5000);
    }
  };

  if (!isAPIConfigured) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">Backfill Histórico</h3>
            <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
              Técnico
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4">
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
            <strong>O backfill histórico não substitui o funcionamento normal do sistema</strong>
            <p className="mt-1">
              Use apenas para reconstruir eventos de vendas anteriores à configuração do webhook.
              Não deve ser usado como sincronização recorrente.
            </p>
          </AlertDescription>
        </Alert>

        <div className="p-4 rounded-lg border bg-card space-y-3">
          <p className="text-sm text-muted-foreground">
            Reconstrói os eventos de vendas no módulo Sales Core a partir dos dados sincronizados via API.
            Isso permite que a <strong>Busca Rápida</strong>, <strong>Funis</strong> e <strong>Insights</strong> mostrem vendas históricas.
          </p>
          
          {backfillMessage && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {backfillMessage}
              </p>
            </div>
          )}

          <Button
            onClick={handleBackfillHistory}
            disabled={backfilling}
            variant="outline"
            className="w-full"
          >
            {backfilling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reconstruindo...
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                Executar Backfill Histórico (Hotmart)
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            <strong>Idempotente:</strong> Pode ser executado várias vezes sem duplicar dados.
            <br />
            <strong>Nota:</strong> Eventos de backfill têm net_amount = 0 (não determinável via API).
          </p>
        </div>

        {/* LEDGER BACKFILL - Gera ledger_events faltantes */}
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>Ledger Backfill (7 dias)</strong>: Reconstrói os eventos financeiros (taxas, coprodução, afiliados) 
            para pedidos aprovados que estão sem decomposição no modal de detalhes.
          </p>
          
          {ledgerMessage && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-700 dark:text-green-400">
                {ledgerMessage}
              </p>
            </div>
          )}

          <Button
            onClick={handleLedgerBackfill}
            disabled={ledgerBackfilling}
            variant="outline"
            className="w-full"
          >
            {ledgerBackfilling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reconstruindo Ledger...
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                Executar Ledger Backfill (7 dias)
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            <strong>Idempotente:</strong> Não duplica eventos existentes.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
