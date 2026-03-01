import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { matchesCampaignPattern } from '@/lib/campaignPatternMatcher';

// Brand colors
const COLORS = {
  primary: [59, 130, 246] as [number, number, number],
  secondary: [16, 185, 129] as [number, number, number],
  accent: [249, 115, 22] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

interface SummaryMetrics {
  totalVendas: number;
  totalReceita: number;
  ticketMedio: number;
  uniqueCustomers: number;
  vendasFront: number;
  investimento: number;
  cpaMaximo: number;
  cpaReal: number;
  roas: number;
  roasTarget: number;
}

interface FunnelData {
  id: string;
  name: string;
  investimento: number;
  faturamento: number;
  vendas: number;
  roas: number;
  topAds: AdData[];
}

interface AdData {
  adName: string;
  spend: number;
  vendas: number;
  roas: number;
}

interface SaleData {
  buyer_email: string | null;
  total_price_brl: number | null;
  utm_source: string | null;
  payment_method: string | null;
  offer_code: string | null;
  meta_ad_id_extracted: string | null;
  meta_campaign_id_extracted: string | null;
}

interface MetaCampaign {
  campaign_id: string;
  campaign_name: string | null;
}

interface MetaAd {
  ad_id: string;
  ad_name: string | null;
  campaign_id: string;
}

interface MetaInsight {
  campaign_id: string | null;
  ad_id: string | null;
  spend: number | null;
}

interface FunnelConfig {
  id: string;
  name: string;
  campaign_name_pattern: string | null;
  roas_target: number | null;
}

interface OfferMapping {
  funnel_id: string | null;
  id_funil: string;
  codigo_oferta: string | null;
}

export interface ReportData {
  startDate: Date;
  endDate: Date;
  summaryMetrics: SummaryMetrics;
  salesData: SaleData[];
  projectName: string;
  funnelsConfig: FunnelConfig[];
  mappings: OfferMapping[];
  metaCampaigns: MetaCampaign[];
  metaAds: MetaAd[];
  metaInsights: MetaInsight[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

// Truncate text safely for PDF
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Calculate funnel data with top 3 ads
const calculateFunnelData = (data: ReportData): FunnelData[] => {
  const funnels: FunnelData[] = [];

  data.funnelsConfig.forEach(funnel => {
    // Get offer codes for this funnel
    const funnelMappings = data.mappings.filter(
      m => m.funnel_id === funnel.id || m.id_funil === funnel.name
    );
    const offerCodes = new Set(funnelMappings.map(m => m.codigo_oferta).filter(Boolean));

    // Get campaigns matching this funnel pattern
    const pattern = funnel.campaign_name_pattern || funnel.name;
    const matchingCampaigns = data.metaCampaigns.filter(c => 
      matchesCampaignPattern(c.campaign_name, pattern)
    );
    const campaignIds = new Set(matchingCampaigns.map(c => c.campaign_id));

    // Calculate investment from matching campaigns
    const funnelInsights = data.metaInsights.filter(i => 
      i.campaign_id && campaignIds.has(i.campaign_id)
    );
    const investimento = funnelInsights.reduce((sum, i) => sum + (i.spend || 0), 0);

    // Calculate revenue from sales with matching offer codes
    const funnelSales = data.salesData.filter(s => 
      s.offer_code && offerCodes.has(s.offer_code)
    );
    const faturamento = funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
    const vendas = funnelSales.length;

    // Calculate ROAS
    const roas = investimento > 0 ? faturamento / investimento : 0;

    // Get top 3 ads by spend for this funnel
    const adsInFunnel = data.metaAds.filter(ad => campaignIds.has(ad.campaign_id));
    const adSpend: Record<string, { name: string; spend: number; vendas: number }> = {};

    adsInFunnel.forEach(ad => {
      const adInsights = data.metaInsights.filter(i => i.ad_id === ad.ad_id);
      const spend = adInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
      
      // Count sales attributed to this ad
      const adVendas = funnelSales.filter(s => s.meta_ad_id_extracted === ad.ad_id).length;
      
      if (spend > 0) {
        adSpend[ad.ad_id] = {
          name: ad.ad_name || ad.ad_id,
          spend,
          vendas: adVendas,
        };
      }
    });

    const topAds = Object.values(adSpend)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 3)
      .map(ad => ({
        adName: ad.name,
        spend: ad.spend,
        vendas: ad.vendas,
        roas: ad.spend > 0 ? (funnelSales
          .filter(s => s.meta_ad_id_extracted === Object.keys(adSpend).find(k => adSpend[k].name === ad.name))
          .reduce((sum, s) => sum + (s.total_price_brl || 0), 0)) / ad.spend : 0,
      }));

    funnels.push({
      id: funnel.id,
      name: funnel.name,
      investimento,
      faturamento,
      vendas,
      roas,
      topAds,
    });
  });

  // Sort by investment (highest first)
  return funnels.sort((a, b) => b.investimento - a.investimento);
};

export const generateExecutiveReport = async (data: ReportData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const funnelData = calculateFunnelData(data);

  // Helper: check for new page
  const checkPage = (space: number) => {
    if (yPos + space > pageHeight - 25) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper: draw big metric card
  const drawBigCard = (
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    label: string, 
    value: string, 
    color: [number, number, number]
  ) => {
    // Background
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x, y, w, h, 4, 4, 'F');
    
    // Left accent
    doc.setFillColor(...color);
    doc.roundedRect(x, y, 4, h, 2, 2, 'F');
    
    // Label
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x + 10, y + 12);
    
    // Value
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 10, y + 28);
  };

  // ===== HEADER =====
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CUBO', margin, 18);
  doc.setTextColor(249, 115, 22);
  doc.text('MAGICO', margin + 32, 18);

  // Subtitle
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatorio Executivo', margin, 28);

  // Date range and project name
  const dateRange = `${format(data.startDate, "dd 'de' MMMM", { locale: ptBR })} a ${format(data.endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(dateRange, pageWidth - margin, 16, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateText(data.projectName, 30), pageWidth - margin, 25, { align: 'right' });

  yPos = 45;

  // ===== VISAO GERAL =====
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text('Visao Geral', margin, yPos);
  yPos += 10;

  // 4 main cards
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const cardHeight = 35;
  const lucro = data.summaryMetrics.totalReceita - data.summaryMetrics.investimento;

  drawBigCard(margin, yPos, cardWidth, cardHeight, 'Investimento', formatCurrency(data.summaryMetrics.investimento), COLORS.primary);
  drawBigCard(margin + cardWidth + 4, yPos, cardWidth, cardHeight, 'Faturamento', formatCurrency(data.summaryMetrics.totalReceita), COLORS.secondary);
  drawBigCard(margin + (cardWidth + 4) * 2, yPos, cardWidth, cardHeight, 'Lucro', formatCurrency(lucro), lucro >= 0 ? COLORS.secondary : COLORS.danger);
  drawBigCard(margin + (cardWidth + 4) * 3, yPos, cardWidth, cardHeight, 'ROAS', `${data.summaryMetrics.roas.toFixed(2)}x`, data.summaryMetrics.roas >= data.summaryMetrics.roasTarget ? COLORS.secondary : COLORS.danger);

  yPos += cardHeight + 12;

  // Secondary metrics row
  const smallCardW = (pageWidth - margin * 2 - 8) / 3;
  const smallCardH = 28;

  drawBigCard(margin, yPos, smallCardW, smallCardH, 'Vendas', formatNumber(data.summaryMetrics.totalVendas), COLORS.accent);
  drawBigCard(margin + smallCardW + 4, yPos, smallCardW, smallCardH, 'Ticket Medio', formatCurrency(data.summaryMetrics.ticketMedio), COLORS.primary);
  drawBigCard(margin + (smallCardW + 4) * 2, yPos, smallCardW, smallCardH, 'CPA Real', formatCurrency(data.summaryMetrics.cpaReal), data.summaryMetrics.cpaReal <= data.summaryMetrics.cpaMaximo ? COLORS.secondary : COLORS.danger);

  yPos += smallCardH + 20;

  // ===== DADOS POR FUNIL =====
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados por Funil', margin, yPos);
  yPos += 12;

  funnelData.forEach((funnel, funnelIndex) => {
    // Check if we need new page (need space for header + metrics + at least 1 ad)
    if (checkPage(85)) {
      yPos += 5;
    }

    // Funnel header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(truncateText(funnel.name, 40), margin + 5, yPos + 7);

    yPos += 14;

    // Funnel metrics - 4 small boxes
    const funnelCardW = (pageWidth - margin * 2 - 9) / 4;
    const funnelCardH = 22;

    // Investment
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin, yPos, funnelCardW, funnelCardH, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text('INVESTIMENTO', margin + 4, yPos + 7);
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(funnel.investimento), margin + 4, yPos + 16);

    // Revenue
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin + funnelCardW + 3, yPos, funnelCardW, funnelCardH, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text('FATURAMENTO', margin + funnelCardW + 7, yPos + 7);
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(funnel.faturamento), margin + funnelCardW + 7, yPos + 16);

    // Vendas
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin + (funnelCardW + 3) * 2, yPos, funnelCardW, funnelCardH, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text('VENDAS', margin + (funnelCardW + 3) * 2 + 4, yPos + 7);
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(formatNumber(funnel.vendas), margin + (funnelCardW + 3) * 2 + 4, yPos + 16);

    // ROAS
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin + (funnelCardW + 3) * 3, yPos, funnelCardW, funnelCardH, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text('ROAS', margin + (funnelCardW + 3) * 3 + 4, yPos + 7);
    doc.setFontSize(11);
    doc.setTextColor(funnel.roas >= 2 ? COLORS.secondary[0] : COLORS.danger[0], funnel.roas >= 2 ? COLORS.secondary[1] : COLORS.danger[1], funnel.roas >= 2 ? COLORS.secondary[2] : COLORS.danger[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${funnel.roas.toFixed(2)}x`, margin + (funnelCardW + 3) * 3 + 4, yPos + 16);

    yPos += funnelCardH + 6;

    // Top 3 Ads
    if (funnel.topAds.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 3 Anuncios:', margin, yPos + 4);
      yPos += 8;

      // Table header
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, yPos, pageWidth - margin * 2, 7, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'bold');
      doc.text('ANUNCIO', margin + 4, yPos + 5);
      doc.text('GASTO', margin + 95, yPos + 5);
      doc.text('VENDAS', margin + 125, yPos + 5);
      doc.text('ROAS', margin + 155, yPos + 5);
      yPos += 8;

      funnel.topAds.forEach((ad, adIndex) => {
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', 'normal');
        doc.text(`${adIndex + 1}. ${truncateText(ad.adName, 45)}`, margin + 4, yPos + 4);
        doc.text(formatCurrency(ad.spend), margin + 95, yPos + 4);
        doc.text(formatNumber(ad.vendas), margin + 125, yPos + 4);
        doc.setTextColor(ad.roas >= 2 ? COLORS.secondary[0] : COLORS.muted[0], ad.roas >= 2 ? COLORS.secondary[1] : COLORS.muted[1], ad.roas >= 2 ? COLORS.secondary[2] : COLORS.muted[2]);
        doc.text(`${ad.roas.toFixed(2)}x`, margin + 155, yPos + 4);
        yPos += 7;
      });
    } else {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'italic');
      doc.text('Sem anuncios para este funil no periodo', margin, yPos + 4);
      yPos += 8;
    }

    yPos += 10;

    // Separator line between funnels (except last)
    if (funnelIndex < funnelData.length - 1) {
      doc.setDrawColor(220, 220, 230);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
    }
  });

  // Handle case with no funnels
  if (funnelData.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'italic');
    doc.text('Nenhum funil configurado para este projeto.', margin, yPos);
    yPos += 15;
  }

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Cubo Magico - Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm")} - Pagina ${i}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = `Relatorio_${format(data.startDate, 'dd-MM')}_a_${format(data.endDate, 'dd-MM-yyyy')}.pdf`;
  doc.save(fileName);
};

export default generateExecutiveReport;
