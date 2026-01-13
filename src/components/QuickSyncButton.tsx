import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { invokeProjectFunction } from '@/lib/projectApi';

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
  // Get projectCode from URL (canonical source of truth)
  const { projectCode } = useParams<{ projectCode: string }>();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  // Use currentProject.id for queries, but projectCode for edge function calls
  const projectId = currentProject?.id;
  const effectiveProjectCode = projectCode || currentProject?.public_code;

  // Check connections
  const { data: metaCredentials } = useQuery({
    queryKey: ['meta_credentials_quick', projectCode, projectId],
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
    queryKey: ['hotmart_credentials_quick', projectCode, projectId],
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
    queryKey: ['meta_accounts_quick', projectCode, projectId],
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
    if (!effectiveProjectCode || !hasAnyConnection || isSyncing) {
      if (!effectiveProjectCode) {
        toast({
          title: 'Erro',
          description: 'Nenhum projeto selecionado. Navegue para um projeto primeiro.',
          variant: 'destructive',
        });
      }
      return;
    }

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
        
        // Use projectCode header instead of projectId in body
        await invokeProjectFunction(effectiveProjectCode, 'meta-api', {
          body: {
            action: 'sync_insights',
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

        // Use projectCode header instead of projectId in body
        await invokeProjectFunction(effectiveProjectCode, 'hotmart-api', {
          body: {
            action: 'sync_sales',
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
