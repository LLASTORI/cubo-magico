/**
 * Hook canônico para Jornada de Clientes
 * 
 * PROMPT 3: Consolidação Total do Orders Core
 * 
 * Fonte única: Orders Core (orders + order_items via crm_journey_orders_view)
 * ❌ crm_transactions foi removido definitivamente
 * ✅ CSV e Webhook são indistinguíveis
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

export interface JourneyCustomer {
  email: string;
  name: string | null;
  contactId: string | null;
  orders: JourneyOrder[];
  totalSpent: number;
  orderCount: number;
  firstOrderAt: string;
  lastOrderAt: string;
  products: string[];
}

export interface JourneyOrder {
  orderId: string;
  orderedAt: string;
  productName: string;
  offerName: string | null;
  totalPrice: number;
  isFirstPurchase: boolean;
  funnelId: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
}

interface JourneyOrdersViewRow {
  order_id: string;
  provider_order_id: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string;
  ordered_at: string;
  customer_paid: number;
  producer_net: number;
  currency: string;
  provider: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_placement: string | null;
  utm_creative: string | null;
  items_count: number;
  status: string;
  products_detail: Array<{
    product_name: string;
    offer_name: string | null;
    base_price: number;
    item_type: string;
    funnel_id: string | null;
  }>;
  main_product_name: string | null;
  main_funnel_id: string | null;
  purchase_sequence: number;
}

export function useCRMJourneyFallback() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  // Buscar dados de Orders Core usando a view canônica (inclui produtos)
  const { data: ordersData = [], isLoading } = useQuery({
    queryKey: ['orders-core-journey', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Usar a view canônica que já traz produtos consolidados
      const { data, error } = await supabase
        .from('crm_journey_orders_view')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('ordered_at', { ascending: true })
        .limit(5000);
      
      if (error) throw error;
      // Cast necessário devido ao tipo Json do products_detail
      return (data || []) as unknown as JourneyOrdersViewRow[];
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  // Processar dados em formato unificado
  const customers = useMemo((): JourneyCustomer[] => {
    const customerMap = new Map<string, JourneyCustomer>();

    ordersData.forEach((order) => {
      const email = order.contact_email;
      if (!email) return;

      if (!customerMap.has(email)) {
        customerMap.set(email, {
          email,
          name: order.contact_name,
          contactId: order.contact_id,
          orders: [],
          totalSpent: 0,
          orderCount: 0,
          firstOrderAt: order.ordered_at,
          lastOrderAt: order.ordered_at,
          products: [],
        });
      }

      const customer = customerMap.get(email)!;
      const isFirst = order.purchase_sequence === 1;
      
      // Extrair nome do produto principal
      const productName = order.main_product_name || 'Pedido';
      const mainProduct = order.products_detail?.[0];
      const mainFunnelId = order.main_funnel_id || mainProduct?.funnel_id || null;

      customer.orders.push({
        orderId: order.order_id,
        orderedAt: order.ordered_at,
        productName,
        offerName: mainProduct?.offer_name || null,
        totalPrice: order.customer_paid,
        isFirstPurchase: isFirst,
        funnelId: mainFunnelId,
        utmSource: order.utm_source,
        utmCampaign: order.utm_campaign,
      });

      customer.totalSpent += order.customer_paid;
      customer.orderCount++;
      
      // Adicionar produtos únicos
      if (productName && !customer.products.includes(productName)) {
        customer.products.push(productName);
      }
      
      if (order.ordered_at < customer.firstOrderAt) customer.firstOrderAt = order.ordered_at;
      if (order.ordered_at > customer.lastOrderAt) customer.lastOrderAt = order.ordered_at;
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [ordersData]);

  // Calcular resumo
  const summary = useMemo(() => {
    const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0);
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const repeatCustomers = customers.filter(c => c.orderCount >= 2).length;

    return {
      totalOrders,
      totalCustomers,
      totalRevenue,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      repeatCustomerRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
    };
  }, [customers]);

  return {
    customers,
    summary,
    isLoading,
    // Metadata (interno)
    _dataSource: 'orders_core' as const,
  };
}
