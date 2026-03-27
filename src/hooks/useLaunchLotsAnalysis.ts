import { useMemo } from 'react';
import { useLaunchLots } from './useLaunchLots';
import {
  LaunchLotWithOffers,
  LotAnalysis,
  EditionTotals,
  OfferMetric,
} from '@/types/launch-lots';

interface SaleRecord {
  offer_code?: string | null;
  gross_amount: number;
  all_offer_codes?: string[] | null;
  economic_day?: string;
  meta_campaign_id?: string | null;
}

interface MetaInsight {
  date_start: string;
  spend: number;
  campaign_id?: string;
}

/**
 * Analisa vendas e spend por lote de uma edição.
 * Atribui cada venda ao lote correto baseado em:
 *   1) economic_day dentro do range do lote
 *   2) offer_code ou all_offer_codes match com offers do lote
 *
 * Retorna métricas por lote + totais da edição.
 */
export function useLaunchLotsAnalysis(
  editionId: string | undefined,
  salesData: SaleRecord[],
  metaInsights: MetaInsight[]
) {
  const { lots, isLoading } = useLaunchLots(editionId);

  const analysis = useMemo(() => {
    if (!lots.length) {
      return { lotsAnalysis: [], editionTotals: calcTotals([], salesData, metaInsights), unassigned: salesData };
    }

    const sortedLots = [...lots].sort(
      (a, b) => a.lot_number - b.lot_number
    );

    const assignedSaleIds = new Set<number>();
    const lotsAnalysis: LotAnalysis[] = [];

    for (const lot of sortedLots) {
      const lotStartDate = lot.start_datetime
        ? lot.start_datetime.slice(0, 10)
        : null;
      const lotEndDate = lot.end_datetime
        ? lot.end_datetime.slice(0, 10)
        : null;

      // Offer codes do lote (para matching)
      const frontCodes = lot.offers
        .filter(o => o.role === 'front')
        .map(o => o.codigo_oferta)
        .filter(Boolean) as string[];

      const allLotCodes = lot.offers
        .map(o => o.codigo_oferta)
        .filter(Boolean) as string[];

      // Filtrar vendas: dentro do date range E oferta pertence ao lote
      const lotSales = salesData.filter((sale, idx) => {
        if (assignedSaleIds.has(idx)) return false;

        const day = sale.economic_day;
        if (!day || !lotStartDate) return false;

        // Data dentro do range
        if (day < lotStartDate) return false;
        if (lotEndDate && day > lotEndDate) return false;

        // Oferta pertence ao lote
        const matchFront = sale.offer_code
          && frontCodes.includes(sale.offer_code);
        const matchOther = sale.all_offer_codes?.some(
          c => allLotCodes.includes(c)
        );

        if (matchFront || matchOther) {
          assignedSaleIds.add(idx);
          return true;
        }
        return false;
      });

      // Filtrar meta insights pelo período do lote
      const lotSpend = metaInsights.filter(m => {
        const d = m.date_start?.slice(0, 10);
        if (!d || !lotStartDate) return false;
        if (d < lotStartDate) return false;
        if (lotEndDate && d > lotEndDate) return false;
        return true;
      });

      const totalSpend = lotSpend.reduce(
        (sum, m) => sum + (Number(m.spend) || 0), 0
      );

      // Métricas por oferta
      const offerMetrics = calcOfferMetrics(lot, lotSales);
      const frontCount = offerMetrics
        .filter(o => o.role === 'front')
        .reduce((s, o) => s + o.salesCount, 0);
      const totalRevenue = lotSales.reduce(
        (s, sale) => s + (sale.gross_amount || 0), 0
      );

      lotsAnalysis.push({
        lot,
        totalRevenue,
        totalTickets: frontCount,
        totalSpend,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        avgTicket: frontCount > 0 ? totalRevenue / frontCount : 0,
        offerMetrics,
      });
    }

    // Vendas não atribuídas a nenhum lote
    const unassigned = salesData.filter(
      (_, idx) => !assignedSaleIds.has(idx)
    );

    const editionTotals = calcTotals(
      lotsAnalysis, salesData, metaInsights
    );

    return { lotsAnalysis, editionTotals, unassigned };
  }, [lots, salesData, metaInsights]);

  return { ...analysis, isLoading };
}

function calcOfferMetrics(
  lot: LaunchLotWithOffers,
  sales: SaleRecord[]
): OfferMetric[] {
  // Conta FRONT primeiro para TX de conversão
  const frontCodes = lot.offers
    .filter(o => o.role === 'front')
    .map(o => o.codigo_oferta)
    .filter(Boolean) as string[];

  const frontCount = sales.filter(
    s => s.offer_code && frontCodes.includes(s.offer_code)
  ).length;

  return lot.offers.map(offer => {
    const code = offer.codigo_oferta;
    if (!code) {
      return emptyMetric(offer);
    }

    const isFront = offer.role === 'front';
    const matchingSales = isFront
      ? sales.filter(s => s.offer_code === code)
      : sales.filter(s => s.all_offer_codes?.includes(code));

    const salesCount = matchingSales.length;
    const revenue = isFront
      ? matchingSales.reduce((s, sale) => s + (sale.gross_amount || 0), 0)
      : salesCount * (offer.valor || 0);

    const conversionRate = isFront
      ? 100 // FRONT é a base
      : frontCount > 0
        ? (salesCount / frontCount) * 100
        : 0;

    return {
      offerMappingId: offer.offer_mapping_id,
      role: offer.role,
      nomeProduto: offer.nome_produto || '',
      nomeOferta: offer.nome_oferta || '',
      codigoOferta: code,
      valor: offer.valor || 0,
      salesCount,
      revenue,
      conversionRate,
    };
  });
}

function emptyMetric(offer: { offer_mapping_id: string; role: string; nome_produto?: string; nome_oferta?: string | null; codigo_oferta?: string | null; valor?: number | null }): OfferMetric {
  return {
    offerMappingId: offer.offer_mapping_id,
    role: offer.role as any,
    nomeProduto: offer.nome_produto || '',
    nomeOferta: offer.nome_oferta || '',
    codigoOferta: offer.codigo_oferta || '',
    valor: offer.valor || 0,
    salesCount: 0,
    revenue: 0,
    conversionRate: 0,
  };
}

function calcTotals(
  lotsAnalysis: LotAnalysis[],
  allSales: SaleRecord[],
  allMeta: MetaInsight[]
): EditionTotals {
  const totalRevenue = allSales.reduce(
    (s, sale) => s + (sale.gross_amount || 0), 0
  );
  const totalSpend = allMeta.reduce(
    (s, m) => s + (Number(m.spend) || 0), 0
  );
  // Total tickets = soma de FRONT de todos os lotes, ou total de vendas se sem lotes
  const totalTickets = lotsAnalysis.length > 0
    ? lotsAnalysis.reduce((s, l) => s + l.totalTickets, 0)
    : allSales.length;

  return {
    totalRevenue,
    totalTickets,
    totalSpend,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    avgTicket: totalTickets > 0 ? totalRevenue / totalTickets : 0,
  };
}
