import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Save, TrendingUp, TrendingDown, Minus, History, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FunnelScoreHistoryProps {
  projectId: string;
  funnelId: string;
  currentScore: {
    score: number;
    positionsScore: number;
    connectRateScore: number;
    txPaginaCheckoutScore: number;
    txCheckoutCompraScore: number;
  };
}

interface ScoreHistoryEntry {
  id: string;
  recorded_date: string;
  score: number;
  positions_score: number | null;
  connect_rate_score: number | null;
  tx_pagina_checkout_score: number | null;
  tx_checkout_compra_score: number | null;
}

export function FunnelScoreHistory({ projectId, funnelId, currentScore }: FunnelScoreHistoryProps) {
  const queryClient = useQueryClient();

  // Fetch score history for this funnel
  const { data: scoreHistory, isLoading } = useQuery({
    queryKey: ['funnel-score-history', funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_score_history')
        .select('*')
        .eq('funnel_id', funnelId)
        .order('recorded_date', { ascending: true })
        .limit(30); // Last 30 entries
      
      if (error) throw error;
      return (data as ScoreHistoryEntry[]) || [];
    },
    enabled: !!funnelId,
  });

  // Mutation to save current score
  const saveScoreMutation = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('funnel_score_history')
        .upsert({
          project_id: projectId,
          funnel_id: funnelId,
          score: currentScore.score,
          positions_score: currentScore.positionsScore,
          connect_rate_score: currentScore.connectRateScore,
          tx_pagina_checkout_score: currentScore.txPaginaCheckoutScore,
          tx_checkout_compra_score: currentScore.txCheckoutCompraScore,
          recorded_date: today,
        }, {
          onConflict: 'funnel_id,recorded_date',
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-score-history', funnelId] });
      toast.success('Score salvo no histórico!');
    },
    onError: (error) => {
      console.error('Error saving score:', error);
      toast.error('Erro ao salvar score');
    },
  });

  // Chart data
  const chartData = useMemo(() => {
    if (!scoreHistory || scoreHistory.length === 0) return [];
    
    return scoreHistory.map(entry => ({
      date: entry.recorded_date,
      dateFormatted: format(new Date(entry.recorded_date + 'T00:00:00'), 'dd/MM', { locale: ptBR }),
      score: entry.score,
      positionsScore: entry.positions_score,
      connectRateScore: entry.connect_rate_score,
      txPaginaScore: entry.tx_pagina_checkout_score,
      txCheckoutScore: entry.tx_checkout_compra_score,
    }));
  }, [scoreHistory]);

  // Calculate trend
  const trend = useMemo(() => {
    if (!scoreHistory || scoreHistory.length < 2) return null;
    
    const recent = scoreHistory.slice(-7);
    if (recent.length < 2) return null;
    
    const firstScore = recent[0].score;
    const lastScore = recent[recent.length - 1].score;
    const diff = lastScore - firstScore;
    
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      value: Math.abs(diff),
      percentage: firstScore > 0 ? ((diff / firstScore) * 100).toFixed(1) : '0',
    };
  }, [scoreHistory]);

  // Check if score was saved today
  const savedToday = useMemo(() => {
    if (!scoreHistory || scoreHistory.length === 0) return false;
    const today = format(new Date(), 'yyyy-MM-dd');
    return scoreHistory.some(entry => entry.recorded_date === today);
  }, [scoreHistory]);

  const chartConfig = {
    score: {
      label: 'Score',
      color: 'hsl(var(--primary))',
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h5 className="text-sm font-semibold text-muted-foreground">Evolução do Score</h5>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Trend indicator */}
          {trend && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs gap-1",
                    trend.direction === 'up' && "text-green-600 border-green-200 bg-green-50",
                    trend.direction === 'down' && "text-red-600 border-red-200 bg-red-50",
                    trend.direction === 'stable' && "text-muted-foreground"
                  )}
                >
                  {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                  {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                  {trend.direction === 'stable' && <Minus className="w-3 h-3" />}
                  {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}{trend.value} pts
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Variação nos últimos 7 registros: {trend.percentage}%</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Save button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveScoreMutation.mutate()}
                disabled={saveScoreMutation.isPending}
                className="gap-1"
              >
                <Save className="w-3 h-3" />
                {savedToday ? 'Atualizar' : 'Salvar'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{savedToday ? 'Atualizar o score de hoje' : 'Salvar score atual no histórico'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum histórico registrado ainda.</p>
          <p className="text-xs mt-1">Clique em "Salvar" para começar a acompanhar a evolução.</p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis 
              dataKey="dateFormatted" 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3 text-xs space-y-1">
                    <p className="font-semibold">{format(new Date(data.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    <div className="flex justify-between gap-4">
                      <span>Score Geral:</span>
                      <span className="font-bold">{data.score}</span>
                    </div>
                    {data.positionsScore !== null && (
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <span>Posições:</span>
                        <span>{data.positionsScore}</span>
                      </div>
                    )}
                    {data.connectRateScore !== null && (
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <span>Connect Rate:</span>
                        <span>{data.connectRateScore}</span>
                      </div>
                    )}
                    {data.txPaginaScore !== null && (
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <span>TX Pág→Ckout:</span>
                        <span>{data.txPaginaScore}</span>
                      </div>
                    )}
                    {data.txCheckoutScore !== null && (
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <span>TX Ckout→Compra:</span>
                        <span>{data.txCheckoutScore}</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#scoreGradient)"
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
