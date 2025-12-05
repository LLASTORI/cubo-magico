import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Brand colors (Cubo Mágico)
const COLORS = {
  primary: [59, 130, 246] as [number, number, number],
  secondary: [16, 185, 129] as [number, number, number],
  accent: [249, 115, 22] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightBg: [245, 247, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

interface PositionMetrics {
  tipo_posicao: string;
  nome_posicao: string;
  ordem_posicao: number;
  nome_oferta: string;
  codigo_oferta: string;
  valor_oferta: number;
  total_vendas: number;
  total_receita: number;
  taxa_conversao: number;
  percentual_receita: number;
}

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

interface MetaMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
}

interface SaleData {
  buyer_email: string | null;
  total_price_brl: number | null;
  utm_source: string | null;
  payment_method: string | null;
}

interface ReportData {
  startDate: Date;
  endDate: Date;
  summaryMetrics: SummaryMetrics;
  metaMetrics: MetaMetrics;
  funnelMetrics: PositionMetrics[];
  salesData: SaleData[];
  projectName: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

const formatCompact = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return formatNumber(value);
};

// Calculate customer metrics
const calculateCustomerMetrics = (salesData: SaleData[]) => {
  const customerMap = new Map<string, number>();
  salesData.forEach(sale => {
    if (!sale.buyer_email) return;
    const email = sale.buyer_email.toLowerCase();
    customerMap.set(email, (customerMap.get(email) || 0) + 1);
  });
  
  const customers = Array.from(customerMap.values());
  const newCustomers = customers.filter(c => c === 1).length;
  const recurrentCustomers = customers.filter(c => c > 1).length;
  
  return { total: customers.length, newCustomers, recurrentCustomers };
};

// Calculate top UTMs
const calculateTopUTMs = (salesData: SaleData[]) => {
  const utmMap = new Map<string, { sales: number; revenue: number }>();
  salesData.forEach(sale => {
    const source = sale.utm_source || 'Direto';
    const current = utmMap.get(source) || { sales: 0, revenue: 0 };
    utmMap.set(source, { 
      sales: current.sales + 1, 
      revenue: current.revenue + (sale.total_price_brl || 0) 
    });
  });
  return Array.from(utmMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);
};

export const generateExecutiveReport = async (data: ReportData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  const customerMetrics = calculateCustomerMetrics(data.salesData);
  const topUTMs = calculateTopUTMs(data.salesData);
  
  // Helper: check for new page
  const checkPage = (space: number) => {
    if (yPos + space > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
    }
  };
  
  // Helper: draw metric card
  const drawMetricCard = (x: number, y: number, w: number, h: number, label: string, value: string, color: [number, number, number]) => {
    // Card background
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(x, y, w, h, 3, 3, 'F');
    // Left accent bar
    doc.setFillColor(...color);
    doc.rect(x, y, 3, h, 'F');
    // Label
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 7, y + 8);
    // Value
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 7, y + 18);
  };
  
  // Helper: draw progress bar
  const drawProgressBar = (x: number, y: number, w: number, percentage: number, color: [number, number, number]) => {
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x, y, w, 4, 2, 2, 'F');
    const fillWidth = Math.min(percentage / 100 * w, w);
    if (fillWidth > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(x, y, fillWidth, 4, 2, 2, 'F');
    }
  };
  
  // ===== HEADER =====
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('CUBO', margin, 22);
  doc.setFontSize(28);
  doc.setTextColor(249, 115, 22); // Orange accent
  doc.text('MÁGICO', margin + 42, 22);
  
  // Subtitle
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Executivo', margin, 32);
  
  // Date and project
  const dateRange = `${format(data.startDate, 'dd MMM', { locale: ptBR })} - ${format(data.endDate, 'dd MMM yyyy', { locale: ptBR })}`;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(dateRange, pageWidth - margin, 20, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.projectName, pageWidth - margin, 28, { align: 'right' });
  
  yPos = 50;
  
  // ===== MAIN METRICS ROW =====
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const cardHeight = 24;
  
  drawMetricCard(margin, yPos, cardWidth, cardHeight, 'INVESTIMENTO', formatCurrency(data.summaryMetrics.investimento), COLORS.primary);
  drawMetricCard(margin + cardWidth + 4, yPos, cardWidth, cardHeight, 'RECEITA', formatCurrency(data.summaryMetrics.totalReceita), COLORS.secondary);
  drawMetricCard(margin + (cardWidth + 4) * 2, yPos, cardWidth, cardHeight, 'LUCRO', formatCurrency(data.summaryMetrics.totalReceita - data.summaryMetrics.investimento), 
    data.summaryMetrics.totalReceita - data.summaryMetrics.investimento > 0 ? COLORS.secondary : COLORS.danger);
  drawMetricCard(margin + (cardWidth + 4) * 3, yPos, cardWidth, cardHeight, 'ROAS', `${data.summaryMetrics.roas.toFixed(2)}x`, 
    data.summaryMetrics.roas >= data.summaryMetrics.roasTarget ? COLORS.secondary : COLORS.danger);
  
  yPos += cardHeight + 8;
  
  // ===== SECONDARY METRICS =====
  const smallCardW = (pageWidth - margin * 2 - 16) / 5;
  const smallCardH = 20;
  
  drawMetricCard(margin, yPos, smallCardW, smallCardH, 'Vendas Front', formatNumber(data.summaryMetrics.vendasFront), COLORS.primary);
  drawMetricCard(margin + smallCardW + 4, yPos, smallCardW, smallCardH, 'Total Produtos', formatNumber(data.summaryMetrics.totalVendas), COLORS.accent);
  drawMetricCard(margin + (smallCardW + 4) * 2, yPos, smallCardW, smallCardH, 'Ticket Médio', formatCurrency(data.summaryMetrics.ticketMedio), COLORS.secondary);
  drawMetricCard(margin + (smallCardW + 4) * 3, yPos, smallCardW, smallCardH, 'CPA Real', formatCurrency(data.summaryMetrics.cpaReal), 
    data.summaryMetrics.cpaReal <= data.summaryMetrics.cpaMaximo ? COLORS.secondary : COLORS.danger);
  drawMetricCard(margin + (smallCardW + 4) * 4, yPos, smallCardW, smallCardH, 'CPA Máximo', formatCurrency(data.summaryMetrics.cpaMaximo), COLORS.muted);
  
  yPos += smallCardH + 15;
  
  // ===== FUNNEL VISUALIZATION =====
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text('Funil de Vendas', margin, yPos);
  yPos += 8;
  
  const maxRevenue = Math.max(...data.funnelMetrics.map(m => m.total_receita), 1);
  const funnelBarHeight = 16;
  const maxBarWidth = pageWidth - margin * 2 - 80;
  
  data.funnelMetrics.forEach((metric, index) => {
    checkPage(funnelBarHeight + 6);
    
    const barWidth = Math.max((metric.total_receita / maxRevenue) * maxBarWidth, 20);
    const posColor = metric.tipo_posicao === 'FRONT' || metric.tipo_posicao === 'FE' ? COLORS.primary :
                     metric.tipo_posicao === 'OB' ? COLORS.secondary :
                     metric.tipo_posicao === 'US' ? COLORS.accent : COLORS.danger;
    
    // Position label
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    const posLabel = `${metric.tipo_posicao}${metric.ordem_posicao || ''}`;
    doc.text(posLabel, margin, yPos + 5);
    
    // Bar
    doc.setFillColor(...posColor);
    doc.roundedRect(margin + 20, yPos, barWidth, funnelBarHeight - 4, 2, 2, 'F');
    
    // Inside bar text
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const inBarText = `${metric.nome_posicao || metric.nome_oferta}  •  ${formatNumber(metric.total_vendas)} vendas  •  ${formatCurrency(metric.total_receita)}`;
    doc.text(inBarText, margin + 25, yPos + 8, { maxWidth: barWidth - 10 });
    
    // Conversion rate on right
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${metric.taxa_conversao.toFixed(1)}%`, pageWidth - margin, yPos + 8, { align: 'right' });
    
    yPos += funnelBarHeight + 2;
  });
  
  yPos += 10;
  
  // ===== TRAFFIC METRICS =====
  checkPage(50);
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text('Tráfego Pago (Meta Ads)', margin, yPos);
  yPos += 10;
  
  // Traffic metrics in a visual row
  const trafficCardW = (pageWidth - margin * 2 - 8) / 3;
  const trafficCardH = 28;
  
  // Card with icon simulation using emoji/text
  const drawTrafficCard = (x: number, label: string, value: string, subValue?: string) => {
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x, yPos, trafficCardW, trafficCardH, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(label, x + 8, yPos + 8);
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 8, yPos + 20);
    if (subValue) {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.text(subValue, x + trafficCardW - 8, yPos + 20, { align: 'right' });
    }
  };
  
  drawTrafficCard(margin, 'Impressões', formatCompact(data.metaMetrics.impressions));
  drawTrafficCard(margin + trafficCardW + 4, 'Cliques', formatCompact(data.metaMetrics.clicks), `CTR: ${data.metaMetrics.ctr.toFixed(2)}%`);
  drawTrafficCard(margin + (trafficCardW + 4) * 2, 'Alcance', formatCompact(data.metaMetrics.reach), `CPC: ${formatCurrency(data.metaMetrics.cpc)}`);
  
  yPos += trafficCardH + 15;
  
  // ===== CUSTOMERS =====
  checkPage(50);
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text('Clientes', margin, yPos);
  yPos += 10;
  
  // Visual customer breakdown
  const custTotal = customerMetrics.total;
  const custNew = customerMetrics.newCustomers;
  const custRec = customerMetrics.recurrentCustomers;
  const newPct = custTotal > 0 ? (custNew / custTotal * 100) : 0;
  const recPct = custTotal > 0 ? (custRec / custTotal * 100) : 0;
  
  // Big number
  doc.setFontSize(32);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(formatNumber(custTotal), margin, yPos + 12);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('clientes únicos', margin + 35, yPos + 12);
  
  // Breakdown bars
  const barStartX = margin + 80;
  const barW = pageWidth - margin - barStartX - 10;
  
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.text(`Novos: ${formatNumber(custNew)} (${newPct.toFixed(0)}%)`, barStartX, yPos + 4);
  drawProgressBar(barStartX, yPos + 6, barW, newPct, COLORS.secondary);
  
  doc.text(`Recorrentes: ${formatNumber(custRec)} (${recPct.toFixed(0)}%)`, barStartX, yPos + 18);
  drawProgressBar(barStartX, yPos + 20, barW, recPct, COLORS.accent);
  
  yPos += 35;
  
  // ===== TOP UTMS =====
  if (topUTMs.length > 0) {
    checkPage(60);
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Fontes de Tráfego', margin, yPos);
    yPos += 10;
    
    const maxUtmRev = Math.max(...topUTMs.map(u => u[1].revenue), 1);
    const utmBarMaxW = pageWidth - margin * 2 - 60;
    
    topUTMs.forEach(([name, data], i) => {
      const barW = (data.revenue / maxUtmRev) * utmBarMaxW;
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i + 1}. ${name.substring(0, 20)}`, margin, yPos + 6);
      
      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(margin + 50, yPos + 2, barW, 6, 1, 1, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(`${data.sales} vendas • ${formatCurrency(data.revenue)}`, pageWidth - margin, yPos + 6, { align: 'right' });
      
      yPos += 12;
    });
  }
  
  yPos += 10;
  
  // ===== INSIGHTS BOX =====
  checkPage(50);
  
  // Insights background
  doc.setFillColor(254, 243, 199); // Warm yellow bg
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 45, 4, 4, 'F');
  doc.setFillColor(249, 115, 22);
  doc.rect(margin, yPos, 4, 45, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text('💡 Insights Principais', margin + 10, yPos + 10);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const insights: string[] = [];
  
  // Generate dynamic insights
  if (data.summaryMetrics.roas >= data.summaryMetrics.roasTarget) {
    insights.push(`✅ ROAS de ${data.summaryMetrics.roas.toFixed(2)}x está acima da meta (${data.summaryMetrics.roasTarget}x) - operação lucrativa!`);
  } else {
    insights.push(`⚠️ ROAS de ${data.summaryMetrics.roas.toFixed(2)}x está abaixo da meta (${data.summaryMetrics.roasTarget}x) - otimize campanhas`);
  }
  
  if (recPct > 15) {
    insights.push(`🔄 ${recPct.toFixed(0)}% dos clientes são recorrentes - boa retenção!`);
  } else if (custTotal > 10) {
    insights.push(`📈 Apenas ${recPct.toFixed(0)}% de recompra - trabalhe estratégias de fidelização`);
  }
  
  const bestOB = data.funnelMetrics.find(m => m.tipo_posicao === 'OB' && m.taxa_conversao > 25);
  if (bestOB) {
    insights.push(`🎯 Order Bump "${bestOB.nome_posicao}" com ótima conversão: ${bestOB.taxa_conversao.toFixed(1)}%`);
  }
  
  insights.slice(0, 3).forEach((insight, i) => {
    doc.text(insight, margin + 10, yPos + 20 + (i * 10), { maxWidth: pageWidth - margin * 2 - 20 });
  });
  
  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Cubo Mágico • ${format(new Date(), "dd/MM/yyyy HH:mm")} • Página ${i}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }
  
  // Save
  const fileName = `Relatorio_${format(data.startDate, 'dd-MM')}_a_${format(data.endDate, 'dd-MM-yyyy')}.pdf`;
  doc.save(fileName);
};

export default generateExecutiveReport;
