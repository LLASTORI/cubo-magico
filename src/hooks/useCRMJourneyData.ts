import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

export interface CustomerJourney {
  buyerEmail: string;
  buyerName: string;
  firstPurchaseDate: Date;
  entryProduct: string;
  entryOfferCode: string;
  entryFunnelId: string | null;
  entryFunnelName: string | null;
  totalPurchases: number;
  totalSpent: number;
  purchases: CustomerPurchase[];
  subsequentProducts: string[];
  previousProducts: string[];
  daysSinceFirstPurchase: number;
  avgTimeBetweenPurchases: number | null;
  contactSource: string;
  contactStatus: string;
  tags: string[];
}

export interface CustomerPurchase {
  transactionId: string;
  productName: string;
  offerCode: string;
  funnelId: string | null;
  funnelName: string | null;
  saleDate: Date;
  totalPrice: number;
  status: string;
  isEntry: boolean;
  isTarget: boolean;
  platform: string;
}

export interface EntryFilter {
  type: 'product' | 'funnel' | 'offer';
  values: string[];
}

export interface TargetFilter {
  type: 'product' | 'funnel' | 'offer';
  values: string[];
}

export interface DateFilter {
  startDate: Date | null;
  endDate: Date | null;
}

export interface CohortMetrics {
  entryProduct: string;
  entryFunnel: string | null;
  customerCount: number;
  avgLTV: number;
  avgPurchases: number;
  repeatRate: number;
  totalRevenue: number;
}

export interface OriginMetrics {
  product: string;
  funnel: string | null;
  customerCount: number;
  percentage: number;
  avgLTVAfter: number;
}

export interface JourneyMetrics {
  totalCustomers: number;
  avgLTV: number;
  avgPurchases: number;
  repeatCustomerRate: number;
  topSubsequentProducts: { product: string; count: number; percentage: number }[];
  cohortMetrics: CohortMetrics[];
  originMetrics: OriginMetrics[];
}

interface CRMContact {
  id: string;
  email: string;
  name: string | null;
  source: string;
  status: string;
  tags: string[] | null;
  total_purchases: number;
  total_revenue: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  first_seen_at: string;
}

interface CRMTransaction {
  id: string;
  contact_id: string;
  platform: string;
  external_id: string | null;
  product_name: string;
  offer_code: string | null;
  total_price_brl: number | null;
  status: string;
  transaction_date: string | null;
  funnel_id: string | null;
}

interface OfferMapping {
  codigo_oferta: string;
  funnel_id: string | null;
  nome_produto: string;
  nome_posicao?: string | null;
}

interface Funnel {
  id: string;
  name: string;
}

export interface CRMFilters {
  entryFilter: EntryFilter | null;
  targetFilter: TargetFilter | null;
  dateFilter: DateFilter;
  statusFilter: string[];
  transactionStatusFilter: string[];
  sourceFilter: string[];
  contactStatusFilter: string[];
  pageFilter: string[];
}

export const DEFAULT_STATUS_FILTER = ['APPROVED', 'COMPLETE'];
export const DEFAULT_CONTACT_STATUS_FILTER: string[] = [];
export const DEFAULT_SOURCE_FILTER: string[] = [];

export interface GenericBreakdown {
  key: string;
  label: string;
  count: number;
  uniqueClients: number;
}

export function useCRMJourneyData(filters: CRMFilters) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const { 
    entryFilter, 
    targetFilter, 
    dateFilter, 
    statusFilter,
    sourceFilter = [],
    contactStatusFilter = [],
    pageFilter = []
  } = filters;

  // Fetch all contacts for the project
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['crm-contacts', projectId, sourceFilter, contactStatusFilter, pageFilter],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allContacts: CRMContact[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('crm_contacts')
          .select('id, email, name, source, status, tags, total_purchases, total_revenue, first_purchase_at, last_purchase_at, first_seen_at, first_page_name')
          .eq('project_id', projectId);
        
        if (sourceFilter.length > 0) {
          query = query.in('source', sourceFilter);
        }
        
        if (contactStatusFilter.length > 0) {
          query = query.in('status', contactStatusFilter);
        }

        if (pageFilter.length > 0) {
          query = query.in('first_page_name', pageFilter);
        }
        
        const { data, error } = await query
          .order('first_seen_at', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allContacts.push(...(data as CRMContact[]));
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allContacts;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all transactions for the project
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['crm-transactions', projectId, statusFilter],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allTransactions: CRMTransaction[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('crm_transactions')
          .select('id, contact_id, platform, external_id, product_name, offer_code, total_price_brl, status, transaction_date, funnel_id')
          .eq('project_id', projectId);
        
        if (statusFilter.length > 0) {
          const statusValuesForQuery = statusFilter.flatMap((s) => [s, s.toLowerCase()]);
          query = query.in('status', statusValuesForQuery);
        }
        
        const { data, error } = await query
          .order('transaction_date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allTransactions.push(...(data as CRMTransaction[]));
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allTransactions;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all transactions for breakdown (no status filter)
  const { data: allTransactionsForBreakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ['crm-all-transactions-breakdown', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allTransactions: { status: string; contact_id: string; product_name: string; offer_code: string | null; platform: string }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('crm_transactions')
          .select('status, contact_id, product_name, offer_code, platform')
          .eq('project_id', projectId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allTransactions.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allTransactions;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all contacts for breakdown (contact-level stats)
  const { data: allContactsForBreakdown, isLoading: loadingContactsBreakdown } = useQuery({
    queryKey: ['crm-all-contacts-breakdown', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allContacts: { source: string; status: string; email: string; first_page_name: string | null }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('crm_contacts')
          .select('source, status, email, first_page_name')
          .eq('project_id', projectId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allContacts.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allContacts;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch offer mappings
  const { data: mappingsData, isLoading: loadingMappings } = useQuery({
    queryKey: ['crm-mappings', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('codigo_oferta, funnel_id, nome_produto, nome_posicao')
        .eq('project_id', projectId);

      if (error) throw error;
      return (data || []) as OfferMapping[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch funnels
  const { data: funnelsData, isLoading: loadingFunnels } = useQuery({
    queryKey: ['crm-funnels', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', projectId);

      if (error) throw error;
      return (data || []) as Funnel[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    if (!transactionsData) return [];
    const products = new Set(transactionsData.map(t => t.product_name));
    return Array.from(products).sort();
  }, [transactionsData]);

  // Get unique funnels for filter
  const uniqueFunnels = useMemo(() => {
    if (!funnelsData) return [];
    return funnelsData.map(f => ({ id: f.id, name: f.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [funnelsData]);

  // Get unique sources for filter
  const uniqueSources = useMemo(() => {
    if (!allContactsForBreakdown) return [];
    const sources = new Set(allContactsForBreakdown.map(c => c.source));
    return Array.from(sources).sort();
  }, [allContactsForBreakdown]);

  // Get unique contact statuses for filter
  const uniqueContactStatuses = useMemo(() => {
    if (!allContactsForBreakdown) return [];
    const statuses = new Set(allContactsForBreakdown.map(c => c.status));
    return Array.from(statuses).sort();
  }, [allContactsForBreakdown]);

  // Create mapping lookups
  const offerToFunnel = useMemo(() => {
    if (!mappingsData) return new Map<string, string>();
    const map = new Map<string, string>();
    mappingsData.forEach(m => {
      if (m.codigo_oferta && m.funnel_id) {
        map.set(m.codigo_oferta, m.funnel_id);
      }
    });
    return map;
  }, [mappingsData]);

  const funnelNames = useMemo(() => {
    if (!funnelsData) return new Map<string, string>();
    const map = new Map<string, string>();
    funnelsData.forEach(f => {
      map.set(f.id, f.name);
    });
    return map;
  }, [funnelsData]);

  // Create contact lookup
  const contactsById = useMemo(() => {
    if (!contactsData) return new Map<string, CRMContact>();
    const map = new Map<string, CRMContact>();
    contactsData.forEach(c => {
      map.set(c.id, c);
    });
    return map;
  }, [contactsData]);

  // Calculate all breakdowns from the unfiltered data
  const breakdowns = useMemo(() => {
    const statusLabels: Record<string, string> = {
      'APPROVED': 'Aprovado',
      'COMPLETE': 'Completo',
      'CANCELED': 'Cancelado',
      'REFUNDED': 'Reembolsado',
      'CHARGEBACK': 'Chargeback',
      'EXPIRED': 'Expirado',
      'OVERDUE': 'Vencido',
      'STARTED': 'Iniciado',
      'PRINTED_BILLET': 'Boleto Impresso',
      'WAITING_PAYMENT': 'Aguardando Pagamento',
    };

    const sourceLabels: Record<string, string> = {
      'hotmart': 'Hotmart',
      'kiwify': 'Kiwify',
      'manual': 'Manual',
      'webhook': 'Webhook',
      'import': 'Importado',
    };

    const contactStatusLabels: Record<string, string> = {
      'lead': 'Lead',
      'prospect': 'Prospect',
      'customer': 'Cliente',
      'churned': 'Churned',
      'inactive': 'Inativo',
    };

    const emptyBreakdowns = {
      statusBreakdown: [] as GenericBreakdown[],
      productBreakdown: [] as GenericBreakdown[],
      offerBreakdown: [] as GenericBreakdown[],
      funnelBreakdown: [] as GenericBreakdown[],
      positionBreakdown: [] as GenericBreakdown[],
      sourceBreakdown: [] as GenericBreakdown[],
      contactStatusBreakdown: [] as GenericBreakdown[],
      platformBreakdown: [] as GenericBreakdown[],
      pageBreakdown: [] as GenericBreakdown[],
    };

    if (!allTransactionsForBreakdown || allTransactionsForBreakdown.length === 0) {
      // Still calculate contact-level breakdowns
      if (allContactsForBreakdown && allContactsForBreakdown.length > 0) {
        const createContactBreakdown = (
          keyFn: (contact: typeof allContactsForBreakdown[0]) => string | null,
          labelFn: (key: string) => string
        ): GenericBreakdown[] => {
          const map = new Map<string, { count: number; emails: Set<string> }>();
          
          for (const contact of allContactsForBreakdown) {
            const key = keyFn(contact);
            if (!key) continue;
            
            if (!map.has(key)) {
              map.set(key, { count: 0, emails: new Set() });
            }
            const data = map.get(key)!;
            data.count++;
            if (contact.email) {
              data.emails.add(contact.email.toLowerCase());
            }
          }

          const result: GenericBreakdown[] = [];
          map.forEach((value, key) => {
            result.push({
              key,
              label: labelFn(key),
              count: value.count,
              uniqueClients: value.emails.size,
            });
          });

          return result.sort((a, b) => b.count - a.count);
        };

        return {
          ...emptyBreakdowns,
          sourceBreakdown: createContactBreakdown(
            (contact) => contact.source,
            (key) => sourceLabels[key] || key
          ),
          contactStatusBreakdown: createContactBreakdown(
            (contact) => contact.status,
            (key) => contactStatusLabels[key] || key
          ),
          pageBreakdown: createContactBreakdown(
            (contact) => contact.first_page_name,
            (key) => key
          ),
        };
      }
      return emptyBreakdowns;
    }

    const createBreakdown = (
      keyFn: (transaction: typeof allTransactionsForBreakdown[0]) => string | null,
      labelFn: (key: string) => string
    ): GenericBreakdown[] => {
      const map = new Map<string, { count: number; contacts: Set<string> }>();
      
      for (const transaction of allTransactionsForBreakdown) {
        const key = keyFn(transaction);
        if (!key) continue;
        
        if (!map.has(key)) {
          map.set(key, { count: 0, contacts: new Set() });
        }
        const data = map.get(key)!;
        data.count++;
        if (transaction.contact_id) {
          data.contacts.add(transaction.contact_id);
        }
      }

      const result: GenericBreakdown[] = [];
      map.forEach((value, key) => {
        result.push({
          key,
          label: labelFn(key),
          count: value.count,
          uniqueClients: value.contacts.size,
        });
      });

      return result.sort((a, b) => b.count - a.count);
    };

    // Transaction status breakdown
    const statusBreakdown = createBreakdown(
      (t) => (t.status || 'UNKNOWN').toUpperCase(),
      (key) => statusLabels[key] || key
    );

    // Product breakdown
    const productBreakdown = createBreakdown(
      (t) => t.product_name,
      (key) => key
    );

    // Offer breakdown
    const offerBreakdown = createBreakdown(
      (t) => t.offer_code,
      (key) => key
    );

    // Funnel breakdown
    const funnelBreakdown = createBreakdown(
      (t) => t.offer_code ? offerToFunnel.get(t.offer_code) || null : null,
      (key) => funnelNames.get(key) || key
    );

    // Platform breakdown
    const platformBreakdown = createBreakdown(
      (t) => t.platform,
      (key) => sourceLabels[key] || key
    );

    // Position breakdown (from mappings)
    const offerToPosition = new Map<string, string>();
    mappingsData?.forEach(m => {
      if (m.codigo_oferta && m.nome_posicao) {
        offerToPosition.set(m.codigo_oferta, m.nome_posicao);
      }
    });

    const positionBreakdown = createBreakdown(
      (t) => t.offer_code ? offerToPosition.get(t.offer_code) || null : null,
      (key) => key
    );

    // Contact-level breakdowns
    const createContactBreakdown = (
      keyFn: (contact: { source: string; status: string; email: string; first_page_name: string | null }) => string | null,
      labelFn: (key: string) => string
    ): GenericBreakdown[] => {
      if (!allContactsForBreakdown) return [];
      
      const map = new Map<string, { count: number; emails: Set<string> }>();
      
      for (const contact of allContactsForBreakdown) {
        const key = keyFn(contact);
        if (!key) continue;
        
        if (!map.has(key)) {
          map.set(key, { count: 0, emails: new Set() });
        }
        const data = map.get(key)!;
        data.count++;
        if (contact.email) {
          data.emails.add(contact.email.toLowerCase());
        }
      }

      const result: GenericBreakdown[] = [];
      map.forEach((value, key) => {
        result.push({
          key,
          label: labelFn(key),
          count: value.count,
          uniqueClients: value.emails.size,
        });
      });

      return result.sort((a, b) => b.count - a.count);
    };

    const sourceBreakdown = createContactBreakdown(
      (contact) => contact.source,
      (key) => sourceLabels[key] || key
    );

    const contactStatusBreakdown = createContactBreakdown(
      (contact) => contact.status,
      (key) => contactStatusLabels[key] || key
    );

    const pageBreakdown = createContactBreakdown(
      (contact) => contact.first_page_name,
      (key) => key
    );

    return {
      statusBreakdown,
      productBreakdown,
      offerBreakdown,
      funnelBreakdown,
      positionBreakdown,
      sourceBreakdown,
      contactStatusBreakdown,
      platformBreakdown,
      pageBreakdown,
    };
  }, [allTransactionsForBreakdown, allContactsForBreakdown, offerToFunnel, funnelNames, mappingsData]);

  // Process customer journeys
  const customerJourneys = useMemo(() => {
    if (!contactsData || contactsData.length === 0 || !transactionsData) return [];

    // Group transactions by contact
    const transactionsByContact = new Map<string, CRMTransaction[]>();
    transactionsData.forEach(t => {
      if (!transactionsByContact.has(t.contact_id)) {
        transactionsByContact.set(t.contact_id, []);
      }
      transactionsByContact.get(t.contact_id)!.push(t);
    });

    // Convert to journey objects
    const journeys: CustomerJourney[] = [];
    
    contactsData.forEach((contact) => {
      const transactions = transactionsByContact.get(contact.id) || [];
      
      // Sort transactions by date
      const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(a.transaction_date || 0).getTime() - new Date(b.transaction_date || 0).getTime()
      );

      const firstTransaction = sortedTransactions[0];
      const entryFunnelId = firstTransaction?.offer_code ? offerToFunnel.get(firstTransaction.offer_code) || null : null;
      const entryFunnelName = entryFunnelId ? funnelNames.get(entryFunnelId) || null : null;

      // Apply date filter on first purchase date
      if (dateFilter.startDate || dateFilter.endDate) {
        const firstDate = contact.first_purchase_at 
          ? new Date(contact.first_purchase_at)
          : new Date(contact.first_seen_at);
        if (dateFilter.startDate && firstDate < dateFilter.startDate) return;
        if (dateFilter.endDate) {
          const endOfDay = new Date(dateFilter.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (firstDate > endOfDay) return;
        }
      }

      // Apply entry filter
      if (entryFilter && firstTransaction) {
        if (entryFilter.type === 'product') {
          if (!entryFilter.values.includes(firstTransaction.product_name)) return;
        } else if (entryFilter.type === 'funnel') {
          if (!entryFunnelId || !entryFilter.values.includes(entryFunnelId)) return;
        } else if (entryFilter.type === 'offer') {
          if (!firstTransaction.offer_code || !entryFilter.values.includes(firstTransaction.offer_code)) return;
        }
      }

      // Check if customer bought target product (for reverse analysis)
      let hasTargetProduct = false;
      let targetPurchaseIndex = -1;
      
      if (targetFilter) {
        for (let i = 0; i < sortedTransactions.length; i++) {
          const t = sortedTransactions[i];
          const tFunnelId = t.offer_code ? offerToFunnel.get(t.offer_code) || null : null;
          
          if (targetFilter.type === 'product' && targetFilter.values.includes(t.product_name)) {
            hasTargetProduct = true;
            targetPurchaseIndex = i;
            break;
          } else if (targetFilter.type === 'funnel' && tFunnelId && targetFilter.values.includes(tFunnelId)) {
            hasTargetProduct = true;
            targetPurchaseIndex = i;
            break;
          } else if (targetFilter.type === 'offer' && t.offer_code && targetFilter.values.includes(t.offer_code)) {
            hasTargetProduct = true;
            targetPurchaseIndex = i;
            break;
          }
        }
        
        if (!hasTargetProduct) return;
      }

      const purchases: CustomerPurchase[] = sortedTransactions.map((t, index) => ({
        transactionId: t.external_id || t.id,
        productName: t.product_name,
        offerCode: t.offer_code || '',
        funnelId: t.offer_code ? offerToFunnel.get(t.offer_code) || null : null,
        funnelName: t.offer_code && offerToFunnel.get(t.offer_code) 
          ? funnelNames.get(offerToFunnel.get(t.offer_code)!) || null 
          : null,
        saleDate: new Date(t.transaction_date || 0),
        totalPrice: t.total_price_brl || 0,
        status: t.status,
        isEntry: index === 0,
        isTarget: targetFilter ? index === targetPurchaseIndex : false,
        platform: t.platform,
      }));

      const totalSpent = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
      
      const subsequentProducts = purchases
        .filter(p => !p.isEntry)
        .map(p => p.productName)
        .filter((v, i, a) => a.indexOf(v) === i);

      // Products purchased BEFORE the target (for reverse analysis)
      const previousProducts = targetPurchaseIndex > 0
        ? purchases
            .slice(0, targetPurchaseIndex)
            .map(p => p.productName)
            .filter((v, i, a) => a.indexOf(v) === i)
        : [];

      // Calculate average time between purchases
      let avgTimeBetweenPurchases: number | null = null;
      if (purchases.length > 1) {
        const timeDiffs: number[] = [];
        for (let i = 1; i < purchases.length; i++) {
          const diff = purchases[i].saleDate.getTime() - purchases[i-1].saleDate.getTime();
          timeDiffs.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
        }
        avgTimeBetweenPurchases = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      }

      const firstPurchaseDate = contact.first_purchase_at 
        ? new Date(contact.first_purchase_at) 
        : (firstTransaction ? new Date(firstTransaction.transaction_date || 0) : new Date(contact.first_seen_at));

      journeys.push({
        buyerEmail: contact.email,
        buyerName: contact.name || contact.email.split('@')[0],
        firstPurchaseDate,
        entryProduct: firstTransaction?.product_name || 'N/A',
        entryOfferCode: firstTransaction?.offer_code || '',
        entryFunnelId,
        entryFunnelName,
        totalPurchases: purchases.length,
        totalSpent,
        purchases,
        subsequentProducts,
        previousProducts,
        daysSinceFirstPurchase: Math.floor((Date.now() - firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)),
        avgTimeBetweenPurchases,
        contactSource: contact.source,
        contactStatus: contact.status,
        tags: contact.tags || [],
      });
    });

    return journeys;
  }, [contactsData, transactionsData, offerToFunnel, funnelNames, entryFilter, targetFilter, dateFilter]);

  // Calculate journey metrics
  const journeyMetrics = useMemo((): JourneyMetrics => {
    if (customerJourneys.length === 0) {
      return {
        totalCustomers: 0,
        avgLTV: 0,
        avgPurchases: 0,
        repeatCustomerRate: 0,
        topSubsequentProducts: [],
        cohortMetrics: [],
        originMetrics: [],
      };
    }

    const totalCustomers = customerJourneys.length;
    const totalRevenue = customerJourneys.reduce((sum, j) => sum + j.totalSpent, 0);
    const totalPurchases = customerJourneys.reduce((sum, j) => sum + j.totalPurchases, 0);
    const repeatCustomers = customerJourneys.filter(j => j.totalPurchases > 1).length;

    // Count subsequent products
    const productCounts = new Map<string, number>();
    customerJourneys.forEach(j => {
      j.subsequentProducts.forEach(p => {
        productCounts.set(p, (productCounts.get(p) || 0) + 1);
      });
    });

    const topSubsequentProducts = Array.from(productCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([product, count]) => ({
        product,
        count,
        percentage: (count / totalCustomers) * 100,
      }));

    // Group by entry point for cohort analysis
    const cohortMap = new Map<string, CustomerJourney[]>();
    customerJourneys.forEach(j => {
      const key = `${j.entryProduct}|${j.entryFunnelId || 'no-funnel'}`;
      if (!cohortMap.has(key)) {
        cohortMap.set(key, []);
      }
      cohortMap.get(key)!.push(j);
    });

    const cohortMetrics: CohortMetrics[] = Array.from(cohortMap.entries())
      .map(([key, journeys]) => {
        const [product, funnelId] = key.split('|');
        const customerCount = journeys.length;
        const totalRev = journeys.reduce((sum, j) => sum + j.totalSpent, 0);
        const totalPurch = journeys.reduce((sum, j) => sum + j.totalPurchases, 0);
        const repeaters = journeys.filter(j => j.totalPurchases > 1).length;

        return {
          entryProduct: product,
          entryFunnel: funnelId === 'no-funnel' ? null : funnelNames.get(funnelId) || funnelId,
          customerCount,
          avgLTV: totalRev / customerCount,
          avgPurchases: totalPurch / customerCount,
          repeatRate: (repeaters / customerCount) * 100,
          totalRevenue: totalRev,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Origin analysis (products purchased before target)
    const originMap = new Map<string, { journeys: CustomerJourney[]; totalLTV: number }>();
    customerJourneys.forEach(j => {
      if (j.previousProducts.length > 0) {
        j.previousProducts.forEach(product => {
          const key = `${product}|${j.entryFunnelId || 'no-funnel'}`;
          if (!originMap.has(key)) {
            originMap.set(key, { journeys: [], totalLTV: 0 });
          }
          const data = originMap.get(key)!;
          data.journeys.push(j);
          data.totalLTV += j.totalSpent;
        });
      }
    });

    const originMetrics: OriginMetrics[] = Array.from(originMap.entries())
      .map(([key, data]) => {
        const [product, funnelId] = key.split('|');
        return {
          product,
          funnel: funnelId === 'no-funnel' ? null : funnelNames.get(funnelId) || funnelId,
          customerCount: data.journeys.length,
          percentage: (data.journeys.length / totalCustomers) * 100,
          avgLTVAfter: data.totalLTV / data.journeys.length,
        };
      })
      .sort((a, b) => b.customerCount - a.customerCount);

    return {
      totalCustomers,
      avgLTV: totalRevenue / totalCustomers,
      avgPurchases: totalPurchases / totalCustomers,
      repeatCustomerRate: (repeatCustomers / totalCustomers) * 100,
      topSubsequentProducts,
      cohortMetrics,
      originMetrics,
    };
  }, [customerJourneys, funnelNames]);

  return {
    customerJourneys,
    journeyMetrics,
    uniqueProducts,
    uniqueFunnels,
    uniqueSources,
    uniqueContactStatuses,
    statusBreakdown: breakdowns.statusBreakdown,
    productBreakdown: breakdowns.productBreakdown,
    offerBreakdown: breakdowns.offerBreakdown,
    funnelBreakdown: breakdowns.funnelBreakdown,
    positionBreakdown: breakdowns.positionBreakdown,
    sourceBreakdown: breakdowns.sourceBreakdown,
    contactStatusBreakdown: breakdowns.contactStatusBreakdown,
    platformBreakdown: breakdowns.platformBreakdown,
    pageBreakdown: breakdowns.pageBreakdown,
    isLoading: loadingContacts || loadingTransactions || loadingMappings || loadingFunnels,
    isLoadingBreakdown: loadingBreakdown || loadingContactsBreakdown,
  };
}
