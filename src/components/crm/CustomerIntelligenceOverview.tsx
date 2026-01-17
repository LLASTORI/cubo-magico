/**
 * Visão Geral - Inteligência de Clientes
 * 
 * PROMPT 28 - UX Premium nível Cubo Mágico
 * 
 * 3 Blocos:
 * 1. Base de Contatos (macro)
 * 2. Valor da Base (financeiro)
 * 3. Comportamento (recompra)
 * 
 * Performance: < 500ms (1 query via view agregada)
 */
import { useCustomerIntelligenceOverview } from '@/hooks/useCustomerIntelligenceOverview';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart,
  Repeat,
  BarChart3
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Formatar moeda BRL
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Formatar número com separador de milhares
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

// Card de métrica individual
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  tooltip?: string;
  variant?: 'default' | 'primary' | 'success';
}

function MetricCard({ icon, label, value, subtitle, tooltip, variant = 'default' }: MetricCardProps) {
  const cardContent = (
    <Card className={`
      transition-all duration-200 hover:shadow-md
      ${variant === 'primary' ? 'border-primary/30 bg-primary/5' : ''}
      ${variant === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : ''}
    `}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`
            p-2 rounded-lg
            ${variant === 'primary' ? 'bg-primary/10 text-primary' : ''}
            ${variant === 'success' ? 'bg-emerald-500/10 text-emerald-600' : ''}
            ${variant === 'default' ? 'bg-muted text-muted-foreground' : ''}
          `}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold mt-0.5 truncate">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}

// Skeleton para loading
function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Bloco 1 */}
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
      {/* Bloco 2 */}
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
      {/* Bloco 3 */}
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomerIntelligenceOverview() {
  const {
    isLoading,
    totalContacts,
    totalCustomers,
    totalLeads,
    customersPercent,
    leadsPercent,
    totalRevenue,
    avgLtv,
    avgTicket,
    avgOrdersPerCustomer,
    repeatCustomersCount,
    repeatRatePercent,
  } = useCustomerIntelligenceOverview();

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        {/* ═══════════════════════════════════════════════════════════════
            BLOCO 1: BASE DE CONTATOS
            ═══════════════════════════════════════════════════════════════ */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Base de Contatos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              label="Total de Contatos"
              value={formatNumber(totalContacts)}
              tooltip="Todos os contatos cadastrados na base, independente de ter comprado ou não"
            />
            <MetricCard
              icon={<UserCheck className="h-5 w-5" />}
              label="Clientes"
              value={formatNumber(totalCustomers)}
              subtitle={`${customersPercent}% da base`}
              variant="success"
              tooltip="Contatos que realizaram pelo menos 1 compra aprovada"
            />
            <MetricCard
              icon={<UserPlus className="h-5 w-5" />}
              label="Leads"
              value={formatNumber(totalLeads)}
              subtitle={`${leadsPercent}% da base`}
              tooltip="Contatos que ainda não realizaram nenhuma compra"
            />
            <MetricCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="Taxa de Conversão"
              value={`${customersPercent}%`}
              subtitle="Leads → Clientes"
              variant="primary"
              tooltip="Percentual de contatos que se tornaram clientes"
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            BLOCO 2: VALOR DA BASE
            ═══════════════════════════════════════════════════════════════ */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valor da Base
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Receita Total"
              value={formatCurrency(totalRevenue)}
              variant="primary"
              tooltip="Soma de todos os pedidos aprovados"
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="LTV Médio"
              value={formatCurrency(avgLtv)}
              variant="success"
              tooltip="Receita total dividida pelo número de clientes"
            />
            <MetricCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label="Ticket Médio"
              value={formatCurrency(avgTicket)}
              tooltip="Receita total dividida pelo número de pedidos"
            />
            <MetricCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label="Compras por Cliente"
              value={avgOrdersPerCustomer.toFixed(1)}
              subtitle="pedidos em média"
              tooltip="Número médio de pedidos por cliente"
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            BLOCO 3: COMPORTAMENTO
            ═══════════════════════════════════════════════════════════════ */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Comportamento
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<Repeat className="h-5 w-5" />}
              label="Taxa de Recompra"
              value={`${repeatRatePercent}%`}
              variant="success"
              tooltip="Percentual de clientes com 2 ou mais compras"
            />
            <MetricCard
              icon={<UserCheck className="h-5 w-5" />}
              label="Clientes Recorrentes"
              value={formatNumber(repeatCustomersCount)}
              subtitle="com 2+ compras"
              tooltip="Número absoluto de clientes que compraram mais de uma vez"
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Potencial de Recompra"
              value={formatNumber(totalCustomers - repeatCustomersCount)}
              subtitle="clientes com 1 compra"
              tooltip="Clientes que compraram apenas 1 vez — potencial para recompra"
            />
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
