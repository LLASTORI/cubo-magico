import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MessageCircle, 
  RefreshCw, 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Filter,
  Search,
  AlertCircle,
  ThumbsUp,
  HelpCircle,
  ShoppingCart,
  MessageSquare,
  Ban,
  Star,
  Instagram,
  Facebook,
  Settings2,
  Users,
  ExternalLink,
  Megaphone,
  BookOpen,
  Reply,
  Clock,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useSocialListening, SocialComment } from '@/hooks/useSocialListening';
import { useToast } from '@/hooks/use-toast';
import { AIKnowledgeBaseSettings } from './AIKnowledgeBaseSettings';
import { PostAnalysisDashboard } from './PostAnalysisDashboard';
import { SocialListeningPagesManager } from './SocialListeningPagesManager';
import { SocialListeningGuide } from './SocialListeningGuide';
import { ReplyApprovalDialog } from './ReplyApprovalDialog';
import { FeatureGate } from '@/components/FeatureGate';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SocialListeningTabProps {
  projectId: string;
}

const sentimentConfig = {
  positive: { label: 'Positivo', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
  neutral: { label: 'Neutro', icon: Minus, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  negative: { label: 'Negativo', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
};

const classificationConfig: Record<string, { label: string; icon: any; color: string }> = {
  product_question: { label: 'Dúvida de Produto', icon: HelpCircle, color: 'text-blue-500' },
  purchase_question: { label: 'Dúvida de Compra', icon: ShoppingCart, color: 'text-blue-400' },
  commercial_interest: { label: 'Interesse Comercial', icon: ShoppingCart, color: 'text-green-500' },
  praise: { label: 'Elogio', icon: Star, color: 'text-yellow-500' },
  complaint: { label: 'Reclamação', icon: AlertCircle, color: 'text-red-500' },
  contact_request: { label: 'Pedido de Contato', icon: MessageSquare, color: 'text-purple-500' },
  friend_tag: { label: 'Marcação de Amigo', icon: Users, color: 'text-gray-400' },
  spam: { label: 'Spam', icon: Ban, color: 'text-gray-400' },
  other: { label: 'Outro', icon: MessageSquare, color: 'text-gray-500' },
  // Legacy mappings for backward compatibility
  question: { label: 'Pergunta', icon: HelpCircle, color: 'text-blue-500' },
  negative_feedback: { label: 'Feedback Negativo', icon: TrendingDown, color: 'text-orange-500' },
};

export function SocialListeningTab({ projectId }: SocialListeningTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [filters, setFilters] = useState({
    sentiment: 'all',
    classification: 'all',
    platform: 'all',
    postType: 'all',
    search: '',
    postId: '',
  });
  const [selectedComment, setSelectedComment] = useState<SocialComment | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);

  // Check if pages are configured and get last sync time
  const { data: savedPages, isLoading: loadingPages, refetch: refetchPages } = useQuery({
    queryKey: ['social-listening-pages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-comments-api', {
        body: { action: 'get_saved_pages', projectId }
      });
      if (error) throw error;
      return data?.pages || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds to update sync status
  });

  // Get most recent sync time from pages
  const lastSyncTime = savedPages?.reduce((latest: Date | null, page: any) => {
    if (!page.last_synced_at) return latest;
    const pageSync = new Date(page.last_synced_at);
    return !latest || pageSync > latest ? pageSync : latest;
  }, null as Date | null);

  const getTimeSinceSync = () => {
    if (!lastSyncTime) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    return `há ${Math.floor(diffHours / 24)}d`;
  };

  const hasConfiguredPages = savedPages && savedPages.length > 0;

  const { 
    posts, 
    postsLoading, 
    stats, 
    statsLoading, 
    syncPosts, 
    syncComments, 
    processAI,
    linkToCRM,
    syncAdComments,
    useComments 
  } = useSocialListening(projectId);

  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useComments({
    sentiment: filters.sentiment,
    classification: filters.classification,
    platform: filters.platform,
    postType: filters.postType,
    postId: filters.postId || undefined,
    search: filters.search,
  });

  const handleSync = async () => {
    await syncPosts.mutateAsync();
    await syncComments.mutateAsync(undefined);
  };

  const handleSyncAds = async () => {
    await syncAdComments.mutateAsync();
  };

  const handleProcessAI = async () => {
    await processAI.mutateAsync(100);
  };

  const handleLinkCRM = async () => {
    await linkToCRM.mutateAsync();
  };

  const isSyncing = syncPosts.isPending || syncComments.isPending;
  const isSyncingAds = syncAdComments.isPending;
  const isProcessing = processAI.isPending;
  const isLinking = linkToCRM.isPending;

  // Show setup screen if no pages configured
  if (loadingPages) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hasConfiguredPages) {
    return (
      <FeatureGate 
        featureKey="meta_ads.social_listening" 
        showLocked 
        lockedMessage="Social Listening está disponível no plano Business"
      >
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Social Listening</h2>
            <p className="text-muted-foreground">
              Configure as páginas que deseja monitorar
            </p>
          </div>
          <SocialListeningPagesManager 
            projectId={projectId} 
            onPagesConfigured={() => refetchPages()}
          />
        </div>
      </FeatureGate>
    );
  }

  const handleOpenReply = (comment: SocialComment) => {
    setSelectedComment(comment);
    setReplyDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with sub-tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Social Listening</h2>
          <p className="text-muted-foreground">
            Monitore e analise comentários do Instagram e Facebook
          </p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="analise" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Análise por Post
          </TabsTrigger>
          <TabsTrigger value="ia" className="gap-2">
            <Brain className="h-4 w-4" />
            Base IA
          </TabsTrigger>
          <TabsTrigger value="guia" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Como Usar
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Páginas ({savedPages?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">

      {/* Auto-sync status banner */}
      {hasConfiguredPages && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Zap className="h-4 w-4" />
              <span className="font-medium">Sincronização Automática Ativa</span>
            </div>
            <span className="text-xs text-muted-foreground">
              • Comentários sincronizados e classificados automaticamente a cada 30 min
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Última sincronização: {getTimeSinceSync() || 'Nunca'}</span>
            {stats?.pendingAI ? (
              <Badge variant="secondary" className="text-xs">
                {stats.pendingAI} pendentes
              </Badge>
            ) : null}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Comentários</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalComments || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sentimento Positivo</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-green-500">
                  {stats?.sentimentDistribution?.positive || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Interesse Comercial</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {stats?.classificationDistribution?.commercial_interest || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reclamações</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-500">
                  {stats?.classificationDistribution?.complaint || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar no texto..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <Select
              value={filters.postType}
              onValueChange={(value) => setFilters({ ...filters, postType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Posts</SelectItem>
                <SelectItem value="organic">Orgânicos</SelectItem>
                <SelectItem value="ad">Anúncios (Ads)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.platform}
              onValueChange={(value) => setFilters({ ...filters, platform: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Plataformas</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sentiment}
              onValueChange={(value) => setFilters({ ...filters, sentiment: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sentimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Sentimentos</SelectItem>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="neutral">Neutro</SelectItem>
                <SelectItem value="negative">Negativo</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.classification}
              onValueChange={(value) => setFilters({ ...filters, classification: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Classificações</SelectItem>
                <SelectItem value="product_question">Dúvida de Produto</SelectItem>
                <SelectItem value="purchase_question">Dúvida de Compra</SelectItem>
                <SelectItem value="commercial_interest">Interesse Comercial</SelectItem>
                <SelectItem value="praise">Elogio</SelectItem>
                <SelectItem value="complaint">Reclamação</SelectItem>
                <SelectItem value="contact_request">Pedido de Contato</SelectItem>
                <SelectItem value="friend_tag">Marcação de Amigo</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="ghost" 
              onClick={() => setFilters({ sentiment: 'all', classification: 'all', platform: 'all', postType: 'all', search: '', postId: '' })}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comentários
            {comments && <Badge variant="secondary">{comments.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {commentsLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-10">Rede</TableHead>
                    <TableHead className="w-10">Post</TableHead>
                    <TableHead className="w-12">Thumb</TableHead>
                    <TableHead className="w-[30%]">Comentário</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Sentimento</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Intenção</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment) => (
                    <CommentRow key={comment.id} comment={comment} onOpenReply={handleOpenReply} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum comentário encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Clique em "Sincronizar" para buscar comentários das suas páginas.
              </p>
              <Button onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Buttons */}
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Orgânicos'}
        </Button>
        <Button 
          variant="outline" 
          onClick={handleSyncAds}
          disabled={isSyncingAds}
        >
          <Megaphone className={`h-4 w-4 mr-2 ${isSyncingAds ? 'animate-pulse' : ''}`} />
          {isSyncingAds ? 'Buscando Ads...' : 'Sincronizar Ads'}
        </Button>
        <Button 
          variant="outline"
          onClick={handleLinkCRM}
          disabled={isLinking}
        >
          <Users className={`h-4 w-4 mr-2 ${isLinking ? 'animate-pulse' : ''}`} />
          {isLinking ? 'Vinculando...' : 'Vincular ao CRM'}
        </Button>
        <Button 
          onClick={handleProcessAI}
          disabled={isProcessing || (stats?.pendingAI === 0)}
        >
          <Brain className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-pulse' : ''}`} />
          {isProcessing ? 'Processando...' : `Classificar IA (${stats?.pendingAI || 0})`}
        </Button>
      </div>
        </TabsContent>

        <TabsContent value="analise" className="mt-6">
          <PostAnalysisDashboard
            projectId={projectId}
            onOpenComments={(postId) => {
              setFilters((prev) => ({ ...prev, postId }));
              setActiveSubTab('dashboard');
            }}
          />
        </TabsContent>

        <TabsContent value="ia" className="mt-6">
          <AIKnowledgeBaseSettings projectId={projectId} />
        </TabsContent>

        <TabsContent value="guia" className="mt-6">
          <SocialListeningGuide projectId={projectId} />
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-6">
          <SocialListeningPagesManager 
            projectId={projectId} 
            onPagesConfigured={() => refetchPages()}
          />
        </TabsContent>
      </Tabs>

      {/* Reply Dialog */}
      <ReplyApprovalDialog
        comment={selectedComment}
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}

const replyStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  approved: { label: 'Aprovada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  sent: { label: 'Enviada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

function CommentRow({ comment, onOpenReply }: { comment: SocialComment; onOpenReply: (comment: SocialComment) => void }) {
  const sentiment = comment.sentiment ? sentimentConfig[comment.sentiment] : null;
  const classification = comment.classification ? classificationConfig[comment.classification] : null;
  const crmContact = comment.crm_contacts;
  const postData = comment.social_posts;
  const postPermalink = postData?.permalink;
  const postThumbnail = postData?.thumbnail_url;
  const isAd = postData?.is_ad ?? false;
  const replyStatus = comment.reply_status ? replyStatusConfig[comment.reply_status] : null;

  // Build permalink URL - ensure it's absolute, or generate fallback for ads
  const getPostUrl = () => {
    if (postPermalink) {
      return /^https?:\/\//i.test(postPermalink) ? postPermalink : `https://${postPermalink}`;
    }
    
    // Fallback: construct URL from post_id_meta for ads without permalink
    const postIdMeta = postData?.post_id_meta;
    if (!postIdMeta) return null;
    
    // Facebook format: pageId_postId -> https://www.facebook.com/pageId/posts/postId
    if (comment.platform === 'facebook' && postIdMeta.includes('_')) {
      const [pageId, postId] = postIdMeta.split('_');
      return `https://www.facebook.com/${pageId}/posts/${postId}`;
    }
    
    // Instagram format: mediaId -> https://www.instagram.com/p/{shortcode}/ (can't construct without shortcode)
    // For Instagram without permalink, we can't construct a valid URL
    return null;
  };

  const postUrl = getPostUrl();
  const { toast } = useToast();

  const openExternal = async (url: string) => {
    const opened = window.open(url, '_blank', 'noopener,noreferrer') ?? window.top?.open(url, '_blank', 'noopener,noreferrer');

    // In embedded previews, popups/new tabs can be blocked; offer copy fallback
    if (!opened) {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: 'Link copiado',
          description: 'Cole no navegador para abrir o post e responder.',
        });
      } catch {
        toast({
          title: 'Não foi possível abrir o link',
          description: 'Copie e abra manualmente no navegador.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {comment.platform === 'instagram' ? (
            <Instagram className="h-4 w-4 text-pink-500" />
          ) : (
            <Facebook className="h-4 w-4 text-blue-600" />
          )}
          {isAd && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20">
              AD
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {postUrl ? (
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              void openExternal(postUrl);
            }}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground"
            title="Abrir post (para responder)"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
      <TableCell>
        {postThumbnail ? (
          <img 
            src={postThumbnail} 
            alt="Thumbnail do post" 
            loading="lazy"
            className="h-9 w-9 object-cover rounded-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="max-w-md">
          <p className="text-sm line-clamp-2">{comment.text}</p>
          {comment.ai_summary && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {comment.ai_summary}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            @{comment.author_username || 'Anônimo'}
          </span>
          {crmContact && (
            <Link 
              to={`/crm/contato/${crmContact.id}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Users className="h-3 w-3" />
              {crmContact.name || crmContact.email}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </TableCell>
      <TableCell>
        {sentiment ? (
          <Badge variant="outline" className={`${sentiment.bg} ${sentiment.color} border-0`}>
            <sentiment.icon className="h-3 w-3 mr-1" />
            {sentiment.label}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Pendente
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {classification ? (
          <Badge variant="outline" className={classification.color}>
            <classification.icon className="h-3 w-3 mr-1" />
            {classification.label}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Pendente
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {comment.intent_score !== null ? (
          <div className="flex items-center gap-2">
            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full"
                style={{ width: `${comment.intent_score}%` }}
              />
            </div>
            <span className="text-xs font-medium">{comment.intent_score}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {replyStatus ? (
          <Badge variant="outline" className={`border-0 ${replyStatus.color}`}>
            {replyStatus.label}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {format(new Date(comment.comment_timestamp), 'dd/MM/yy HH:mm', { locale: ptBR })}
        </span>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onOpenReply(comment)}
          title="Gerar resposta com IA"
        >
          <Reply className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
