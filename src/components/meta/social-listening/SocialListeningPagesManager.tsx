import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Facebook, Instagram, Check, AlertCircle } from 'lucide-react';

interface SocialListeningPagesManagerProps {
  projectId: string;
  onPagesConfigured?: () => void;
}

interface AvailablePage {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  pagePicture?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  instagramPicture?: string;
}

interface SavedPage {
  id: string;
  page_id: string;
  page_name: string;
  platform: string;
  instagram_username: string | null;
  is_active: boolean;
}

export function SocialListeningPagesManager({ projectId, onPagesConfigured }: SocialListeningPagesManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  // Fetch saved pages
  const { data: savedPages, isLoading: loadingSaved } = useQuery({
    queryKey: ['social-listening-pages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'get_saved_pages', projectId }
      });
      if (error) throw error;
      return data?.pages as SavedPage[] || [];
    },
  });

  // Fetch available pages from Meta
  const { data: availablePages, isLoading: loadingAvailable, refetch: refetchAvailable, isFetching } = useQuery({
    queryKey: ['available-social-pages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'get_available_pages', projectId }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data?.pages as AvailablePage[] || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Save selected pages
  const saveMutation = useMutation({
    mutationFn: async (pages: AvailablePage[]) => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'save_pages', projectId, pages }
      });
      if (error) throw error;
      if (!data.success && data.errors?.length > 0) {
        throw new Error(data.errors.join(', '));
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Páginas salvas!',
        description: `${data.saved} página(s) configurada(s) para monitoramento.`,
      });
      queryClient.invalidateQueries({ queryKey: ['social-listening-pages', projectId] });
      setSelectedPages(new Set());
      onPagesConfigured?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleTogglePage = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const handleSaveSelected = () => {
    const pagesToSave = availablePages?.filter(p => selectedPages.has(p.pageId)) || [];
    if (pagesToSave.length > 0) {
      saveMutation.mutate(pagesToSave);
    }
  };

  const isPageSaved = (pageId: string) => {
    return savedPages?.some(p => p.page_id === pageId);
  };

  if (loadingSaved || loadingAvailable) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show configuration needed state
  if (!availablePages || availablePages.length === 0) {
    return (
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Permissões Adicionais Necessárias
          </CardTitle>
          <CardDescription>
            Para monitorar comentários, você precisa reconectar o Meta com permissões de páginas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O Social Listening requer acesso às suas Páginas do Facebook e contas do Instagram Business.
            As permissões atuais do Meta não incluem acesso a páginas.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => refetchAvailable()} disabled={isFetching} variant="outline" className="gap-2">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tentar Novamente
            </Button>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium mb-2">Permissões necessárias (disponíveis em modo de desenvolvimento):</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• pages_show_list</li>
              <li>• pages_read_engagement</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Nota: Permissões avançadas (instagram_basic, instagram_manage_comments) requerem App Review do Meta.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Saved Pages */}
      {savedPages && savedPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Páginas Monitoradas</CardTitle>
            <CardDescription>
              {savedPages.length} página(s) configurada(s) para monitoramento de comentários.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {savedPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {page.platform === 'instagram' ? (
                      <Instagram className="h-5 w-5 text-pink-500" />
                    ) : (
                      <Facebook className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium">{page.page_name}</p>
                      {page.instagram_username && (
                        <p className="text-sm text-muted-foreground">@{page.instagram_username}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={page.is_active ? 'default' : 'secondary'}>
                    {page.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Pages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Páginas Disponíveis</CardTitle>
              <CardDescription>
                Selecione as páginas que deseja monitorar.
              </CardDescription>
            </div>
            <Button onClick={() => refetchAvailable()} disabled={isFetching} variant="outline" size="sm" className="gap-2">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {availablePages.map((page) => {
              const isSaved = isPageSaved(page.pageId);
              const isSelected = selectedPages.has(page.pageId);
              
              return (
                <div
                  key={page.pageId}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isSaved ? 'bg-muted/50 border-primary/30' : isSelected ? 'bg-primary/5 border-primary' : 'bg-card hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSaved || isSelected}
                      disabled={isSaved}
                      onCheckedChange={() => handleTogglePage(page.pageId)}
                    />
                    <Facebook className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{page.pageName}</p>
                      {page.instagramUsername && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Instagram className="h-3 w-3 text-pink-500" />
                          @{page.instagramUsername}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSaved && (
                    <Badge variant="outline" className="gap-1">
                      <Check className="h-3 w-3" />
                      Configurado
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {selectedPages.size > 0 && (
            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={handleSaveSelected} 
                disabled={saveMutation.isPending}
                className="gap-2"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar {selectedPages.size} Página(s)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
