import { useState, useMemo } from "react";
import { 
  RefreshCw, CalendarIcon, Rocket, TrendingUp, DollarSign, 
  ShoppingCart, Target, Search, ChevronDown, ChevronUp, Settings, Layers
} from "lucide-react";
import { toast } from "sonner";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CubeLoader } from "@/components/CubeLoader";
import { AppHeader } from "@/components/AppHeader";
import { LaunchConfigDialog } from "@/components/launch/LaunchConfigDialog";
import { LaunchPhasesOverview } from "@/components/launch/LaunchPhasesOverview";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useLaunchData, LaunchMetrics } from "@/hooks/useLaunchData";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatNumber = (value: number, decimals = 2) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const LaunchDashboard = () => {
  const { currentProject } = useProject();
  
  // Date states
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [appliedStartDate, setAppliedStartDate] = useState<Date>(subDays(new Date(), 30));
  const [appliedEndDate, setAppliedEndDate] = useState<Date>(new Date());
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  
  // Expanded rows
  const [expandedFunnels, setExpandedFunnels] = useState<Set<string>>(new Set());

  const {
    funnels,
    launchMetrics,
    summaryMetrics,
    isLoading,
    loadingSales,
    loadingInsights,
    refetchAll,
  } = useLaunchData({
    projectId: currentProject?.id,
    startDate: appliedStartDate,
    endDate: appliedEndDate,
  });

  // Date handlers
  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    if (date > endDate) {
      setEndDate(date);
    }
    setTimeout(() => setEndDatePopoverOpen(true), 100);
  };

  const handleEndDateChange = (date: Date) => {
    if (date < startDate) return;
    setEndDate(date);
    setEndDatePopoverOpen(false);
  };

  const setQuickDate = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  const setThisMonth = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(new Date());
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setStartDate(startOfMonth(lastMonth));
    setEndDate(endOfMonth(lastMonth));
  };

  const handleSearch = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleRefresh = async () => {
    toast.info('Atualizando dados...');
    await refetchAll();
    toast.success('Dados atualizados');
  };

  const toggleExpand = (funnelId: string) => {
    setExpandedFunnels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(funnelId)) {
        newSet.delete(funnelId);
      } else {
        newSet.add(funnelId);
      }
      return newSet;
    });
  };

  const getRoasStatus = (roas: number, target: number) => {
    if (roas >= target * 1.2) return { color: 'text-green-600', bg: 'bg-green-500/20', label: 'Excelente' };
    if (roas >= target) return { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Meta' };
    if (roas >= target * 0.8) return { color: 'text-yellow-600', bg: 'bg-yellow-500/20', label: 'Atenção' };
    return { color: 'text-red-600', bg: 'bg-red-500/20', label: 'Crítico' };
  };

  const datesChanged = startDate.getTime() !== appliedStartDate.getTime() || endDate.getTime() !== appliedEndDate.getTime();

  if (!currentProject) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setQuickDate(7)}>7 dias</Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDate(30)}>30 dias</Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDate(60)}>60 dias</Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDate(90)}>90 dias</Button>
                  <Button variant="outline" size="sm" onClick={setThisMonth}>Este mês</Button>
                  <Button variant="outline" size="sm" onClick={setLastMonth}>Mês passado</Button>
                </div>

                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => d && handleStartDateChange(d)}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">até</span>
                  <Popover open={endDatePopoverOpen} onOpenChange={setEndDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => d && handleEndDateChange(d)}
                        disabled={(date) => date < startDate || date > new Date()}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Button 
                    variant={datesChanged ? "default" : "outline"} 
                    size="sm" 
                    onClick={handleSearch}
                    className="gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Buscar
                  </Button>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    disabled={loadingSales || loadingInsights}
                    className="gap-2"
                  >
                    <RefreshCw className={cn("w-4 h-4", (loadingSales || loadingInsights) && "animate-spin")} />
                    Atualizar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar dados de vendas e Meta Ads</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="p-4 bg-gradient-to-br from-card to-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Rocket className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Lançamentos</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.funnelCount}</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-card to-green-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs text-muted-foreground">Faturamento</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(summaryMetrics.totalRevenue)}</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-card to-blue-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs text-muted-foreground">Vendas</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.totalSales}</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-card to-purple-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs text-muted-foreground">Investimento</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(summaryMetrics.totalSpend)}</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-card to-orange-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-xs text-muted-foreground">ROAS Geral</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatNumber(summaryMetrics.roas)}x</p>
            </Card>

            <Card className={cn(
              "p-4 bg-gradient-to-br from-card",
              summaryMetrics.profit >= 0 ? "to-green-500/5" : "to-red-500/5"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  summaryMetrics.profit >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  <DollarSign className={cn(
                    "w-4 h-4",
                    summaryMetrics.profit >= 0 ? "text-green-600" : "text-red-600"
                  )} />
                </div>
                <span className="text-xs text-muted-foreground">Lucro</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                summaryMetrics.profit >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(summaryMetrics.profit)}
              </p>
            </Card>
          </div>

          {/* Launch Table */}
          {loadingSales || isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <CubeLoader message="Carregando lançamentos..." size="lg" />
            </div>
          ) : funnels.length === 0 ? (
            <Card className="p-12 text-center">
              <Rocket className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum lançamento encontrado
              </h3>
              <p className="text-muted-foreground">
                Crie funis do tipo "Lançamento" para visualizar os dados aqui.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Lançamento</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {launchMetrics.map((launch) => {
                    const isExpanded = expandedFunnels.has(launch.funnelId);
                    const status = getRoasStatus(launch.roas, launch.roasTarget);
                    const roasProgress = Math.min(100, (launch.roas / launch.roasTarget) * 100);

                    return (
                      <>
                        <TableRow 
                          key={launch.funnelId}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(launch.funnelId)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Rocket className="w-4 h-4 text-primary" />
                              <div>
                                <p className="font-medium">{launch.funnelName}</p>
                                {launch.campaignPattern && (
                                  <p className="text-xs text-muted-foreground">
                                    Padrão: {launch.campaignPattern}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(launch.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {launch.totalSales}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(launch.avgTicket)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(launch.totalSpend)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={cn("font-bold", status.color)}>
                                {formatNumber(launch.roas)}x
                              </span>
                              <div className="w-16">
                                <Progress 
                                  value={roasProgress} 
                                  className={cn("h-1", status.bg)}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Meta: {launch.roasTarget}x
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-semibold",
                            launch.profit >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(launch.profit)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn(status.bg, status.color, "border-0")}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <LaunchConfigDialog
                              funnel={funnels.find(f => f.id === launch.funnelId) || { 
                                id: launch.funnelId, 
                                name: launch.funnelName, 
                                project_id: currentProject?.id || null 
                              }}
                              trigger={
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                              }
                            />
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={10} className="p-4">
                              <div className="space-y-6">
                                {/* Phases Section */}
                                <LaunchPhasesOverview
                                  projectId={currentProject?.id || ""}
                                  funnelId={launch.funnelId}
                                  startDate={appliedStartDate}
                                  endDate={appliedEndDate}
                                />

                                {/* Positions Section */}
                                {launch.positions.length > 0 && (
                                  <div className="space-y-4 pt-4 border-t">
                                    <h4 className="text-sm font-semibold text-foreground">
                                      Detalhamento por Posição
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {launch.positions.map((pos, idx) => (
                                        <Card key={idx} className="p-3 bg-card">
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <Badge variant="outline" className="text-xs">
                                                {pos.tipo}
                                              </Badge>
                                              <p className="text-sm font-medium mt-1">{pos.nome}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {formatNumber(pos.percentage, 1)}%
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                              <p className="text-muted-foreground">Receita</p>
                                              <p className="font-semibold">{formatCurrency(pos.revenue)}</p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Vendas</p>
                                              <p className="font-semibold">{pos.sales}</p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Ticket</p>
                                              <p className="font-semibold">{formatCurrency(pos.avgTicket)}</p>
                                            </div>
                                          </div>
                                          <Progress 
                                            value={pos.percentage} 
                                            className="h-1 mt-2"
                                          />
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Info Card */}
          <Card className="p-4 bg-muted/30 border-dashed">
            <div className="flex items-start gap-3">
              <Rocket className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground">Sobre os Lançamentos</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Este dashboard mostra a performance dos funis do tipo "Lançamento". 
                  O investimento é calculado baseado no padrão de nome das campanhas Meta Ads configurado em cada funil.
                  Configure seus funis em <strong>Mapeamento de Ofertas</strong> para ver dados completos.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default LaunchDashboard;
