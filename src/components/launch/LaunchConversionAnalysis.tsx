import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Layers,
  FileText,
  Palette,
  AlertCircle,
} from 'lucide-react';
import { useLaunchConversionData, UTMConversionMetrics } from '@/hooks/useLaunchConversionData';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LaunchConversionAnalysisProps {
  projectId: string | undefined;
  funnelId: string;
  launchTag: string | null;
  startDate: Date;
  endDate: Date;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

function UTMMetricsTable({ 
  metrics, 
  title, 
  icon: Icon 
}: { 
  metrics: UTMConversionMetrics[]; 
  title: string;
  icon: React.ElementType;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (utmValue: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(utmValue)) {
      newExpanded.delete(utmValue);
    } else {
      newExpanded.add(utmValue);
    }
    setExpandedRows(newExpanded);
  };

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados de UTM para análise</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">UTM</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Compradores</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.slice(0, 15).map((metric) => (
              <TableRow key={metric.utmValue} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <span className="truncate block max-w-[200px]" title={metric.utmValue}>
                    {metric.utmValue}
                  </span>
                </TableCell>
                <TableCell className="text-right">{metric.leadsCount}</TableCell>
                <TableCell className="text-right">{metric.customersCount}</TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant={metric.conversionRate >= 5 ? 'default' : metric.conversionRate >= 2 ? 'secondary' : 'outline'}
                    className={metric.conversionRate >= 5 ? 'bg-green-500' : ''}
                  >
                    {formatPercent(metric.conversionRate)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(metric.totalRevenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(metric.avgTicket)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {metrics.length > 15 && (
          <div className="p-2 text-center text-sm text-muted-foreground border-t">
            +{metrics.length - 15} mais itens
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContactJourneyCard({ journey }: { journey: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <div className="text-left">
              <p className="font-medium text-sm">{journey.name || journey.email}</p>
              <p className="text-xs text-muted-foreground">{journey.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={journey.becameCustomer ? 'default' : 'secondary'}>
              {journey.becameCustomer ? 'Comprador' : 'Lead'}
            </Badge>
            {journey.becameCustomer && (
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(journey.totalRevenue)}
              </span>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-10 pr-4 pb-4 space-y-2">
          <div className="text-xs text-muted-foreground">
            Primeiro contato: {new Date(journey.firstSeenAt).toLocaleDateString('pt-BR')}
            {journey.firstPurchaseAt && (
              <> • Primeira compra: {new Date(journey.firstPurchaseAt).toLocaleDateString('pt-BR')}</>
            )}
          </div>
          
          {journey.interactions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Interações ({journey.interactions.length}):</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {journey.interactions.map((interaction: any, idx: number) => (
                  <div key={idx} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                    <div>
                      <span className="font-medium">{interaction.type}</span>
                      {interaction.pageName && <span className="text-muted-foreground"> - {interaction.pageName}</span>}
                    </div>
                    <div className="text-muted-foreground">
                      {interaction.utmCampaign && <span>Camp: {interaction.utmCampaign}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {journey.transactions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Transações ({journey.transactions.length}):</p>
              <div className="space-y-1">
                {journey.transactions.map((tx: any, idx: number) => (
                  <div key={idx} className="text-xs p-2 bg-green-50 dark:bg-green-950/20 rounded flex justify-between">
                    <div>
                      <span className="font-medium">{tx.productName}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">{tx.status}</Badge>
                    </div>
                    <span className="font-medium">{formatCurrency(tx.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function LaunchConversionAnalysis({
  projectId,
  funnelId,
  launchTag,
  startDate,
  endDate,
}: LaunchConversionAnalysisProps) {
  const {
    contactJourneys,
    summaryMetrics,
    utmMetrics,
    isLoading,
  } = useLaunchConversionData({
    projectId,
    funnelId,
    launchTag,
    startDate,
    endDate,
  });

  if (!launchTag) {
    return (
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">
              Configure uma <strong>tag de lançamento</strong> no funil para habilitar a análise de conversão.
              A tag será usada para identificar os leads deste lançamento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Leads do Lançamento
            </div>
            <p className="text-2xl font-bold mt-1">{summaryMetrics.totalLeads}</p>
            <p className="text-xs text-muted-foreground">com tag "{launchTag}"</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Target className="h-4 w-4" />
              Compradores
            </div>
            <p className="text-2xl font-bold mt-1">{summaryMetrics.totalCustomers}</p>
            <p className="text-xs text-muted-foreground">leads convertidos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Taxa de Conversão
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {formatPercent(summaryMetrics.conversionRate)}
            </p>
            <p className="text-xs text-muted-foreground">lead → comprador</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Receita Total
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryMetrics.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">dos leads convertidos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Ticket Médio
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryMetrics.avgTicket)}</p>
            <p className="text-xs text-muted-foreground">por comprador</p>
          </CardContent>
        </Card>
      </div>

      {/* UTM Analysis Tabs */}
      <Tabs defaultValue="campaign" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaign" className="gap-1">
            <Megaphone className="h-3 w-3" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="adset" className="gap-1">
            <Layers className="h-3 w-3" />
            Conjuntos
          </TabsTrigger>
          <TabsTrigger value="ad" className="gap-1">
            <FileText className="h-3 w-3" />
            Anúncios
          </TabsTrigger>
          <TabsTrigger value="creative" className="gap-1">
            <Palette className="h-3 w-3" />
            Criativos
          </TabsTrigger>
          <TabsTrigger value="journeys" className="gap-1">
            <Users className="h-3 w-3" />
            Jornadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaign">
          <UTMMetricsTable 
            metrics={utmMetrics.byCampaign} 
            title="Conversão por Campanha (Primeiro Contato)"
            icon={Megaphone}
          />
        </TabsContent>

        <TabsContent value="adset">
          <UTMMetricsTable 
            metrics={utmMetrics.byAdset} 
            title="Conversão por Conjunto de Anúncios"
            icon={Layers}
          />
        </TabsContent>

        <TabsContent value="ad">
          <UTMMetricsTable 
            metrics={utmMetrics.byAd} 
            title="Conversão por Anúncio"
            icon={FileText}
          />
        </TabsContent>

        <TabsContent value="creative">
          <UTMMetricsTable 
            metrics={utmMetrics.byCreative} 
            title="Conversão por Criativo"
            icon={Palette}
          />
        </TabsContent>

        <TabsContent value="journeys">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Jornada dos Leads ({contactJourneys.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {contactJourneys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum lead encontrado com a tag "{launchTag}" no período selecionado.
                </p>
              ) : (
                contactJourneys.slice(0, 50).map((journey) => (
                  <ContactJourneyCard key={journey.contactId} journey={journey} />
                ))
              )}
              {contactJourneys.length > 50 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Mostrando 50 de {contactJourneys.length} leads
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
