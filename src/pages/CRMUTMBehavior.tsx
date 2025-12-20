import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useUTMBehaviorData } from '@/hooks/useUTMBehaviorData';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { UTMBehaviorTable } from '@/components/crm/UTMBehaviorTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/AppHeader';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Repeat,
  Target,
  Megaphone,
  Layers,
  MousePointer,
  Palette,
  Radio
} from 'lucide-react';

export default function CRMUTMBehavior() {
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();

  const {
    isLoading,
    metricsBySource,
    metricsByCampaign,
    metricsByMedium,
    metricsByAdset,
    metricsByAd,
    metricsByCreative,
    summary,
  } = useUTMBehaviorData({ projectId: currentProject?.id || null });

  if (modulesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <CRMSubNav />
        <div className="container mx-auto px-6 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <CRMSubNav />
        <div className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Selecione um projeto para visualizar o comportamento por UTM
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <CRMSubNav />
      
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Comportamento por UTM</h1>
          <p className="text-muted-foreground">
            Analise o comportamento e performance de clientes por origem de tráfego
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Users className="h-4 w-4" />
                  Total Contatos
                </div>
                <p className="text-2xl font-bold mt-1">
                  {summary.totalContacts.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Target className="h-4 w-4" />
                  Clientes
                </div>
                <p className="text-2xl font-bold mt-1">
                  {summary.totalCustomers.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <TrendingUp className="h-4 w-4" />
                  Conversão
                </div>
                <p className="text-2xl font-bold mt-1">
                  {summary.conversionRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <DollarSign className="h-4 w-4" />
                  Receita Total
                </div>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <DollarSign className="h-4 w-4" />
                  LTV Médio
                </div>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary.avgLTV)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <DollarSign className="h-4 w-4" />
                  Ticket Médio
                </div>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary.avgTicket)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Repeat className="h-4 w-4" />
                  Recompra
                </div>
                <p className="text-2xl font-bold mt-1">
                  {summary.repurchaseRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs with Tables */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas por Dimensão UTM</CardTitle>
            <CardDescription>
              Compare o desempenho de diferentes origens, campanhas e anúncios
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <Tabs defaultValue="source" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-4">
                  <TabsTrigger value="source" className="flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Source</span>
                  </TabsTrigger>
                  <TabsTrigger value="campaign" className="flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Campaign</span>
                  </TabsTrigger>
                  <TabsTrigger value="medium" className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Medium</span>
                  </TabsTrigger>
                  <TabsTrigger value="adset" className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Adset</span>
                  </TabsTrigger>
                  <TabsTrigger value="ad" className="flex items-center gap-1.5">
                    <MousePointer className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ad</span>
                  </TabsTrigger>
                  <TabsTrigger value="creative" className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Creative</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="source">
                  <UTMBehaviorTable data={metricsBySource} dimensionLabel="Source" />
                </TabsContent>
                <TabsContent value="campaign">
                  <UTMBehaviorTable data={metricsByCampaign} dimensionLabel="Campanha" />
                </TabsContent>
                <TabsContent value="medium">
                  <UTMBehaviorTable data={metricsByMedium} dimensionLabel="Medium" />
                </TabsContent>
                <TabsContent value="adset">
                  <UTMBehaviorTable data={metricsByAdset} dimensionLabel="Adset" />
                </TabsContent>
                <TabsContent value="ad">
                  <UTMBehaviorTable data={metricsByAd} dimensionLabel="Ad" />
                </TabsContent>
                <TabsContent value="creative">
                  <UTMBehaviorTable data={metricsByCreative} dimensionLabel="Creative" />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
