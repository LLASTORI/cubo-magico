/**
 * Hook com fallback silencioso para Jornada de Clientes
 * 
 * PROMPT 29: Fallback ≠ Legado
 * 
 * Estratégia:
 * - SE Orders Core tem dados → usar Orders Core (canônico)
 * - SENÃO → usar crm_transactions (fallback silencioso)
 * 
 * O usuário não precisa saber qual fonte está sendo usada.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';

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

interface OrdersCoreRow {
  id: string;
  buyer_email: string;
  buyer_name: string | null;
  customer_paid: number;
  ordered_at: string;
  status: string;
  utm_source: string | null;
  utm_campaign: string | null;
}

interface TransactionRow {
  id: string;
  contact_id: string;
  product_name: string | null;
  offer_name: string | null;
  total_price: number | null;
  transaction_date: string | null;
  status: string;
  utm_source: string | null;
  utm_campaign: string | null;
  funnel_id: string | null;
}

interface ContactRow {
  id: string;
  email: string;
  name: string | null;
}

export function useCRMJourneyFallback() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  // PROMPT FORENSE: Orders Core está populado via CSV canônico + webhook
  // Ativando Orders Core como fonte primária conforme docs/CRM_CUSTOMER_INTELLIGENCE.md:177-183
  const useOrdersCore = true;

  // 2. Buscar dados de Orders Core usando a view canônica (inclui produtos)
  const { data: ordersData = [], isLoading: loadingOrders } = useQuery({
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
    enabled: !!projectId && useOrdersCore,
    staleTime: 1000 * 60 * 5,
  });

  // 3. Buscar dados de crm_transactions (fallback)
  const { data: transactionsData = [], isLoading: loadingTransactions } = usePaginatedQuery<TransactionRow>(
    ['crm-journey-transactions-fallback', projectId],
    {
      table: 'crm_transactions',
      select: 'id, contact_id, product_name, offer_name, total_price, transaction_date, status, utm_source, utm_campaign, funnel_id',
      filters: { project_id: projectId },
      inFilters: { status: ['APPROVED', 'COMPLETE'] },
      orderBy: { column: 'transaction_date', ascending: true },
      enabled: !!projectId && !useOrdersCore,
    }
  );

  // 4. Buscar contatos (para fallback)
  const { data: contactsData = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['crm-contacts-for-journey', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('id, email, name')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as ContactRow[];
    },
    enabled: !!projectId && !useOrdersCore,
    staleTime: 1000 * 60 * 5,
  });

  // 5. Processar dados em formato unificado
  const customers = useMemo((): JourneyCustomer[] => {
    if (useOrdersCore) {
      // Processar Orders Core via view canônica
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
    } else {
      // Processar crm_transactions (fallback)
      const contactMap = new Map(contactsData.map(c => [c.id, c]));
      const customerMap = new Map<string, JourneyCustomer>();

      transactionsData.forEach((tx) => {
        const contact = contactMap.get(tx.contact_id);
        if (!contact) return;

        const email = contact.email;
        if (!customerMap.has(email)) {
          customerMap.set(email, {
            email,
            name: contact.name,
            contactId: contact.id,
            orders: [],
            totalSpent: 0,
            orderCount: 0,
            firstOrderAt: tx.transaction_date || new Date().toISOString(),
            lastOrderAt: tx.transaction_date || new Date().toISOString(),
            products: [],
          });
        }

        const customer = customerMap.get(email)!;
        const isFirst = customer.orders.length === 0;
        const productName = tx.product_name || 'Produto não identificado';

        customer.orders.push({
          orderId: tx.id,
          orderedAt: tx.transaction_date || new Date().toISOString(),
          productName,
          offerName: tx.offer_name,
          totalPrice: tx.total_price || 0,
          isFirstPurchase: isFirst,
          funnelId: tx.funnel_id,
          utmSource: tx.utm_source,
          utmCampaign: tx.utm_campaign,
        });

        customer.totalSpent += tx.total_price || 0;
        customer.orderCount++;
        if (!customer.products.includes(productName)) {
          customer.products.push(productName);
        }

        const txDate = tx.transaction_date || new Date().toISOString();
        if (txDate < customer.firstOrderAt) customer.firstOrderAt = txDate;
        if (txDate > customer.lastOrderAt) customer.lastOrderAt = txDate;
      });

      return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    }
  }, [useOrdersCore, ordersData, transactionsData, contactsData]);

  // 6. Calcular resumo
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

  const isLoading = loadingOrders || loadingTransactions || loadingContacts;

  return {
    customers,
    summary,
    isLoading,
    // Metadata (interno, não expor ao usuário)
    _dataSource: useOrdersCore ? 'orders_core' : 'crm_transactions',
  };
}
