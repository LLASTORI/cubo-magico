import { useMemo } from 'react';

/* ── Types ───────────────────────────────────────────── */

export interface BuyerLTV {
  email: string;
  totalSpent: number;
  purchaseCount: number;
  hasOB: boolean;
  hasUS: boolean;
  hasDS: boolean;
  firstPurchase: string;
  lastPurchase: string;
}

export interface LTVBucket {
  label: string;
  description: string;
  count: number;
  pct: number;
  avgLTV: number;
  totalRevenue: number;
}

export interface LTVResult {
  avgLTV: number;
  medianLTV: number;
  maxLTV: number;
  totalBuyers: number;
  totalRevenue: number;
  buckets: LTVBucket[];
  topBuyers: BuyerLTV[];
  buyersWithOB: number;
  buyersWithUS: number;
  pctWithOB: number;
  pctWithUS: number;
}

interface SaleRecord {
  buyer_email?: string;
  gross_amount?: number;
  economic_day?: string;
  offer_code?: string;
  all_offer_codes?: string[];
  [key: string]: any;
}

/* ── Hook ────────────────────────────────────────────── */

export function useLTVAnalysis(
  salesData: SaleRecord[],
  offerMappings?: { codigo_oferta: string; tipo_posicao: string }[],
): LTVResult | null {
  return useMemo(() => {
    if (salesData.length === 0) return null;

    // Identify OB/US/DS offer codes from mappings
    const obCodes = new Set<string>();
    const usCodes = new Set<string>();
    const dsCodes = new Set<string>();

    if (offerMappings) {
      for (const o of offerMappings) {
        if (!o.codigo_oferta) continue;
        const tipo = o.tipo_posicao?.toUpperCase();
        if (tipo === 'OB') obCodes.add(o.codigo_oferta);
        else if (tipo === 'US') usCodes.add(o.codigo_oferta);
        else if (tipo === 'DS') dsCodes.add(o.codigo_oferta);
      }
    }

    // Group by buyer email
    const byBuyer = new Map<string, {
      totalSpent: number;
      purchaseCount: number;
      allCodes: Set<string>;
      dates: string[];
    }>();

    for (const s of salesData) {
      const email = s.buyer_email;
      if (!email) continue;

      let entry = byBuyer.get(email);
      if (!entry) {
        entry = {
          totalSpent: 0,
          purchaseCount: 0,
          allCodes: new Set(),
          dates: [],
        };
        byBuyer.set(email, entry);
      }

      entry.totalSpent += s.gross_amount || 0;
      entry.purchaseCount++;
      if (s.offer_code) entry.allCodes.add(s.offer_code);
      if (s.all_offer_codes) {
        s.all_offer_codes.forEach(
          (c: string) => entry!.allCodes.add(c),
        );
      }
      if (s.economic_day) entry.dates.push(s.economic_day);
    }

    if (byBuyer.size === 0) return null;

    // Build buyer list
    const buyers: BuyerLTV[] = [];
    let buyersWithOB = 0;
    let buyersWithUS = 0;

    for (const [email, data] of byBuyer) {
      const hasOB = [...data.allCodes].some(
        c => obCodes.has(c),
      );
      const hasUS = [...data.allCodes].some(
        c => usCodes.has(c),
      );
      const hasDS = [...data.allCodes].some(
        c => dsCodes.has(c),
      );

      const sortedDates = data.dates.sort();

      buyers.push({
        email,
        totalSpent: data.totalSpent,
        purchaseCount: data.purchaseCount,
        hasOB,
        hasUS,
        hasDS,
        firstPurchase: sortedDates[0] || '',
        lastPurchase: sortedDates[sortedDates.length - 1] || '',
      });

      if (hasOB) buyersWithOB++;
      if (hasUS) buyersWithUS++;
    }

    // Sort by LTV descending
    buyers.sort((a, b) => b.totalSpent - a.totalSpent);

    const ltvValues = buyers.map(b => b.totalSpent);
    const totalRevenue = ltvValues.reduce(
      (s, v) => s + v, 0,
    );
    const avgLTV = totalRevenue / buyers.length;

    // Median
    const sorted = [...ltvValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianLTV = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    // Buckets based on relationship to avg
    const bucketDefs = [
      {
        label: 'Só FRONT',
        description: 'Compraram apenas o produto principal',
        test: (b: BuyerLTV) => !b.hasOB && !b.hasUS && !b.hasDS,
      },
      {
        label: 'FRONT + OB',
        description: 'Compraram produto + order bump',
        test: (b: BuyerLTV) => b.hasOB && !b.hasUS && !b.hasDS,
      },
      {
        label: 'FRONT + OB + US',
        description: 'Compraram produto + bump + upsell',
        test: (b: BuyerLTV) => b.hasOB && b.hasUS,
      },
      {
        label: 'Com Downsell',
        description: 'Receberam downsell',
        test: (b: BuyerLTV) => b.hasDS,
      },
    ];

    const buckets: LTVBucket[] = bucketDefs
      .map(def => {
        const matched = buyers.filter(def.test);
        const count = matched.length;
        if (count === 0) return null;
        const rev = matched.reduce(
          (s, b) => s + b.totalSpent, 0,
        );
        return {
          label: def.label,
          description: def.description,
          count,
          pct: (count / buyers.length) * 100,
          avgLTV: rev / count,
          totalRevenue: rev,
        };
      })
      .filter(Boolean) as LTVBucket[];

    return {
      avgLTV,
      medianLTV,
      maxLTV: ltvValues[0] || 0,
      totalBuyers: buyers.length,
      totalRevenue,
      buckets,
      topBuyers: buyers.slice(0, 5),
      buyersWithOB,
      buyersWithUS,
      pctWithOB:
        buyers.length > 0
          ? (buyersWithOB / buyers.length) * 100
          : 0,
      pctWithUS:
        buyers.length > 0
          ? (buyersWithUS / buyers.length) * 100
          : 0,
    };
  }, [salesData, offerMappings]);
}
