import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageCircle,
  ThumbsUp,
  ShoppingCart,
  AlertCircle,
  Star,
  Image,
  Video,
  Film,
  Images,
  Instagram,
  Facebook,
  ExternalLink,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostAnalysisDashboardProps {
  projectId: string;
}

interface PostWithStats {
  id: string;
  platform: 'instagram' | 'facebook';
  post_id_meta: string;
  page_name: string | null;
  message: string | null;
  caption: string | null;
  media_type: string | null;
  permalink: string | null;
  likes_count: number;
  comments_count: number;
  is_ad: boolean;
  published_at: string | null;
  // Calculated stats
  total_comments: number;
  avg_sentiment_score: number;
  avg_intent_score: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  commercial_interest_count: number;
  question_count: number;
  complaint_count: number;
  praise_count: number;
}

const mediaTypeConfig: Record<string, { label: string; icon: any }> = {
  IMAGE: { label: 'Foto', icon: Image },
  VIDEO: { label: 'Vídeo', icon: Video },
  REELS: { label: 'Reels', icon: Film },
  CAROUSEL: { label: 'Carrossel', icon: Images },
  CAROUSEL_ALBUM: { label: 'Carrossel', icon: Images },
};

export function PostAnalysisDashboard({ projectId }: PostAnalysisDashboardProps) {
  const [platformFilter, setPlatformFilter] = useState('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'intent' | 'comments' | 'sentiment'>('intent');

  // Fetch posts with aggregated comment stats
  const { data: postsWithStats, isLoading } = useQuery({
    queryKey: ['post_analysis', projectId, platformFilter, mediaTypeFilter],
    queryFn: async () => {
      // Fetch posts
      let postsQuery = supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', projectId)
        .order('published_at', { ascending: false });

      if (platformFilter !== 'all') {
        postsQuery = postsQuery.eq('platform', platformFilter as 'instagram' | 'facebook');
      }
      if (mediaTypeFilter !== 'all') {
        postsQuery = postsQuery.eq('media_type', mediaTypeFilter);
      }

      const { data: posts, error: postsError } = await postsQuery.limit(50);
      if (postsError) throw postsError;

      // Fetch aggregated comment stats for each post
      const postIds = posts?.map(p => p.id) || [];
      if (postIds.length === 0) return [];

      const { data: comments, error: commentsError } = await supabase
        .from('social_comments')
        .select('post_id, sentiment, classification, intent_score')
        .in('post_id', postIds);

      if (commentsError) throw commentsError;

      // Aggregate stats per post
      const statsMap = new Map<string, {
        total: number;
        sentimentSum: number;
        intentSum: number;
        intentCount: number;
        positive: number;
        neutral: number;
        negative: number;
        commercial_interest: number;
        question: number;
        complaint: number;
        praise: number;
      }>();

      comments?.forEach(c => {
        const existing = statsMap.get(c.post_id) || {
          total: 0,
          sentimentSum: 0,
          intentSum: 0,
          intentCount: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
          commercial_interest: 0,
          question: 0,
          complaint: 0,
          praise: 0,
        };

        existing.total++;

        if (c.sentiment === 'positive') {
          existing.positive++;
          existing.sentimentSum += 100;
        } else if (c.sentiment === 'neutral') {
          existing.neutral++;
          existing.sentimentSum += 50;
        } else if (c.sentiment === 'negative') {
          existing.negative++;
          existing.sentimentSum += 0;
        }

        if (c.intent_score !== null) {
          existing.intentSum += c.intent_score;
          existing.intentCount++;
        }

        const classification = c.classification as string;
        if (classification === 'commercial_interest' || classification === 'purchase_question') {
          existing.commercial_interest++;
        } else if (classification === 'question' || classification === 'product_question') {
          existing.question++;
        } else if (classification === 'complaint') {
          existing.complaint++;
        } else if (classification === 'praise') {
          existing.praise++;
        }

        statsMap.set(c.post_id, existing);
      });

      // Merge posts with stats
      const postsWithStats: PostWithStats[] = (posts || []).map(post => {
        const stats = statsMap.get(post.id);
        return {
          ...post,
          total_comments: stats?.total || 0,
          avg_sentiment_score: stats && stats.total > 0 
            ? Math.round(stats.sentimentSum / stats.total) 
            : 0,
          avg_intent_score: stats && stats.intentCount > 0 
            ? Math.round(stats.intentSum / stats.intentCount) 
            : 0,
          positive_count: stats?.positive || 0,
          neutral_count: stats?.neutral || 0,
          negative_count: stats?.negative || 0,
          commercial_interest_count: stats?.commercial_interest || 0,
          question_count: stats?.question || 0,
          complaint_count: stats?.complaint || 0,
          praise_count: stats?.praise || 0,
        };
      });

      return postsWithStats;
    },
  });

  // Sort posts
  const sortedPosts = [...(postsWithStats || [])].sort((a, b) => {
    if (sortBy === 'intent') return b.avg_intent_score - a.avg_intent_score;
    if (sortBy === 'comments') return b.total_comments - a.total_comments;
    if (sortBy === 'sentiment') return b.avg_sentiment_score - a.avg_sentiment_score;
    return 0;
  });

  // Calculate aggregate stats
  const aggregateStats = postsWithStats?.reduce(
    (acc, post) => ({
      totalPosts: acc.totalPosts + 1,
      totalComments: acc.totalComments + post.total_comments,
      avgIntentScore: acc.avgIntentScore + post.avg_intent_score,
      avgSentimentScore: acc.avgSentimentScore + post.avg_sentiment_score,
      totalCommercialInterest: acc.totalCommercialInterest + post.commercial_interest_count,
      totalQuestions: acc.totalQuestions + post.question_count,
      totalComplaints: acc.totalComplaints + post.complaint_count,
    }),
    { totalPosts: 0, totalComments: 0, avgIntentScore: 0, avgSentimentScore: 0, totalCommercialInterest: 0, totalQuestions: 0, totalComplaints: 0 }
  );

  const avgIntent = aggregateStats && aggregateStats.totalPosts > 0 
    ? Math.round(aggregateStats.avgIntentScore / aggregateStats.totalPosts) 
    : 0;
  const avgSentiment = aggregateStats && aggregateStats.totalPosts > 0 
    ? Math.round(aggregateStats.avgSentimentScore / aggregateStats.totalPosts) 
    : 0;

  // Top 10 by intent
  const top10Intent = sortedPosts.filter(p => p.avg_intent_score > 0).slice(0, 10);

  const handleOpenPost = (permalink: string | null) => {
    if (!permalink) return;
    const url = /^https?:\/\//i.test(permalink) ? permalink : `https://${permalink}`;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Análise por Post
          </h3>
          <p className="text-sm text-muted-foreground">
            Métricas agregadas de comentários por publicação
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Posts Analisados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateStats?.totalPosts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comentários Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{aggregateStats?.totalComments || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Intent Score Médio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{avgIntent}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Interesse Comercial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{aggregateStats?.totalCommercialInterest || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sentimento Médio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {avgSentiment >= 60 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : avgSentiment >= 40 ? (
                <Minus className="h-5 w-5 text-gray-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <span className="text-2xl font-bold">{avgSentiment}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>

            <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo de Mídia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="IMAGE">Foto</SelectItem>
                <SelectItem value="VIDEO">Vídeo</SelectItem>
                <SelectItem value="REELS">Reels</SelectItem>
                <SelectItem value="CAROUSEL_ALBUM">Carrossel</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intent">Maior Intent Score</SelectItem>
                <SelectItem value="comments">Mais Comentários</SelectItem>
                <SelectItem value="sentiment">Melhor Sentimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Intent Score */}
      {top10Intent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top 10 - Maior Intent Score
            </CardTitle>
            <CardDescription>
              Posts com maior potencial de conversão comercial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {top10Intent.map((post, index) => (
                <div 
                  key={post.id} 
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleOpenPost(post.permalink)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {post.message || post.caption || 'Post sem legenda'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {post.platform === 'instagram' ? (
                        <Instagram className="h-3 w-3" />
                      ) : (
                        <Facebook className="h-3 w-3" />
                      )}
                      <span>{post.total_comments} comentários</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="bg-green-500">
                      {post.avg_intent_score}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Todos os Posts
            <Badge variant="secondary">{sortedPosts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedPosts.length > 0 ? (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-10">Rede</TableHead>
                    <TableHead className="w-10">Tipo</TableHead>
                    <TableHead className="w-[30%]">Conteúdo</TableHead>
                    <TableHead>Comentários</TableHead>
                    <TableHead>Sentimento</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Interesse</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPosts.map((post) => {
                    const mediaConfig = post.media_type ? mediaTypeConfig[post.media_type] : null;
                    const MediaIcon = mediaConfig?.icon || Image;

                    return (
                      <TableRow key={post.id}>
                        <TableCell>
                          {post.platform === 'instagram' ? (
                            <Instagram className="h-4 w-4 text-pink-500" />
                          ) : (
                            <Facebook className="h-4 w-4 text-blue-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" title={mediaConfig?.label}>
                            <MediaIcon className="h-4 w-4 text-muted-foreground" />
                            {post.is_ad && (
                              <Badge variant="outline" className="text-xs px-1">Ad</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm line-clamp-2 max-w-xs">
                            {post.message || post.caption || 'Sem legenda'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{post.total_comments}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={post.avg_sentiment_score} 
                              className="w-16 h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              {post.avg_sentiment_score}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={post.avg_intent_score >= 50 ? 'default' : 'secondary'}
                            className={post.avg_intent_score >= 50 ? 'bg-green-500' : ''}
                          >
                            {post.avg_intent_score}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="h-4 w-4 text-green-500" />
                            <span>{post.commercial_interest_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {post.published_at 
                              ? format(new Date(post.published_at), 'dd/MM/yy', { locale: ptBR })
                              : '-'
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          {post.permalink && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenPost(post.permalink)}
                              title="Ver post"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum post encontrado</h3>
              <p className="text-muted-foreground">
                Sincronize os posts para ver a análise.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
