import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// Brand colors (Cubo Mágico)
const COLORS = {
  primary: [59, 130, 246] as [number, number, number], // Blue
  secondary: [16, 185, 129] as [number, number, number], // Green
  accent: [249, 115, 22] as [number, number, number], // Orange
  danger: [239, 68, 68] as [number, number, number], // Red
  text: [30, 41, 59] as [number, number, number], // Dark text
  muted: [100, 116, 139] as [number, number, number], // Muted text
  lightBg: [248, 250, 252] as [number, number, number], // Light background
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
  buyer_name: string | null;
  total_price_brl: number | null;
  offer_code: string | null;
  sale_date: string | null;
  utm_source: string | null;
  utm_campaign_id: string | null;
  payment_method: string | null;
}

interface CustomerData {
  email: string;
  totalPurchases: number;
  totalSpent: number;
  isRecurrent: boolean;
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

const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

// Calculate customer metrics from sales data
const calculateCustomerMetrics = (salesData: SaleData[]) => {
  const customerMap = new Map<string, CustomerData>();
  
  salesData.forEach(sale => {
    if (!sale.buyer_email) return;
    const email = sale.buyer_email.toLowerCase();
    
    if (customerMap.has(email)) {
      const customer = customerMap.get(email)!;
      customer.totalPurchases += 1;
      customer.totalSpent += sale.total_price_brl || 0;
    } else {
      customerMap.set(email, {
        email,
        totalPurchases: 1,
        totalSpent: sale.total_price_brl || 0,
        isRecurrent: false,
      });
    }
  });
  
  // Mark recurrent customers
  customerMap.forEach(customer => {
    customer.isRecurrent = customer.totalPurchases > 1;
  });
  
  const customers = Array.from(customerMap.values());
  const newCustomers = customers.filter(c => !c.isRecurrent).length;
  const recurrentCustomers = customers.filter(c => c.isRecurrent).length;
  const avgSpent = customers.length > 0 
    ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length 
    : 0;
  const ltv = customers.length > 0 
    ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length
    : 0;
  
  return {
    total: customers.length,
    newCustomers,
    recurrentCustomers,
    avgSpent,
    ltv,
    topCustomers: customers.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5),
  };
};

// Calculate UTM metrics from sales data
const calculateUTMMetrics = (salesData: SaleData[]) => {
  const utmMap = new Map<string, { sales: number; revenue: number }>();
  
  salesData.forEach(sale => {
    const source = sale.utm_source || 'Direto/Orgânico';
    if (utmMap.has(source)) {
      const data = utmMap.get(source)!;
      data.sales += 1;
      data.revenue += sale.total_price_brl || 0;
    } else {
      utmMap.set(source, { sales: 1, revenue: sale.total_price_brl || 0 });
    }
  });
  
  return Array.from(utmMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
};

// Calculate payment method metrics
const calculatePaymentMetrics = (salesData: SaleData[]) => {
  const paymentMap = new Map<string, { sales: number; revenue: number }>();
  
  salesData.forEach(sale => {
    const method = sale.payment_method || 'Não informado';
    if (paymentMap.has(method)) {
      const data = paymentMap.get(method)!;
      data.sales += 1;
      data.revenue += sale.total_price_brl || 0;
    } else {
      paymentMap.set(method, { sales: 1, revenue: sale.total_price_brl || 0 });
    }
  });
  
  return Array.from(paymentMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
};

// Generate attention points based on metrics
const generateAttentionPoints = (data: ReportData, customerMetrics: ReturnType<typeof calculateCustomerMetrics>) => {
  const points: string[] = [];
  const { summaryMetrics, metaMetrics, funnelMetrics } = data;
  
  // ROAS analysis
  if (summaryMetrics.roas < summaryMetrics.roasTarget) {
    const gap = ((summaryMetrics.roasTarget - summaryMetrics.roas) / summaryMetrics.roasTarget * 100).toFixed(1);
    points.push(`⚠️ ROAS atual (${summaryMetrics.roas.toFixed(2)}x) está ${gap}% abaixo da meta (${summaryMetrics.roasTarget}x). Revise campanhas de baixo desempenho.`);
  }
  
  // CPA analysis
  if (summaryMetrics.cpaReal > summaryMetrics.cpaMaximo) {
    points.push(`⚠️ CPA Real (${formatCurrency(summaryMetrics.cpaReal)}) está acima do CPA Máximo (${formatCurrency(summaryMetrics.cpaMaximo)}). Otimize segmentação ou criativos.`);
  }
  
  // Low conversion rates in funnel positions
  funnelMetrics.forEach(metric => {
    if (metric.tipo_posicao !== 'FRONT' && metric.tipo_posicao !== 'FE') {
      if (metric.tipo_posicao === 'OB' && metric.taxa_conversao < 20) {
        points.push(`📉 Order Bump "${metric.nome_oferta}" com conversão baixa (${metric.taxa_conversao.toFixed(1)}%). Meta: 20-40%.`);
      }
      if (metric.tipo_posicao === 'US' && metric.taxa_conversao < 5) {
        points.push(`📉 Upsell "${metric.nome_oferta}" com conversão baixa (${metric.taxa_conversao.toFixed(1)}%). Meta: 5-10%.`);
      }
    }
  });
  
  // Customer recurrence
  const recurrenceRate = customerMetrics.total > 0 ? (customerMetrics.recurrentCustomers / customerMetrics.total * 100) : 0;
  if (recurrenceRate < 10) {
    points.push(`👥 Taxa de recompra baixa (${recurrenceRate.toFixed(1)}%). Considere estratégias de retenção e cross-sell.`);
  }
  
  // High CTR but low conversion
  if (metaMetrics.ctr > 2 && summaryMetrics.vendasFront < metaMetrics.clicks * 0.01) {
    points.push(`🎯 CTR alto (${metaMetrics.ctr.toFixed(2)}%) mas conversão baixa. Verifique alinhamento entre anúncio e página de vendas.`);
  }
  
  return points.length > 0 ? points : ['✅ Nenhum ponto crítico identificado. Continue monitorando as métricas.'];
};

// Generate improvement suggestions
const generateImprovements = (data: ReportData, customerMetrics: ReturnType<typeof calculateCustomerMetrics>) => {
  const improvements: string[] = [];
  const { summaryMetrics, funnelMetrics } = data;
  
  // Funnel optimization opportunities
  const frontMetric = funnelMetrics.find(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE');
  if (frontMetric) {
    const potential10Percent = frontMetric.total_receita * 0.1;
    improvements.push(`💰 Aumentar vendas front em 10% pode gerar +${formatCurrency(potential10Percent)} em receita direta.`);
  }
  
  // OB optimization
  const obMetrics = funnelMetrics.filter(m => m.tipo_posicao === 'OB');
  obMetrics.forEach(ob => {
    if (ob.taxa_conversao < 30) {
      const potentialSales = Math.ceil(summaryMetrics.vendasFront * 0.3 - ob.total_vendas);
      if (potentialSales > 0) {
        improvements.push(`🎯 Otimizar "${ob.nome_oferta}" para 30% de conversão: +${potentialSales} vendas potenciais (+${formatCurrency(potentialSales * ob.valor_oferta)}).`);
      }
    }
  });
  
  // Customer value optimization
  if (customerMetrics.avgSpent < summaryMetrics.ticketMedio * 1.5) {
    improvements.push(`👤 Trabalhe estratégias de cross-sell para aumentar o valor médio por cliente de ${formatCurrency(customerMetrics.avgSpent)} para ${formatCurrency(summaryMetrics.ticketMedio * 1.5)}.`);
  }
  
  // Scale opportunities
  if (summaryMetrics.roas > summaryMetrics.roasTarget * 1.2) {
    improvements.push(`🚀 ROAS acima da meta! Oportunidade de escalar investimento mantendo a rentabilidade.`);
  }
  
  return improvements.length > 0 ? improvements : ['📊 Continue monitorando para identificar novas oportunidades.'];
};

export const generateExecutiveReport = async (data: ReportData): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  const customerMetrics = calculateCustomerMetrics(data.salesData);
  const utmMetrics = calculateUTMMetrics(data.salesData);
  const paymentMetrics = calculatePaymentMetrics(data.salesData);
  const attentionPoints = generateAttentionPoints(data, customerMetrics);
  const improvements = generateImprovements(data, customerMetrics);
  
  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  // Helper to draw section header
  const drawSectionHeader = (title: string) => {
    checkNewPage(20);
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, yPos + 5.5);
    doc.setTextColor(...COLORS.text);
    yPos += 12;
  };
  
  // ===== HEADER =====
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Logo text (Cubo Mágico)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CUBO MÁGICO', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Executivo de Performance', margin, 26);
  
  // Date range
  const dateRange = `${format(data.startDate, 'dd/MM/yyyy', { locale: ptBR })} a ${format(data.endDate, 'dd/MM/yyyy', { locale: ptBR })}`;
  doc.setFontSize(10);
  doc.text(dateRange, pageWidth - margin, 18, { align: 'right' });
  doc.text(data.projectName, pageWidth - margin, 26, { align: 'right' });
  
  // Generation date
  doc.setFontSize(8);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth - margin, 32, { align: 'right' });
  
  yPos = 45;
  
  // ===== RESUMO EXECUTIVO =====
  drawSectionHeader('📊 RESUMO EXECUTIVO');
  
  const summaryData = [
    ['Investimento Total', formatCurrency(data.summaryMetrics.investimento)],
    ['Receita Total', formatCurrency(data.summaryMetrics.totalReceita)],
    ['ROAS', `${data.summaryMetrics.roas.toFixed(2)}x (Meta: ${data.summaryMetrics.roasTarget}x)`],
    ['Lucro Bruto', formatCurrency(data.summaryMetrics.totalReceita - data.summaryMetrics.investimento)],
    ['Vendas Front-End', formatNumber(data.summaryMetrics.vendasFront)],
    ['Total de Produtos Vendidos', formatNumber(data.summaryMetrics.totalVendas)],
    ['Ticket Médio', formatCurrency(data.summaryMetrics.ticketMedio)],
    ['CPA Real', formatCurrency(data.summaryMetrics.cpaReal)],
    ['CPA Máximo', formatCurrency(data.summaryMetrics.cpaMaximo)],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'left' },
    },
    margin: { left: margin, right: margin },
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // ===== MÉTRICAS DE TRÁFEGO =====
  drawSectionHeader('📈 MÉTRICAS DE TRÁFEGO PAGO (META ADS)');
  
  const trafficData = [
    ['Impressões', formatNumber(data.metaMetrics.impressions)],
    ['Alcance', formatNumber(data.metaMetrics.reach)],
    ['Cliques', formatNumber(data.metaMetrics.clicks)],
    ['CTR', formatPercent(data.metaMetrics.ctr)],
    ['CPC Médio', formatCurrency(data.metaMetrics.cpc)],
    ['Custo Total', formatCurrency(data.metaMetrics.spend)],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: trafficData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'left' },
    },
    margin: { left: margin, right: margin },
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // ===== ANÁLISE DO FUNIL =====
  checkNewPage(60);
  drawSectionHeader('🎯 ANÁLISE DO FUNIL DE VENDAS');
  
  // Funnel description
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`No período analisado, foram realizadas ${formatNumber(data.summaryMetrics.vendasFront)} vendas front-end, gerando ${formatNumber(data.summaryMetrics.totalVendas)} produtos vendidos no total através do funil.`, margin, yPos);
  yPos += 8;
  doc.setTextColor(...COLORS.text);
  
  const funnelTableData = data.funnelMetrics.map(m => [
    `${m.tipo_posicao}${m.ordem_posicao || ''} - ${m.nome_posicao || m.nome_oferta}`,
    formatNumber(m.total_vendas),
    formatCurrency(m.total_receita),
    formatPercent(m.taxa_conversao),
    formatPercent(m.percentual_receita),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Posição', 'Vendas', 'Receita', 'Conversão', '% Receita']],
    body: funnelTableData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // ===== ANÁLISE DE CLIENTES =====
  checkNewPage(50);
  drawSectionHeader('👥 ANÁLISE DE CLIENTES');
  
  const customerData = [
    ['Total de Clientes Únicos', formatNumber(customerMetrics.total)],
    ['Novos Clientes', formatNumber(customerMetrics.newCustomers)],
    ['Clientes Recorrentes', formatNumber(customerMetrics.recurrentCustomers)],
    ['Taxa de Recompra', formatPercent(customerMetrics.total > 0 ? (customerMetrics.recurrentCustomers / customerMetrics.total * 100) : 0)],
    ['Gasto Médio por Cliente', formatCurrency(customerMetrics.avgSpent)],
    ['LTV Estimado', formatCurrency(customerMetrics.ltv)],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: customerData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'left' },
    },
    margin: { left: margin, right: margin },
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // ===== TOP UTMs =====
  if (utmMetrics.length > 0) {
    checkNewPage(50);
    drawSectionHeader('🎯 PRINCIPAIS FONTES DE TRÁFEGO (UTM)');
    
    const utmTableData = utmMetrics.slice(0, 8).map((u, i) => [
      `${i + 1}. ${u.name}`,
      formatNumber(u.sales),
      formatCurrency(u.revenue),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Fonte', 'Vendas', 'Receita']],
      body: utmTableData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.secondary, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  }
  
  // ===== MÉTODOS DE PAGAMENTO =====
  if (paymentMetrics.length > 0) {
    checkNewPage(40);
    drawSectionHeader('💳 MÉTODOS DE PAGAMENTO');
    
    const paymentTableData = paymentMetrics.map(p => [
      p.name,
      formatNumber(p.sales),
      formatCurrency(p.revenue),
      formatPercent(data.summaryMetrics.totalReceita > 0 ? (p.revenue / data.summaryMetrics.totalReceita * 100) : 0),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Método', 'Vendas', 'Receita', '% Total']],
      body: paymentTableData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.accent, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: margin, right: margin },
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  }
  
  // ===== PONTOS DE ATENÇÃO =====
  checkNewPage(50);
  drawSectionHeader('⚠️ PONTOS DE ATENÇÃO');
  
  doc.setFontSize(9);
  attentionPoints.forEach((point, i) => {
    checkNewPage(10);
    const lines = doc.splitTextToSize(point, pageWidth - margin * 2 - 5);
    doc.text(lines, margin + 2, yPos);
    yPos += lines.length * 5 + 3;
  });
  
  yPos += 5;
  
  // ===== OPORTUNIDADES DE MELHORIA =====
  checkNewPage(50);
  drawSectionHeader('💡 OPORTUNIDADES DE MELHORIA');
  
  doc.setFontSize(9);
  improvements.forEach((improvement, i) => {
    checkNewPage(10);
    const lines = doc.splitTextToSize(improvement, pageWidth - margin * 2 - 5);
    doc.text(lines, margin + 2, yPos);
    yPos += lines.length * 5 + 3;
  });
  
  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Página ${i} de ${totalPages} | Cubo Mágico - Relatório Executivo | ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    // Draw line above footer
    doc.setDrawColor(...COLORS.muted);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  }
  
  // Save the PDF
  const fileName = `Relatorio_Executivo_${format(data.startDate, 'dd-MM-yyyy')}_a_${format(data.endDate, 'dd-MM-yyyy')}.pdf`;
  doc.save(fileName);
};

export default generateExecutiveReport;
