/**
 * OrderDetailDialog
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FONTE DE PRODUTOS: order_items (ÚNICA E EXCLUSIVA)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * REGRAS OBRIGATÓRIAS:
 * ✓ Buscar produtos SOMENTE de order_items por order_id
 * ✓ Cada produto exibe: nome, tipo, preço base
 * ✓ Soma visual dos produtos = orders.customer_paid
 * 
 * PROIBIDO:
 * ❌ Buscar produtos por transaction_id
 * ❌ Usar ledger_events para listar produtos
 * ❌ Qualquer fonte que não seja order_items
 * 
 * Ledger EXPLICA a decomposição financeira, mas NUNCA altera valores
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DollarSign, 
  Package, 
  User, 
  Calendar, 
  CreditCard,
  ArrowDown,
  ArrowUp,
  Info,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Wallet
} from "lucide-react";
import { useOrdersCore, OrderRecord, LedgerBreakdown } from "@/hooks/useOrdersCore";
import { supabase } from "@/integrations/supabase/client";
import { PaymentMethodBadge } from "@/components/PaymentMethodBadge";

interface OrderDetailDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('pt-BR');
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'complete':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'refunded':
    case 'cancelled':
    case 'chargeback':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'approved': 'Aprovado',
    'complete': 'Completo',
    'pending': 'Pendente',
    'refunded': 'Reembolsado',
    'cancelled': 'Cancelado',
    'chargeback': 'Chargeback',
  };
  return labels[status.toLowerCase()] || status;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ORDENAÇÃO VISUAL DOS PRODUTOS (ALINHADA COM HOTMART)
// ═══════════════════════════════════════════════════════════════════════════════
// Ordem: main → orderbump → upsell → downsell → addon
// Esta ordenação é APENAS VISUAL, nunca altera valores financeiros
// ═══════════════════════════════════════════════════════════════════════════════

const ITEM_TYPE_ORDER: Record<string, number> = {
  'main': 1,
  'bump': 2,
  'orderbump': 2,
  'upsell': 3,
  'downsell': 4,
  'addon': 5,
  'combo': 6,
};

const getItemTypeSortOrder = (itemType: string): number => {
  return ITEM_TYPE_ORDER[itemType.toLowerCase()] || 99;
};

// Item type labels for display
const getItemTypeLabel = (itemType: string) => {
  const labels: Record<string, string> = {
    'main': 'Principal',
    'bump': 'Order Bump',
    'orderbump': 'Order Bump',
    'upsell': 'Upsell',
    'downsell': 'Downsell',
    'addon': 'Addon',
    'combo': 'Combo',
  };
  return labels[itemType.toLowerCase()] || itemType;
};

const getItemTypeBadgeColor = (itemType: string) => {
  switch (itemType.toLowerCase()) {
    case 'main':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'bump':
    case 'orderbump':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    case 'upsell':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'downsell':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
    case 'addon':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'combo':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Funnel name is resolved at runtime via funnel_id.
// funnel_id is the canonical link; name is a mutable label.
type FunnelNameMap = Record<string, string>;

export function OrderDetailDialog({ orderId, open, onOpenChange }: OrderDetailDialogProps) {
  const { fetchOrderDetail } = useOrdersCore();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [breakdown, setBreakdown] = useState<LedgerBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [funnelNames, setFunnelNames] = useState<FunnelNameMap>({});

  useEffect(() => {
    if (open && orderId) {
      setLoading(true);
      fetchOrderDetail(orderId).then(({ order, breakdown }) => {
        setOrder(order);
        setBreakdown(breakdown);
        setLoading(false);
      });
    } else {
      setOrder(null);
      setBreakdown(null);
      setFunnelNames({});
    }
  }, [open, orderId, fetchOrderDetail]);

  // Fetch funnel names when order is loaded and has funnel_ids
  useEffect(() => {
    if (!order) return;
    
    const funnelIds = [...new Set(order.products.filter(p => p.funnel_id).map(p => p.funnel_id!))]
      .filter(Boolean);
    
    if (funnelIds.length === 0) return;

    const fetchFunnelNames = async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .in('id', funnelIds);

      if (error) {
        console.error('Error fetching funnel names:', error);
        return;
      }

      const nameMap: FunnelNameMap = {};
      data?.forEach(f => {
        nameMap[f.id] = f.name;
      });
      setFunnelNames(nameMap);
    };

    fetchFunnelNames();
  }, [order]);

  // Resolve funnel_id to name with fallback
  const getFunnelDisplayName = (funnelId: string): { name: string; isRemoved: boolean } => {
    const name = funnelNames[funnelId];
    if (name) {
      return { name, isRemoved: false };
    }
    return { name: '[Funil removido ou renomeado]', isRemoved: true };
  };

  // Validate ledger breakdown matches order values
  const validateBreakdown = () => {
    if (!order || !breakdown) return null;
    
    const totalDeductions = breakdown.platform_fee + breakdown.coproducer + breakdown.affiliate;
    const calculatedNet = order.customer_paid - totalDeductions;
    const difference = Math.abs(calculatedNet - order.producer_net);
    
    return {
      matches: difference < 0.02, // Allow 2 cents tolerance for rounding
      calculatedNet,
      difference,
    };
  };

  const validation = validateBreakdown();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Detalhes do Pedido
          </DialogTitle>
          <DialogDescription>
            Breakdown financeiro completo baseado no Orders Core
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-mono text-lg font-semibold">{order.provider_order_id}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(order.ordered_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase">
                  {order.provider}
                </Badge>
                <Badge variant="outline" className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
            </div>

            {/* Customer Info + Payment Method */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Cliente</span>
                </div>
                {/* Payment Method Badge (PROMPT 2) */}
                <PaymentMethodBadge 
                  paymentMethod={order.payment_method} 
                  installments={order.installments}
                  size="md"
                />
              </div>
              <p className="text-foreground">{order.buyer_name || '-'}</p>
              <p className="text-sm text-muted-foreground">{order.buyer_email || '-'}</p>
            </div>

            <Separator />

            {/* Products List - FONTE EXCLUSIVA: order_items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Produtos ({order.products.length})</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Fonte: order_items
                </span>
              </div>
              <div className="space-y-2">
                {/* ORDENAÇÃO: main → orderbump → upsell → downsell → addon (APENAS VISUAL) */}
                {[...order.products]
                  .sort((a, b) => getItemTypeSortOrder(a.item_type) - getItemTypeSortOrder(b.item_type))
                  .map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{item.product_name || 'Produto sem nome'}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs shrink-0 ${getItemTypeBadgeColor(item.item_type)}`}
                        >
                          {getItemTypeLabel(item.item_type)}
                        </Badge>
                      </div>
                      {item.offer_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.offer_name}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold ml-4 shrink-0">
                      {formatCurrency(item.base_price)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Soma dos produtos vs customer_paid */}
              {(() => {
                const productsSum = order.products.reduce((sum, item) => sum + item.base_price, 0);
                const difference = Math.abs(productsSum - order.customer_paid);
                const matches = difference < 0.02; // 2 centavos de tolerância
                
                return (
                  <div className={`flex items-center justify-between mt-3 p-2 rounded text-sm ${
                    matches 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-yellow-500/10 border border-yellow-500/20'
                  }`}>
                    <span className={matches ? 'text-green-600' : 'text-yellow-600'}>
                      Soma dos produtos:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${matches ? 'text-green-600' : 'text-yellow-600'}`}>
                        {formatCurrency(productsSum)}
                      </span>
                      {matches ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <Separator />

            {/* ═══════════════════════════════════════════════════════════════════════════════
                DECOMPOSIÇÃO FINANCEIRA - NÍVEL DO PEDIDO (OBRIGATÓRIO)
                ═══════════════════════════════════════════════════════════════════════════════
                
                REGRAS CANÔNICAS:
                ✓ Cliente pagou = orders.customer_paid (NUNCA calcular soma de itens)
                ✓ Taxas/deduções = ledger_events agregados por order_id
                ✓ Produtor recebe = orders.producer_net (NUNCA calcular manualmente)
                
                PROIBIDO:
                ❌ Calcular valores financeiros por item individual
                ❌ Mostrar breakdown por produto
                ❌ Usar valores de order_items para totais financeiros
                
                A decomposição é SEMPRE no nível do PEDIDO, independente da quantidade de produtos
                ═══════════════════════════════════════════════════════════════════════════════ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Decomposição Financeira</span>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Nível: Pedido
                </span>
              </div>
              
              {/* What customer paid (GROSS) - ALWAYS from orders.customer_paid */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Cliente pagou
                    </span>
                  </div>
                  <span className="text-xl font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(order.customer_paid)}
                  </span>
                </div>
                <p className="text-xs text-green-600/70 mt-1">
                  Valor bruto total do pedido (orders.customer_paid)
                </p>
              </div>

              {/* Deductions from ledger_events (aggregated at ORDER level) */}
              {breakdown && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Deduções agregadas (ledger_events):
                  </p>
                  {breakdown.platform_fee > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Taxas Hotmart</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.platform_fee)}</span>
                    </div>
                  )}
                  {breakdown.coproducer > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Coprodução</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px] text-sm">
                              <p>A taxa da Hotmart é descontada apenas do produtor.</p>
                              <p className="mt-1">A coprodução é calculada sobre a base líquida da venda.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="text-red-600">- {formatCurrency(breakdown.coproducer)}</span>
                    </div>
                  )}
                  {breakdown.affiliate > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Afiliados</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.affiliate)}</span>
                    </div>
                  )}
                  {breakdown.tax > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Impostos</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.tax)}</span>
                    </div>
                  )}
                  {breakdown.refund > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Reembolso</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.refund)}</span>
                    </div>
                  )}
                  {breakdown.chargeback > 0 && (
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span className="text-muted-foreground">Chargeback</span>
                      <span className="text-red-600">- {formatCurrency(breakdown.chargeback)}</span>
                    </div>
                  )}
                </div>
              )}

              <Separator className="my-2" />

              {/* What producer receives (NET) - ALWAYS from orders.producer_net */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-primary" />
                    <span className="font-medium text-primary">
                      Produtor recebe
                    </span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(order.producer_net)}
                  </span>
                </div>
                <p className="text-xs text-primary/70 mt-1">
                  Valor líquido total do produtor (orders.producer_net)
                </p>
              </div>

              {/* Validation: ledger breakdown should match order values */}
              {validation && (
                <div className={`flex items-center gap-2 mt-3 p-2 rounded text-xs ${
                  validation.matches 
                    ? 'bg-green-500/10 text-green-600' 
                    : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                  {validation.matches ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>✓ Ledger valida: customer_paid − deduções = producer_net</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>
                        ⚠ Diferença de {formatCurrency(validation.difference)} 
                        (calculado: {formatCurrency(validation.calculatedNet)})
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════════════
                ORIGEM DA VENDA (UTM) - COLUNAS MATERIALIZADAS
                ═══════════════════════════════════════════════════════════════════════════════
                
                REGRAS CANÔNICAS:
                ✓ UTMs vêm EXCLUSIVAMENTE de orders.utm_*
                ✓ UTMs são atributos do PEDIDO, não dos itens
                ✓ Preenchidas no webhook ou backfill
                ✓ SEMPRE exibir seção, mesmo se vazia (PROMPT 14)
                
                PROIBIDO:
                ❌ Parsing de raw_payload
                ❌ Buscar UTMs de hotmart_sales
                ═══════════════════════════════════════════════════════════════════════════════ */}
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Origem da Venda (UTM)</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px] text-sm">
                        <p>As UTMs são capturadas no checkout e associadas ao pedido como um todo.</p>
                        <p className="mt-1 text-xs text-muted-foreground">Fonte: colunas materializadas em orders.*</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Badge variant="outline" className="text-xs bg-muted">
                  Fonte: Pedido
                </Badge>
              </div>
              
              {/* Task 3: Always show UTM section, with explanatory text when empty */}
              {(order.utm_source || order.utm_campaign || order.utm_adset || order.utm_placement || order.utm_creative) ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-muted/30 rounded-lg p-3">
                  {order.utm_source && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Source</span>
                      <span className="font-medium truncate">{order.utm_source}</span>
                    </div>
                  )}
                  {order.utm_campaign && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Campaign</span>
                      <span className="font-medium truncate">{order.utm_campaign}</span>
                    </div>
                  )}
                  {order.utm_adset && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Adset</span>
                      <span className="font-medium truncate">{order.utm_adset}</span>
                    </div>
                  )}
                  {order.utm_placement && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Placement</span>
                      <span className="font-medium truncate">{order.utm_placement}</span>
                    </div>
                  )}
                  {order.utm_creative && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Creative</span>
                      <span className="font-medium truncate">{order.utm_creative}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                  <p>Este pedido não possui parâmetros de UTM enviados pela plataforma de origem.</p>
                </div>
              )}
            </div>

            {/* Task 4: Funnel visible in modal */}
            {order.products.some(p => p.funnel_id) && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {[...new Set(order.products.filter(p => p.funnel_id).map(p => p.funnel_id))].length > 1 
                          ? 'Funis' 
                          : 'Funil'}
                      </span>
                    </div>
                    {[...new Set(order.products.filter(p => p.funnel_id).map(p => p.funnel_id))].length > 1 && (
                      <Badge variant="outline" className="text-xs bg-muted">
                        Múltiplos Funis
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(order.products.filter(p => p.funnel_id).map(p => p.funnel_id!))].map((funnelId, idx) => {
                      const { name, isRemoved } = getFunnelDisplayName(funnelId);
                      return (
                        <TooltipProvider key={idx}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${isRemoved ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' : ''}`}
                              >
                                {isRemoved && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {name}
                              </Badge>
                            </TooltipTrigger>
                            {isRemoved && (
                              <TooltipContent className="max-w-[280px] text-sm">
                                <p>Este pedido está vinculado a um funil que foi removido ou renomeado.</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Data Source Badge */}
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center pt-2">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Fonte canônica: orders + order_items + ledger_events
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Pedido não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
