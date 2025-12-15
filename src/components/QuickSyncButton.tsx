import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { format, subMonths, subDays } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface QuickSyncButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  showLabel?: boolean;
}

export function QuickSyncButton({ 
  variant = 'outline', 
  size = 'sm',
  showLabel = true 
}: QuickSyncButtonProps) {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const projectId = currentProject?.id;

  // Check connections
  const { data: metaCredentials } = useQuery({
    queryKey: ['meta_credentials_quick', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('meta_credentials')
        .select('access_token')
        .eq('project_id', projectId)
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  const { data: hotmartCredentials } = useQuery({
    queryKey: ['hotmart_credentials_quick', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('project_credentials')
        .select('client_id, client_secret')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  const { data: metaAccounts } = useQuery({
    queryKey: ['meta_accounts_quick', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  const hasMetaConnection = !!metaCredentials?.access_token && (metaAccounts?.length || 0) > 0;
  const hasHotmartConnection = !!(hotmartCredentials?.client_id && hotmartCredentials?.client_secret);
  const hasAnyConnection = hasMetaConnection || hasHotmartConnection;

  const handleSync = async (forceRefresh: boolean = false, days: number = 90) => {
    if (!projectId || !hasAnyConnection || isSyncing) return;

    setIsSyncing(true);
    setJustCompleted(false);

    const endDate = new Date();
    const startDate = subDays(endDate, days);
    let syncedSomething = false;

    try {
      // Sync Meta if connected
      if (hasMetaConnection) {
        toast({
          title: forceRefresh ? 'Resync forçado...' : 'Sincronizando...',
          description: `Atualizando dados do Meta Ads (últimos ${days} dias)${forceRefresh ? ' - ignorando cache' : ''}`,
        });

        const accountIds = metaAccounts!.map(a => a.account_id);
        
        await supabase.functions.invoke('meta-api', {
          body: {
            action: 'sync_insights',
            projectId,
            accountIds,
            dateStart: format(startDate, 'yyyy-MM-dd'),
            dateStop: format(endDate, 'yyyy-MM-dd'),
            forceRefresh,
          },
        });
        syncedSomething = true;
      }

      // Sync Hotmart if connected
      if (hasHotmartConnection) {
        toast({
          title: 'Sincronizando...',
          description: 'Atualizando dados do Hotmart',
        });

        await supabase.functions.invoke('hotmart-api', {
          body: {
            action: 'sync_sales',
            projectId,
            startDate: startDate.getTime(),
            endDate: endDate.getTime(),
          },
        });
        syncedSomething = true;
      }

      if (syncedSomething) {
        toast({
          title: forceRefresh ? 'Resync forçado iniciado' : 'Sincronização iniciada',
          description: `Os dados dos últimos ${days} dias serão atualizados em alguns instantes.${forceRefresh ? ' Isso pode levar alguns minutos.' : ''}`,
        });
        setJustCompleted(true);
        
        // Invalidate queries to refresh data after a delay
        setTimeout(() => {
          // The app uses several distinct query keys (e.g. "project-overview-sales", "project-overview-insights").
          // Invalidate broadly to ensure the UI picks up the newly-synced backend data.
          queryClient.invalidateQueries();
        }, 1500);
        
        setTimeout(() => setJustCompleted(false), 3000);
      }

    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Erro na sincronização',
        description: error.message || 'Não foi possível sincronizar os dados',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!hasAnyConnection) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isSyncing}
          variant={variant}
          size={size}
          className={justCompleted ? 'text-green-600 border-green-600' : ''}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : justCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {showLabel && (
            <span className="ml-2">
              {isSyncing ? 'Sincronizando...' : justCompleted ? 'Iniciado!' : 'Sincronizar'}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Sincronização Rápida</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleSync(false, 30)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Últimos 30 dias
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSync(false, 90)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Últimos 90 dias
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-orange-500">Resync Forçado (ignora cache)</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleSync(true, 30)} className="text-orange-600">
          <RotateCcw className="h-4 w-4 mr-2" />
          Forçar 30 dias
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSync(true, 60)} className="text-orange-600">
          <RotateCcw className="h-4 w-4 mr-2" />
          Forçar 60 dias
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSync(true, 90)} className="text-orange-600">
          <RotateCcw className="h-4 w-4 mr-2" />
          Forçar 90 dias
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
