import { useState } from 'react';
import { Plus, RefreshCw, Users, AlertCircle, Clock, Play, Pause, Trash2, Copy, History, Loader2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useMetaAudiences, MetaAdAudience } from '@/hooks/useMetaAudiences';
import { MetaAudienceDialog } from './MetaAudienceDialog';
import { MetaAudienceEditDialog } from './MetaAudienceEditDialog';
import { MetaLookalikeDialog } from './MetaLookalikeDialog';
import { MetaAudienceSyncLogs } from './MetaAudienceSyncLogs';

interface MetaAudiencesTabProps {
  projectId: string;
  adAccounts: { id: string; account_id: string; account_name: string | null }[];
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  active: { label: 'Ativo', variant: 'default', icon: <Play className="h-3 w-3" /> },
  syncing: { label: 'Sincronizando', variant: 'outline', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  paused: { label: 'Pausado', variant: 'secondary', icon: <Pause className="h-3 w-3" /> },
  error: { label: 'Erro', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
};

const frequencyLabels: Record<string, string> = {
  manual: 'Manual',
  '6h': 'A cada 6 horas',
  '24h': 'Diária',
};

export function MetaAudiencesTab({ projectId, adAccounts }: MetaAudiencesTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editAudience, setEditAudience] = useState<MetaAdAudience | null>(null);
  const [lookalikeAudience, setLookalikeAudience] = useState<MetaAdAudience | null>(null);
  const [logsAudience, setLogsAudience] = useState<MetaAdAudience | null>(null);
  const [deleteAudienceItem, setDeleteAudienceItem] = useState<MetaAdAudience | null>(null);

  const {
    audiences,
    isLoading,
    refetch,
    syncAudience,
    deleteAudience: deleteAudienceMutation,
    toggleAudienceStatus,
    availableTags,
    tagsLoading,
    refetchTags,
  } = useMetaAudiences(projectId);

  const handleSync = async (audienceId: string) => {
    await syncAudience.mutateAsync(audienceId);
  };

  const handleDelete = async () => {
    if (deleteAudienceItem) {
      await deleteAudienceMutation.mutateAsync(deleteAudienceItem.id);
      setDeleteAudienceItem(null);
    }
  };

  const handleTogglePause = async (audience: MetaAdAudience) => {
    await toggleAudienceStatus.mutateAsync({
      audienceId: audience.id,
      pause: audience.status !== 'paused',
    });
  };

  const getAccountName = (accountId: string) => {
    const account = adAccounts.find(a => a.account_id === accountId);
    return account?.account_name || `act_${accountId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Públicos Automáticos</h2>
          <p className="text-muted-foreground">
            Crie e sincronize públicos personalizados no Meta Ads baseados em tags do CRM
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={adAccounts.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Público
          </Button>
        </div>
      </div>

      {/* Warning if no ad accounts */}
      {adAccounts.length === 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-500">Nenhuma conta de anúncios configurada</p>
                <p className="text-sm text-muted-foreground">
                  Configure pelo menos uma conta de anúncios Meta na aba "Contas" para criar públicos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audiences Table */}
      {audiences && audiences.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Públicos ({audiences.length})
            </CardTitle>
            <CardDescription>
              Gerencie seus públicos personalizados sincronizados com o Meta Ads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Tamanho</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Sync</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audiences.map((audience) => {
                  const status = statusConfig[audience.status] || statusConfig.pending;
                  const segmentConfig = audience.segment_config;
                  
                  return (
                    <TableRow key={audience.id}>
                      <TableCell className="font-medium">{audience.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getAccountName(audience.ad_account_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {segmentConfig.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {segmentConfig.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{segmentConfig.tags.length - 3}
                            </Badge>
                          )}
                          {segmentConfig.tags.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {segmentConfig.operator}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(audience.estimated_size || 0).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {frequencyLabels[audience.sync_frequency]}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant={status.variant} className="gap-1">
                              {status.icon}
                              {status.label}
                            </Badge>
                          </TooltipTrigger>
                          {audience.error_message && (
                            <TooltipContent className="max-w-xs">
                              <p>{audience.error_message}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {audience.last_sync_at
                          ? format(new Date(audience.last_sync_at), "dd/MM HH:mm", { locale: ptBR })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSync(audience.id)}
                                disabled={syncAudience.isPending || audience.status === 'syncing'}
                              >
                                <RefreshCw className={`h-4 w-4 ${syncAudience.isPending ? 'animate-spin' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sincronizar agora</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTogglePause(audience)}
                                disabled={toggleAudienceStatus.isPending}
                              >
                                {audience.status === 'paused' ? (
                                  <Play className="h-4 w-4" />
                                ) : (
                                  <Pause className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {audience.status === 'paused' ? 'Retomar' : 'Pausar'}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLookalikeAudience(audience)}
                                disabled={(audience.estimated_size || 0) < 100}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {(audience.estimated_size || 0) < 100
                                ? 'Mínimo 100 contatos para Lookalike'
                                : 'Criar público semelhante'}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLogsAudience(audience)}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver histórico</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditAudience(audience)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteAudienceItem(audience)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum público criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro público personalizado para sincronizar contatos com o Meta Ads.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} disabled={adAccounts.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Público
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LGPD Notice */}
      <Card className="border-muted">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              <strong>Aviso LGPD:</strong> Os dados enviados ao Meta Ads são criptografados com hash SHA-256 
              antes do envio, tornando-os anonimizados e irreversíveis. Apenas informações já fornecidas 
              pelos próprios contatos são utilizadas para criação de públicos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <MetaAudienceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        adAccounts={adAccounts}
        availableTags={availableTags || []}
        tagsLoading={tagsLoading}
        onRefreshTags={refetchTags}
      />

      {/* Lookalike Dialog */}
      {lookalikeAudience && (
        <MetaLookalikeDialog
          open={!!lookalikeAudience}
          onOpenChange={() => setLookalikeAudience(null)}
          sourceAudience={lookalikeAudience}
          projectId={projectId}
        />
      )}

      {/* Sync Logs Dialog */}
      {logsAudience && (
        <MetaAudienceSyncLogs
          open={!!logsAudience}
          onOpenChange={() => setLogsAudience(null)}
          audience={logsAudience}
          projectId={projectId}
        />
      )}

      {/* Edit Dialog */}
      {editAudience && (
        <MetaAudienceEditDialog
          open={!!editAudience}
          onOpenChange={() => setEditAudience(null)}
          audience={editAudience}
          projectId={projectId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAudienceItem} onOpenChange={() => setDeleteAudienceItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir público?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o público "{deleteAudienceItem?.name}" do Meta Ads e do sistema. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAudienceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
