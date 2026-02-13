import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Facebook, Instagram, Check, AlertCircle, Search, Trash2 } from 'lucide-react';

interface SocialListeningPagesManagerProps {
  projectId: string;
  onPagesConfigured?: () => void;
}

interface AvailablePage {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  pagePicture?: string;
  platform: 'facebook' | 'instagram';
  instagramAccountId?: string;
  instagramUsername?: string;
  instagramPicture?: string;
}

interface SavePagePayload {
  id: string;
  name: string;
  platform: 'facebook' | 'instagram';
  access_token: string;
  instagram_account_id: string | null;
  instagram_username: string | null;
}

interface AvailablePageApiResponse {
  id: string;
  page_id: string;
  name: string;
  platform: 'facebook' | 'instagram';
  access_token: string;
  instagram_account_id?: string;
  instagram_username?: string;
  profile_picture?: string;
}

interface SavedPage {
  id: string;
  page_id: string;
  page_name: string;
  platform: string;
  instagram_username: string | null;
  is_active: boolean;
}

interface AvailablePagesResult {
  pages: AvailablePage[];
  permissionError: boolean;
  errorMessage?: string;
}

const EMPTY_AVAILABLE_PAGES: AvailablePage[] = [];

const PERMISSION_ERROR_PATTERNS = [
  'oauth',
  'permission',
  'permissions error',
  'insufficient permission',
  'pages_show_list',
  'pages_read_engagement',
  'requires pages',
];

const isPermissionError = (message: string | undefined): boolean => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return PERMISSION_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export function SocialListeningPagesManager({ projectId, onPagesConfigured }: SocialListeningPagesManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const invokeSocialApi = async (body: Record<string, unknown>) => {
    console.log('[SOCIAL_LISTENING][invokeSocialApi] request', body);
    const response = await supabase.functions.invoke('social-comments-api', {
      body,
    });
    console.log('[SOCIAL_LISTENING][invokeSocialApi] response', response);
    return response;
  };

  // Fetch saved pages
  const { data: savedPages, isLoading: loadingSaved } = useQuery({
    queryKey: ['social-listening-pages', projectId],
    queryFn: async () => {
      const { data, error } = await invokeSocialApi({ action: 'get_saved_pages', projectId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      console.log('[SOCIAL_LISTENING][get_saved_pages] count', data?.pages?.length || 0);
      return data?.pages as SavedPage[] || [];
    },
    retry: false,
  });

  // Fetch available pages from Meta
  const {
    data: availablePagesResult,
    isLoading: loadingAvailable,
    refetch: refetchAvailable,
    isFetching,
  } = useQuery<AvailablePagesResult>({
    queryKey: ['available-social-pages', projectId],
    queryFn: async () => {
      const { data, error } = await invokeSocialApi({ action: 'get_available_pages', projectId });

      if (error) {
        const message = error.message || 'Erro ao buscar páginas disponíveis';
        return {
          pages: [],
          permissionError: isPermissionError(message),
          errorMessage: message,
        };
      }

      const normalizedPages: AvailablePage[] = Array.isArray(data?.pages)
        ? (data.pages as AvailablePageApiResponse[]).map((page) => ({
            pageId: page.page_id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            pagePicture: page.profile_picture,
            platform: page.platform,
            instagramAccountId: page.instagram_account_id,
            instagramUsername: page.instagram_username,
            instagramPicture: page.profile_picture,
          }))
        : [];

      return {
        pages: normalizedPages,
        permissionError: false,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const availablePages = availablePagesResult?.pages ?? EMPTY_AVAILABLE_PAGES;
  const hasPermissionError = availablePagesResult?.permissionError || false;
  const availablePagesErrorMessage = availablePagesResult?.errorMessage;

  // Save selected pages
  const saveMutation = useMutation({
    mutationFn: async (pages: AvailablePage[]) => {
      const payloadPages: SavePagePayload[] = pages.map((page) => ({
        id: page.pageId,
        name: page.pageName,
        platform: page.platform,
        access_token: page.pageAccessToken,
        instagram_account_id: page.instagramAccountId || null,
        instagram_username: page.instagramUsername || null,
      }));

      console.log('[SOCIAL_LISTENING][save_pages] payload', { projectId, count: payloadPages.length, payloadPages });

      const { data, error } = await invokeSocialApi({
        action: 'save_pages',
        projectId,
        pages: payloadPages,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data.success && data.errors?.length > 0) {
        throw new Error(data.errors.join(', '));
      }
      return data;
    },
    onSuccess: (data) => {
      const savedCount = data.savedCount ?? 0;
      toast({
        title: 'Páginas salvas!',
        description: `${savedCount} página(s) configurada(s) para monitoramento.`,
      });
      queryClient.invalidateQueries({ queryKey: ['social-listening-pages', projectId] });
      queryClient.refetchQueries({ queryKey: ['social-listening-pages', projectId] });
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

  // Remove a page
  const removeMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { data, error } = await invokeSocialApi({ action: 'remove_page', projectId, pageId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Página removida!',
        description: 'A página foi removida do monitoramento.',
      });
      queryClient.invalidateQueries({ queryKey: ['social-listening-pages', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover',
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
    const pagesToSave = availablePages.filter(p => selectedPages.has(`${p.pageId}_${p.platform}`));
    if (pagesToSave.length > 0) {
      saveMutation.mutate(pagesToSave);
    }
  };

  const isPageSaved = (pageId: string, platform: string) => {
    // Check with platform-specific unique ID (new format) OR old format with matching platform
    const uniqueId = `${pageId}_${platform}`;
    return savedPages?.some(p => 
      p.page_id === uniqueId || 
      (p.page_id === pageId && p.platform === platform)
    );
  };

  // Filter pages based on search query
  const filteredPages = useMemo(() => {
    if (!Array.isArray(availablePages) || availablePages.length === 0) return [];
    if (!searchQuery.trim()) return availablePages;
    
    const query = searchQuery.toLowerCase();
    return availablePages.filter(page => 
      (page.pageName || '').toLowerCase().includes(query) ||
      (page.instagramUsername && page.instagramUsername.toLowerCase().includes(query)) ||
      (page.platform || '').toLowerCase().includes(query)
    );
  }, [availablePages, searchQuery]);

  // Create unique key for each page (pageId + platform)
  const getUniqueKey = (page: AvailablePage) => `${page.pageId}_${page.platform}`;

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
  if (hasPermissionError) {
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
          {availablePagesErrorMessage && (
            <p className="text-xs text-muted-foreground">Detalhe: {availablePagesErrorMessage}</p>
          )}
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

  if (availablePages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Nenhuma página encontrada
          </CardTitle>
          <CardDescription>
            Conexão com o Meta ativa, mas nenhuma página disponível foi retornada para este token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetchAvailable()} disabled={isFetching} variant="outline" className="gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar páginas
          </Button>
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
                      <p className="font-medium">
                        {page.page_name}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {page.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                        </Badge>
                      </p>
                      {page.instagram_username && (
                        <p className="text-sm text-muted-foreground">@{page.instagram_username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={page.is_active ? 'default' : 'secondary'}>
                      {page.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeMutation.mutate(page.page_id)}
                      disabled={removeMutation.isPending}
                    >
                      {removeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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
          {/* Search Input */}
          {availablePages && availablePages.length > 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar página por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <div className="grid gap-3 max-h-[400px] overflow-y-auto">
            {filteredPages.length === 0 && searchQuery ? (
              <div className="text-center py-6 text-muted-foreground">
                Nenhuma página encontrada para "{searchQuery}"
              </div>
            ) : (
              filteredPages.map((page) => {
                const uniqueKey = getUniqueKey(page);
                const isSaved = isPageSaved(page.pageId, page.platform);
                const isSelected = selectedPages.has(uniqueKey);
                const isInstagram = page.platform === 'instagram';
                
                return (
                  <div
                    key={uniqueKey}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isSaved ? 'bg-muted/50 border-primary/30' : isSelected ? 'bg-primary/5 border-primary' : 'bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSaved || isSelected}
                        disabled={isSaved}
                        onCheckedChange={() => handleTogglePage(uniqueKey)}
                      />
                      {isInstagram ? (
                        <Instagram className="h-5 w-5 text-pink-500" />
                      ) : (
                        <Facebook className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {page.pageName}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {isInstagram ? 'Instagram' : 'Facebook'}
                          </Badge>
                        </p>
                        {page.instagramUsername && (
                          <p className="text-sm text-muted-foreground">
                            @{page.instagramUsername}
                          </p>
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
              })
            )}
          </div>

          {availablePages && availablePages.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Mostrando {filteredPages.length} de {availablePages.length} páginas
            </p>
          )}

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
