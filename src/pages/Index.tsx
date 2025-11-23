import { useState, useEffect } from "react";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import SalesTable from "@/components/SalesTable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHotmartData();
  }, []);

  const fetchHotmartData = async () => {
    try {
      setLoading(true);
      
      // Get current date and 30 days ago
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const params = {
        start_date: startDate.getTime(),
        end_date: endDate.getTime(),
        max_results: 10,
      };

      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/sales/history',
          params,
        },
      });

      if (error) throw error;

      console.log('Hotmart data:', data);
      setSalesData(data);
    } catch (error: any) {
      console.error('Error fetching Hotmart data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Não foi possível conectar à API da Hotmart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration
  const mockMetrics = {
    totalSales: "R$ 47.350,00",
    transactions: 156,
    customers: 89,
    growth: "+12.5%",
  };

  const mockSales = [
    {
      transaction: "HP123456",
      product: "Curso de Marketing Digital",
      buyer: "João Silva",
      value: 497.00,
      status: "Approved",
      date: "22/11/2025",
    },
    {
      transaction: "HP123457",
      product: "Ebook: Vendas Online",
      buyer: "Maria Santos",
      value: 97.00,
      status: "Complete",
      date: "22/11/2025",
    },
    {
      transaction: "HP123458",
      product: "Consultoria Premium",
      buyer: "Pedro Costa",
      value: 1997.00,
      status: "Pending",
      date: "21/11/2025",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard Hotmart
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe suas vendas e métricas em tempo real
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Vendas Totais"
                value={mockMetrics.totalSales}
                icon={DollarSign}
                trend={mockMetrics.growth}
                trendUp={true}
              />
              <MetricCard
                title="Transações"
                value={mockMetrics.transactions}
                icon={ShoppingCart}
                trend="+8 hoje"
                trendUp={true}
              />
              <MetricCard
                title="Clientes"
                value={mockMetrics.customers}
                icon={Users}
                trend="+5 novos"
                trendUp={true}
              />
              <MetricCard
                title="Crescimento"
                value={mockMetrics.growth}
                icon={TrendingUp}
                trend="vs. mês anterior"
                trendUp={true}
              />
            </div>

            {/* Sales Table */}
            <SalesTable sales={mockSales} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
