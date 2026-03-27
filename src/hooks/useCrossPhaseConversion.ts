import { useMemo } from 'react';
import { parseISO, differenceInDays } from 'date-fns';
import { LotAnalysis } from '@/types/launch-lots';

interface SaleRecord {
  offer_code?: string | null;
  gross_amount: number;
  all_offer_codes?: string[] | null;
  economic_day?: string;
  buyer_email?: string;
  utm_source?: string | null;
  meta_campaign_id?: string | null;
}

interface ConversaoPorOrigem {
  origem: string;
  ingressos: number;
  convertidos: number;
  taxa: number;
  receitaProduto: number;
  ticketMedioProduto: number;
}

interface ConversaoPorSemana {
  semana: string;
  label: string;
  ingressos: number;
  convertidos: number;
  taxa: number;
}

interface ConversaoPorLote {
  lotName: string;
  ingressos: number;
  convertidos: number;
  taxa: number;
}

interface OBPreditor {
  comOB: number;
  comOBConverteram: number;
  txComOB: number;
  semOB: number;
  semOBConverteram: number;
  txSemOB: number;
  multiplicador: number;
}

interface DiasEntreCompras {
  media: number;
  mediana: number;
  min: number;
  max: number;
}

export interface CrossPhaseData {
  // Estado
  hasProdutoData: boolean;

  // Contagens
  totalIngressoBuyers: number;
  totalProdutoBuyers: number;
  buyersBoth: number;
  buyersOnlyIngresso: number;
  buyersOnlyProduto: number;

  // TX chave
  txIngressoToProduto: number;

  // Revenue
  receitaIngresso: number;
  receitaProduto: number;
  ticketMedioProduto: number;

  // Temporal
  diasEntreCompras: DiasEntreCompras | null;

  // Breakdowns
  conversaoPorOrigem: ConversaoPorOrigem[];
  conversaoPorSemana: ConversaoPorSemana[];
  conversaoPorLote: ConversaoPorLote[];
  obPreditor: OBPreditor | null;
}

/**
 * Cruza compradores de ingresso (fase 1) com compradores
 * do produto principal (fase vendas) via buyer_email.
 *
 * Quando não há dados de produto principal (ex: vendido em
 * outra plataforma), retorna hasProdutoData=false e métricas
 * apenas da fase de ingressos.
 */
export function useCrossPhaseConversion(
  ingressoSalesData: SaleRecord[],
  produtoSalesData: SaleRecord[],
  lotsAnalysis: LotAnalysis[],
): CrossPhaseData {
  return useMemo(() => {
    const hasProdutoData = produtoSalesData.length > 0;

    // Emails únicos de compradores de ingresso
    const ingressoBuyers = new Map<string, {
      email: string;
      day: string;
      grossAmount: number;
      utmSource: string | null;
      hasOB: boolean;
      lotName: string | null;
    }>();

    // Offer codes dos lotes (para identificar OBs)
    const obCodes = new Set<string>();
    for (const la of lotsAnalysis) {
      for (const o of la.lot.offers) {
        if (o.role !== 'front' && o.codigo_oferta) {
          obCodes.add(o.codigo_oferta);
        }
      }
    }

    // Mapear ingressos por email
    for (const sale of ingressoSalesData) {
      const email = sale.buyer_email?.toLowerCase().trim();
      if (!email) continue;

      // Verificar se tem OB
      const hasOB = sale.all_offer_codes?.some(
        c => obCodes.has(c)
      ) || false;

      // Determinar lote
      let lotName: string | null = null;
      for (const la of lotsAnalysis) {
        const lotStart = la.lot.start_datetime?.slice(0, 10);
        const lotEnd = la.lot.end_datetime?.slice(0, 10);
        if (sale.economic_day && lotStart) {
          if (sale.economic_day >= lotStart &&
              (!lotEnd || sale.economic_day <= lotEnd)) {
            lotName = la.lot.name;
            break;
          }
        }
      }

      if (!ingressoBuyers.has(email)) {
        ingressoBuyers.set(email, {
          email,
          day: sale.economic_day || '',
          grossAmount: sale.gross_amount,
          utmSource: sale.utm_source || null,
          hasOB,
          lotName,
        });
      }
    }

    // Emails únicos de compradores do produto principal
    const produtoBuyers = new Map<string, {
      email: string;
      day: string;
      grossAmount: number;
    }>();

    for (const sale of produtoSalesData) {
      const email = sale.buyer_email?.toLowerCase().trim();
      if (!email) continue;
      if (!produtoBuyers.has(email)) {
        produtoBuyers.set(email, {
          email,
          day: sale.economic_day || '',
          grossAmount: sale.gross_amount,
        });
      }
    }

    // Cruzamento
    const bothEmails = new Set<string>();
    const diasList: number[] = [];

    for (const [email, ingresso] of ingressoBuyers) {
      if (produtoBuyers.has(email)) {
        bothEmails.add(email);
        const produto = produtoBuyers.get(email)!;
        if (ingresso.day && produto.day) {
          const dias = differenceInDays(
            parseISO(produto.day),
            parseISO(ingresso.day)
          );
          if (dias >= 0) diasList.push(dias);
        }
      }
    }

    const totalIngressoBuyers = ingressoBuyers.size;
    const totalProdutoBuyers = produtoBuyers.size;
    const buyersBoth = bothEmails.size;
    const buyersOnlyIngresso = totalIngressoBuyers - buyersBoth;
    const buyersOnlyProduto = totalProdutoBuyers - buyersBoth;
    const txIngressoToProduto = totalIngressoBuyers > 0
      ? (buyersBoth / totalIngressoBuyers) * 100
      : 0;

    // Revenue
    const receitaIngresso = ingressoSalesData.reduce(
      (s, sale) => s + (sale.gross_amount || 0), 0
    );
    const receitaProduto = produtoSalesData.reduce(
      (s, sale) => s + (sale.gross_amount || 0), 0
    );
    const ticketMedioProduto = totalProdutoBuyers > 0
      ? receitaProduto / totalProdutoBuyers : 0;

    // Dias entre compras
    let diasEntreCompras: DiasEntreCompras | null = null;
    if (diasList.length > 0) {
      diasList.sort((a, b) => a - b);
      const mid = Math.floor(diasList.length / 2);
      diasEntreCompras = {
        media: diasList.reduce((s, d) => s + d, 0) / diasList.length,
        mediana: diasList.length % 2 === 0
          ? (diasList[mid - 1] + diasList[mid]) / 2
          : diasList[mid],
        min: diasList[0],
        max: diasList[diasList.length - 1],
      };
    }

    // Por origem UTM
    const origemMap = new Map<string, {
      ingressos: number;
      convertidos: number;
      receitaProduto: number;
    }>();

    for (const [email, ingresso] of ingressoBuyers) {
      const origem = ingresso.utmSource || 'Orgânico';
      const existing = origemMap.get(origem) || {
        ingressos: 0, convertidos: 0, receitaProduto: 0,
      };
      existing.ingressos++;
      if (bothEmails.has(email)) {
        existing.convertidos++;
        const prod = produtoBuyers.get(email);
        if (prod) existing.receitaProduto += prod.grossAmount;
      }
      origemMap.set(origem, existing);
    }

    const conversaoPorOrigem: ConversaoPorOrigem[] = Array.from(
      origemMap.entries()
    ).map(([origem, data]) => ({
      origem,
      ingressos: data.ingressos,
      convertidos: data.convertidos,
      taxa: data.ingressos > 0
        ? (data.convertidos / data.ingressos) * 100 : 0,
      receitaProduto: data.receitaProduto,
      ticketMedioProduto: data.convertidos > 0
        ? data.receitaProduto / data.convertidos : 0,
    })).sort((a, b) => b.ingressos - a.ingressos);

    // Por semana de compra do ingresso
    const semanaMap = new Map<string, {
      label: string;
      ingressos: number;
      convertidos: number;
    }>();

    for (const [email, ingresso] of ingressoBuyers) {
      if (!ingresso.day) continue;
      const d = parseISO(ingresso.day);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const label = `${weekStart.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit',
      })}`;

      const existing = semanaMap.get(key) || {
        label, ingressos: 0, convertidos: 0,
      };
      existing.ingressos++;
      if (bothEmails.has(email)) existing.convertidos++;
      semanaMap.set(key, existing);
    }

    const conversaoPorSemana: ConversaoPorSemana[] = Array.from(
      semanaMap.entries()
    ).map(([semana, data]) => ({
      semana,
      label: `Sem ${data.label}`,
      ingressos: data.ingressos,
      convertidos: data.convertidos,
      taxa: data.ingressos > 0
        ? (data.convertidos / data.ingressos) * 100 : 0,
    })).sort((a, b) => a.semana.localeCompare(b.semana));

    // Por lote
    const loteMap = new Map<string, {
      ingressos: number; convertidos: number;
    }>();

    for (const [email, ingresso] of ingressoBuyers) {
      const lot = ingresso.lotName || 'Sem Lote';
      const existing = loteMap.get(lot) || {
        ingressos: 0, convertidos: 0,
      };
      existing.ingressos++;
      if (bothEmails.has(email)) existing.convertidos++;
      loteMap.set(lot, existing);
    }

    const conversaoPorLote: ConversaoPorLote[] = Array.from(
      loteMap.entries()
    ).map(([lotName, data]) => ({
      lotName,
      ingressos: data.ingressos,
      convertidos: data.convertidos,
      taxa: data.ingressos > 0
        ? (data.convertidos / data.ingressos) * 100 : 0,
    }));

    // OB como preditor
    let obPreditor: OBPreditor | null = null;
    if (hasProdutoData && obCodes.size > 0) {
      let comOB = 0, comOBConverteram = 0;
      let semOB = 0, semOBConverteram = 0;

      for (const [email, ingresso] of ingressoBuyers) {
        if (ingresso.hasOB) {
          comOB++;
          if (bothEmails.has(email)) comOBConverteram++;
        } else {
          semOB++;
          if (bothEmails.has(email)) semOBConverteram++;
        }
      }

      const txComOB = comOB > 0
        ? (comOBConverteram / comOB) * 100 : 0;
      const txSemOB = semOB > 0
        ? (semOBConverteram / semOB) * 100 : 0;

      obPreditor = {
        comOB, comOBConverteram, txComOB,
        semOB, semOBConverteram, txSemOB,
        multiplicador: txSemOB > 0 ? txComOB / txSemOB : 0,
      };
    }

    return {
      hasProdutoData,
      totalIngressoBuyers,
      totalProdutoBuyers,
      buyersBoth,
      buyersOnlyIngresso,
      buyersOnlyProduto,
      txIngressoToProduto,
      receitaIngresso,
      receitaProduto,
      ticketMedioProduto,
      diasEntreCompras,
      conversaoPorOrigem,
      conversaoPorSemana,
      conversaoPorLote,
      obPreditor,
    };
  }, [ingressoSalesData, produtoSalesData, lotsAnalysis]);
}
