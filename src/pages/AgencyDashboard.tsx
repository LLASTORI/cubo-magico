import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { 
  DollarSign, 
  TrendingUp, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  ExternalLink,
  ShoppingCart,
  FolderOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppHeader } from "@/components/AppHeader";
import { CubeLoader } from "@/components/CubeLoader";
import { useAgencyOverview } from "@/hooks/useAgencyOverview";
import { useProject } from "@/contexts/ProjectContext";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCompactCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
};

const getRoasBadgeClass = (roas: number) => {
  if (roas >= 2) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (roas >= 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
};

const AgencyDashboard = () => {
  const navigate = useNavigate();
  const { setCurrentProject } = useProject();

  // Date range state
  const [dateRange, setDateRange] = useState('year');
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Update dates when range changes
  useEffect(() => {
    const now = new Date();
    switch (dateRange) {
      case '30d':
        setStartDate(format(subDays(now, 30), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case '90d':
        setStartDate(format(subDays(now, 90), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case '180d':
        setStartDate(format(subDays(now, 180), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'year':
        setStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'all':
        setStartDate('2020-01-01');
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
    }
  }, [dateRange]);

  const { projectSummaries, agencyTotals, isLoading } = useAgencyOverview({
    startDate,
    endDate,
  });

  const handleProjectClick = (projectId: string, projectName: string) => {
    // Set the project as current and navigate to overview
    setCurrentProject({ id: projectId, name: projectName } as any);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-background to-orange-500/10 border border-border/50 p-8">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_70%)]" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Visão da Agência
              </h1>
            </div>
            <p className="text-muted-foreground">
              Consolidado de {agencyTotals.projectCount} projeto{agencyTotals.projectCount !== 1 ? 's' : ''} sob sua gestão
            </p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center justify-end">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-52 border-border/50 bg-card/50">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="180d">Últimos 6 meses</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="lastMonth">Mês anterior</SelectItem>
              <SelectItem value="year">Ano atual</SelectItem>
              <SelectItem value="all">Todo o histórico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <CubeLoader size="lg" />
          </div>
        ) : projectSummaries.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">Nenhum projeto encontrado</p>
              <p className="text-muted-foreground mb-4">Você ainda não possui projetos cadastrados.</p>
              <Button onClick={() => navigate('/projects')}>
                Ir para Projetos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium">Investimento Total</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-blue-400">
                    {formatCompactCurrency(agencyTotals.totalInvestment)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-orange-400 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Faturamento Total</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-orange-400">
                    {formatCompactCurrency(agencyTotals.totalRevenue)}
                  </p>
                </CardContent>
              </Card>

              <Card className={`border-${agencyTotals.totalProfit >= 0 ? 'green' : 'red'}-500/30 bg-gradient-to-br from-${agencyTotals.totalProfit >= 0 ? 'green' : 'red'}-500/10 to-transparent`}>
                <CardContent className="p-4">
                  <div className={`flex items-center gap-2 ${agencyTotals.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} mb-2`}>
                    {agencyTotals.totalProfit >= 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span className="text-xs font-medium">Lucro Total</span>
                  </div>
                  <p className={`text-xl md:text-2xl font-bold ${agencyTotals.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCompactCurrency(agencyTotals.totalProfit)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-medium">ROAS Geral</span>
                  </div>
                  <p className={`text-xl md:text-2xl font-bold ${agencyTotals.totalRoas >= 2 ? 'text-green-400' : agencyTotals.totalRoas >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {agencyTotals.totalRoas.toFixed(2)}x
                  </p>
                </CardContent>
              </Card>

              <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-xs font-medium">Vendas Totais</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-purple-400">
                    {agencyTotals.totalSales}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Projects Comparison Table */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Performance por Projeto
                </CardTitle>
                <CardDescription>
                  Clique em um projeto para ver os detalhes completos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Projeto</TableHead>
                        <TableHead className="text-right font-semibold">Investimento</TableHead>
                        <TableHead className="text-right font-semibold">Faturamento</TableHead>
                        <TableHead className="text-right font-semibold">Lucro</TableHead>
                        <TableHead className="text-right font-semibold">ROAS</TableHead>
                        <TableHead className="text-right font-semibold">Vendas</TableHead>
                        <TableHead className="text-center font-semibold">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectSummaries.map((project) => (
                        <TableRow 
                          key={project.projectId} 
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleProjectClick(project.projectId, project.projectName)}
                        >
                          <TableCell className="font-medium">{project.projectName}</TableCell>
                          <TableCell className="text-right text-blue-400">{formatCompactCurrency(project.investment)}</TableCell>
                          <TableCell className="text-right text-orange-400">{formatCompactCurrency(project.revenue)}</TableCell>
                          <TableCell className={`text-right ${project.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCompactCurrency(project.profit)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoasBadgeClass(project.roas)}`}>
                              {project.roas.toFixed(2)}x
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-purple-400">{project.sales}</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProjectClick(project.projectId, project.projectName);
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="bg-primary/10 border-t-2 border-primary/30 font-bold">
                        <TableCell className="font-bold text-primary">TOTAL AGÊNCIA</TableCell>
                        <TableCell className="text-right text-blue-400 font-bold">{formatCompactCurrency(agencyTotals.totalInvestment)}</TableCell>
                        <TableCell className="text-right text-orange-400 font-bold">{formatCompactCurrency(agencyTotals.totalRevenue)}</TableCell>
                        <TableCell className={`text-right font-bold ${agencyTotals.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCompactCurrency(agencyTotals.totalProfit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getRoasBadgeClass(agencyTotals.totalRoas)}`}>
                            {agencyTotals.totalRoas.toFixed(2)}x
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-purple-400 font-bold">{agencyTotals.totalSales}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default AgencyDashboard;
