/**
 * ContactSocialTab
 * 
 * Exibe comentários do Social Listening vinculados a um contato do CRM.
 * Mostra histórico de interações sociais, sentimentos e classificações.
 * 
 * Integração: CRM ← Social Listening
 */
import { useQuery } from '@tanstack/react-query';
import { 
  MessageCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Instagram,
  Facebook,
  ExternalLink,
  ShoppingCart,
  AlertCircle,
  Star,
  HelpCircle,
  Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CubeLoader } from '@/components/CubeLoader';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactSocialTabProps {
  contactId: string;
}

interface SocialComment {
  id: string;
  platform: 'instagram' | 'facebook';
  text: string;
  author_username: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  classification: string | null;
  intent_score: number | null;
  comment_timestamp: string;
  social_posts?: {
    permalink: string | null;
    thumbnail_url: string | null;
    is_ad: boolean;
  };
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
  contact_request: { label: 'Pedido de Contato', icon: MessageCircle, color: 'text-purple-500' },
  friend_tag: { label: 'Marcação de Amigo', icon: Users, color: 'text-gray-400' },
  other: { label: 'Outro', icon: MessageCircle, color: 'text-gray-500' },
};

export function ContactSocialTab({ contactId }: ContactSocialTabProps) {
  // Fetch comments linked to this contact
  const { data: comments, isLoading } = useQuery({
    queryKey: ['contact-social-comments', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_comments')
        .select(`
          id,
          platform,
          text,
          author_username,
          sentiment,
          classification,
          intent_score,
          comment_timestamp,
          social_posts (
            permalink,
            thumbnail_url,
            is_ad
          )
        `)
        .eq('crm_contact_id', contactId)
        .eq('is_deleted', false)
        .order('comment_timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as SocialComment[];
    },
    enabled: !!contactId,
  });

  // Calculate stats
  const stats = comments ? {
    total: comments.length,
    positive: comments.filter(c => c.sentiment === 'positive').length,
    negative: comments.filter(c => c.sentiment === 'negative').length,
    commercialInterest: comments.filter(c => 
      c.classification === 'commercial_interest' || 
      c.classification === 'purchase_question'
    ).length,
    avgIntent: comments.filter(c => c.intent_score !== null).length > 0
      ? Math.round(
          comments
            .filter(c => c.intent_score !== null)
            .reduce((sum, c) => sum + (c.intent_score || 0), 0) / 
          comments.filter(c => c.intent_score !== null).length
        )
      : 0,
  } : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <CubeLoader size="md" />
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum comentário social vinculado a este contato.</p>
            <p className="text-sm mt-2">
              Comentários do Instagram e Facebook aparecerão aqui quando vinculados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Positivos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-500">{stats?.positive || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Negativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-500">{stats?.negative || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Int. Comercial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{stats?.commercialInterest || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Intent Médio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgIntent || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Comments list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comentários Sociais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.map((comment) => {
            const sentiment = comment.sentiment ? sentimentConfig[comment.sentiment] : null;
            const classification = comment.classification ? classificationConfig[comment.classification] : null;
            const postUrl = comment.social_posts?.permalink;

            return (
              <div 
                key={comment.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Platform and date */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {comment.platform === 'instagram' ? (
                        <Instagram className="h-3.5 w-3.5 text-pink-500" />
                      ) : (
                        <Facebook className="h-3.5 w-3.5 text-blue-600" />
                      )}
                      <span>@{comment.author_username || 'anônimo'}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(comment.comment_timestamp), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {comment.social_posts?.is_ad && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          AD
                        </Badge>
                      )}
                    </div>

                    {/* Comment text */}
                    <p className="text-sm">{comment.text}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {sentiment && (
                        <Badge variant="outline" className={`${sentiment.bg} ${sentiment.color} border-0`}>
                          <sentiment.icon className="h-3 w-3 mr-1" />
                          {sentiment.label}
                        </Badge>
                      )}
                      {classification && (
                        <Badge variant="outline" className={classification.color}>
                          <classification.icon className="h-3 w-3 mr-1" />
                          {classification.label}
                        </Badge>
                      )}
                      {comment.intent_score !== null && (
                        <Badge variant="secondary">
                          Intent: {comment.intent_score}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Post thumbnail and link */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    {comment.social_posts?.thumbnail_url && (
                      <img 
                        src={comment.social_posts.thumbnail_url}
                        alt="Post"
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    {postUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(postUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver post
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
