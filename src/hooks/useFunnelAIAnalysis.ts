import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIAnalysisStrength {
  metrica: string;
  valor: string;
  explicacao: string;
}

export interface AIAnalysisConcern {
  metrica: string;
  valor: string;
  explicacao: string;
  impacto: string;
}

export interface AIAnalysisChange {
  tipo: 'melhoria' | 'piora' | 'estavel';
  descricao: string;
}

export interface AIAnalysisRisk {
  tipo: 'refund' | 'chargeback' | 'inatividade' | 'outro';
  descricao: string;
  severidade: 'baixa' | 'media' | 'alta';
}

export interface FunnelAIAnalysis {
  resumo_executivo: string;
  health_status: 'excellent' | 'good' | 'attention' | 'danger' | 'no-return' | 'inactive';
  health_explanation: string;
  pontos_fortes: AIAnalysisStrength[];
  pontos_atencao: AIAnalysisConcern[];
  mudancas_periodo: AIAnalysisChange[];
  alertas_risco: AIAnalysisRisk[];
  observacoes_adicionais: string;
}

export interface FunnelAIAnalysisResponse {
  success: boolean;
  funnel_id: string;
  funnel_name: string;
  analysis_date: string;
  period: {
    start: string;
    end: string;
  };
  current_metrics: {
    health_status: string;
    total_revenue: number;
    total_investment: number;
    roas: number;
    total_sales: number;
  };
  analysis: FunnelAIAnalysis;
}

export function useFunnelAIAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FunnelAIAnalysisResponse | null>(null);

  const analyzeRunnel = useCallback(async (
    funnelId: string,
    startDate?: string,
    endDate?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('funnel-ai-analysis', {
        body: {
          funnel_id: funnelId,
          start_date: startDate,
          end_date: endDate,
        },
      });

      if (invokeError) {
        console.error('Funnel AI analysis error:', invokeError);
        throw new Error(invokeError.message || 'Erro ao analisar funil');
      }

      if (data?.error) {
        // Handle specific error cases
        if (data.error.includes('Rate limit')) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns minutos.');
          setError('rate_limit');
        } else if (data.error.includes('Créditos insuficientes')) {
          toast.error('Créditos insuficientes para análise por IA.');
          setError('insufficient_credits');
        } else {
          toast.error(data.error);
          setError(data.error);
        }
        return null;
      }

      setAnalysis(data as FunnelAIAnalysisResponse);
      return data as FunnelAIAnalysisResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Funnel AI analysis failed:', err);
      setError(errorMessage);
      toast.error(`Erro na análise: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analyzeRunnel,
    clearAnalysis,
    analysis,
    isLoading,
    error,
  };
}
