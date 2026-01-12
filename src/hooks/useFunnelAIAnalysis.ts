/**
 * useFunnelAIAnalysis
 * 
 * AI analysis hook that uses ONLY Financial Core data.
 * Legacy data is ignored - AI learns only from Core era.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FunnelAIContext } from './useFunnelAIContext';

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
  tipo: 'refund' | 'chargeback' | 'inatividade' | 'criativo_saturado' | 'ltv_baixo' | 'outro';
  descricao: string;
  severidade: 'baixa' | 'media' | 'alta';
}

export interface AIPositionAnalysis {
  resumo: string;
  destaque_positivo: string;
  destaque_negativo: string;
}

export interface AICreativeAnalysis {
  top_performers: string;
  underperformers: string;
  padrao_identificado: string;
}

export interface AIPaymentAnalysis {
  distribuicao: string;
  ticket_por_metodo: string;
  insight: string;
}

export interface AILTVAnalysis {
  taxa_recompra: string;
  concentracao_receita: string;
  insight: string;
}

export interface AIFunnelConversionAnalysis {
  gargalo_principal: string;
  taxas: string;
  insight: string;
}

export interface FunnelAIAnalysis {
  resumo_executivo: string;
  health_status: 'excellent' | 'good' | 'attention' | 'danger' | 'no-return' | 'inactive';
  health_explanation: string;
  analise_posicoes?: AIPositionAnalysis;
  analise_criativos?: AICreativeAnalysis;
  analise_pagamentos?: AIPaymentAnalysis;
  analise_ltv?: AILTVAnalysis;
  funil_conversao?: AIFunnelConversionAnalysis;
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
  data_source?: 'enriched_payload' | 'basic_payload' | 'database_views';
  data_summary?: {
    positions: number;
    campaigns: number;
    ads: number;
    payment_methods: number;
  } | null;
}

export function useFunnelAIAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FunnelAIAnalysisResponse | null>(null);

  /**
   * Analyze funnel using ONLY Financial Core data.
   * Legacy data (before financial_core_start_date) is automatically excluded.
   */
  const analyzeRunnel = useCallback(async (
    funnelId: string,
    startDate?: string,
    endDate?: string,
    context?: FunnelAIContext | null,
    financialCoreStartDate?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const body: Record<string, any> = {
        funnel_id: funnelId,
        start_date: startDate,
        end_date: endDate,
        // Signal to edge function that we're using Core data only
        use_financial_core: true,
        financial_core_start_date: financialCoreStartDate || '2026-01-12',
      };

      // If context is provided, include ALL enriched data in the request
      // Note: Context should already be filtered to Core era by the caller
      if (context) {
        body.client_summary = context.client_summary;
        body.client_daily = context.client_daily;
        body.position_breakdown = context.position_breakdown;
        body.top_campaigns = context.top_campaigns;
        body.top_adsets = context.top_adsets;
        body.top_ads = context.top_ads;
        body.payment_distribution = context.payment_distribution;
        body.ltv_metrics = context.ltv_metrics;
        body.conversion_funnel = context.conversion_funnel;
        body.data_source = 'financial_core';
      }

      const { data, error: invokeError } = await supabase.functions.invoke('funnel-ai-analysis', {
        body,
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
