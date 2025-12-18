import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Loader2, 
  Lock, 
  Users, 
  RefreshCcw,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Search,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  TrendingDown,
  ExternalLink,
  Info,
  Kanban,
  BarChart3,
  ShoppingCart
} from 'lucide-react';
import { RecoveryAnalytics } from '@/components/crm/RecoveryAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecoveryContact {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  tags: string[] | null;
  total_revenue: number | null;
  total_purchases: number | null;
  last_activity_at: string;
  last_purchase_at: string | null;
  first_purchase_at: string | null;
  last_recovery_date: string | null;
  abandoned_value?: number;
}

const RECOVERY_STATUS_MAP = {
  CANCELLED: 'Cancelado',
  CHARGEBACK: 'Chargeback',
  REFUNDED: 'Reembolsado',
  ABANDONED: 'Carrinho Abandonado',
} as const;

const RECOVERY_TAGS = Object.values(RECOVERY_STATUS_MAP);

type RecoveryTag = (typeof RECOVERY_TAGS)[number];

type TagConfigKey = RecoveryTag | 'Recuperado (auto)' | 'Recuperado (manual)';

const TAG_CONFIG: Record<TagConfigKey, { icon: typeof AlertTriangle | typeof ShoppingCart; color: string; description: string }> = {
  'Carrinho Abandonado': { 
    icon: ShoppingCart, 
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    description: 'Leads que abandonaram o carrinho antes de finalizar a compra'
  },
  Cancelado: { 
    icon: XCircle, 
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    description: 'Clientes que cancelaram assinaturas ou compras'
  },
  Chargeback: { 
    icon: AlertTriangle, 
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    description: 'Clientes que solicitaram chargeback'
  },
  Reembolsado: { 
    icon: RotateCcw, 
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    description: 'Clientes que pediram reembolso'
  },
  'Recuperado (auto)': { 
    icon: RefreshCcw, 
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    description: 'Clientes recuperados automaticamente por nova compra'
  },
  'Recuperado (manual)': { 
    icon: RefreshCcw, 
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    description: 'Clientes recuperados manualmente pelo time'
  }
};

export default function CRMRecovery() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Date filter state - default to last 30 days
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Buscar contatos com base no status das transações (Cancelado, Chargeback, Reembolsado, Carrinho Abandonado)
  const { data: contacts = [], isLoading: contactsLoading, isFetching, refetch } = useQuery({
    queryKey: ['crm-recovery-contacts', currentProject?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      
      const recoveryStatuses = Object.keys(RECOVERY_STATUS_MAP);
      
      // Parse dates for filtering
      const startDateTime = startOfDay(new Date(startDate)).toISOString();
      const endDateTime = endOfDay(new Date(endDate)).toISOString();
      
      // Map to store contact data with tags
      const contactMap = new Map<string, { tags: Set<RecoveryTag>; lastTxAt: string | null; abandonedValue?: number }>();
      
      // 1) Buscar transações de recuperação NO PERÍODO SELECIONADO (exceto ABANDONED que vem de hotmart_sales)
      const crmRecoveryStatuses = recoveryStatuses.filter(s => s !== 'ABANDONED');
      
      if (crmRecoveryStatuses.length > 0) {
        let allTransactions: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data: transactions, error: txError } = await supabase
            .from('crm_transactions')
            .select('contact_id, status, transaction_date')
            .eq('project_id', currentProject.id)
            .in('status', crmRecoveryStatuses)
            .gte('transaction_date', startDateTime)
            .lte('transaction_date', endDateTime)
            .order('transaction_date', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);
          
          if (txError) throw txError;
          
          if (transactions && transactions.length > 0) {
            allTransactions = [...allTransactions, ...transactions];
            hasMore = transactions.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }
        
        for (const tx of allTransactions) {
          const tagLabel = RECOVERY_STATUS_MAP[tx.status as keyof typeof RECOVERY_STATUS_MAP];
          if (!tagLabel) continue;
          
          const entry = contactMap.get(tx.contact_id) || { tags: new Set<RecoveryTag>(), lastTxAt: null };
          entry.tags.add(tagLabel as RecoveryTag);
          if (!entry.lastTxAt || (tx.transaction_date && tx.transaction_date > entry.lastTxAt)) {
            entry.lastTxAt = tx.transaction_date;
          }
          contactMap.set(tx.contact_id, entry);
        }
      }
      
      // 2) Buscar carrinhos abandonados de hotmart_sales
      let allAbandonedSales: any[] = [];
      let abandonedPage = 0;
      let hasMoreAbandoned = true;
      
      while (hasMoreAbandoned) {
        const { data: abandonedSales, error: abandonedError } = await supabase
          .from('hotmart_sales')
          .select('buyer_email, buyer_name, buyer_phone, sale_date, total_price, offer_price')
          .eq('project_id', currentProject.id)
          .eq('status', 'ABANDONED')
          .gte('sale_date', startDateTime)
          .lte('sale_date', endDateTime)
          .order('sale_date', { ascending: false })
          .range(abandonedPage * 1000, (abandonedPage + 1) * 1000 - 1);
        
        if (abandonedError) throw abandonedError;
        
        if (abandonedSales && abandonedSales.length > 0) {
          allAbandonedSales = [...allAbandonedSales, ...abandonedSales];
          hasMoreAbandoned = abandonedSales.length === 1000;
          abandonedPage++;
        } else {
          hasMoreAbandoned = false;
        }
      }
      
      // 3) Para carrinhos abandonados, buscar ou criar contato pelo email
      const abandonedEmails = [...new Set(allAbandonedSales.map(s => s.buyer_email?.toLowerCase()).filter(Boolean))];
      
      if (abandonedEmails.length > 0) {
        // Buscar contatos existentes por email
        let existingContacts: any[] = [];
        const emailBatchSize = 100;
        
        for (let i = 0; i < abandonedEmails.length; i += emailBatchSize) {
          const batchEmails = abandonedEmails.slice(i, i + emailBatchSize);
          const { data: contacts, error: contactsError } = await supabase
            .from('crm_contacts')
            .select('id, email')
            .eq('project_id', currentProject.id)
            .in('email', batchEmails);
          
          if (contactsError) throw contactsError;
          if (contacts) {
            existingContacts = [...existingContacts, ...contacts];
          }
        }
        
        const emailToContactId = new Map(existingContacts.map(c => [c.email.toLowerCase(), c.id]));
        
        // Agrupar abandonos por email para calcular valor total abandonado
        const abandonedByEmail = new Map<string, { lastDate: string; totalValue: number }>();
        for (const sale of allAbandonedSales) {
          const email = sale.buyer_email?.toLowerCase();
          if (!email) continue;
          
          const existing = abandonedByEmail.get(email) || { lastDate: '', totalValue: 0 };
          const saleValue = sale.total_price || sale.offer_price || 0;
          if (!existing.lastDate || sale.sale_date > existing.lastDate) {
            existing.lastDate = sale.sale_date;
          }
          existing.totalValue += saleValue;
          abandonedByEmail.set(email, existing);
        }
        
        // Adicionar tag de Carrinho Abandonado para contatos existentes
        for (const [email, data] of abandonedByEmail) {
          const contactId = emailToContactId.get(email);
          if (contactId) {
            const entry = contactMap.get(contactId) || { tags: new Set<RecoveryTag>(), lastTxAt: null };
            entry.tags.add('Carrinho Abandonado');
            if (!entry.lastTxAt || data.lastDate > entry.lastTxAt) {
              entry.lastTxAt = data.lastDate;
            }
            entry.abandonedValue = data.totalValue;
            contactMap.set(contactId, entry);
          }
        }
      }
      
      const contactIds = Array.from(contactMap.keys());
      if (contactIds.length === 0) return [];
      
      // 4) Buscar dados dos contatos - also in batches
      let allContactsData: any[] = [];
      const contactBatchSize = 100;
      
      for (let i = 0; i < contactIds.length; i += contactBatchSize) {
        const batchIds = contactIds.slice(i, i + contactBatchSize);
        const { data: contactsData, error: contactsError } = await supabase
          .from('crm_contacts')
          .select('id, name, email, phone, tags, total_revenue, total_purchases, last_activity_at, last_purchase_at, first_purchase_at')
          .eq('project_id', currentProject.id)
          .in('id', batchIds);
        
        if (contactsError) throw contactsError;
        if (contactsData) {
          allContactsData = [...allContactsData, ...contactsData];
        }
      }
      
      if (allContactsData.length === 0) return [];
      
      const contactsWithTags: RecoveryContact[] = allContactsData.map((c) => {
        const meta = contactMap.get(c.id);
        // Merge recovery tags from transactions with existing contact tags
        const recoveryTags = meta ? Array.from(meta.tags) : [];
        const contactTags = c.tags || [];
        // Keep recovery-related tags from contact (Recuperado auto/manual)
        const recoveredTags = contactTags.filter((t: string) => 
          t === 'Recuperado (auto)' || t === 'Recuperado (manual)'
        );
        return {
          ...c,
          tags: [...recoveryTags, ...recoveredTags],
          last_activity_at: c.last_activity_at,
          last_recovery_date: meta?.lastTxAt || null,
          abandoned_value: meta?.abandonedValue || 0,
        };
      });
      
      // Ordenar por data mais recente da transação de recuperação
      contactsWithTags.sort((a, b) => {
        const dateA = a.last_recovery_date ? new Date(a.last_recovery_date).getTime() : 0;
        const dateB = b.last_recovery_date ? new Date(b.last_recovery_date).getTime() : 0;
        return dateB - dateA;
      });
      
      return contactsWithTags;
    },
    enabled: !!currentProject?.id,
  });

  // Filter contacts by search and tab
  const filteredContacts = useMemo(() => {
    let result = contacts;
    
    // Filter by tab
    if (activeTab !== 'all') {
      result = result.filter(c => c.tags?.includes(activeTab));
    }
    
    // Filter by search
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }
    
    return result;
  }, [contacts, activeTab, search]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenueLost = contacts.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
    const cancelados = contacts.filter(c => c.tags?.includes('Cancelado')).length;
    const chargebacks = contacts.filter(c => c.tags?.includes('Chargeback')).length;
    const reembolsados = contacts.filter(c => c.tags?.includes('Reembolsado')).length;
    const abandonados = contacts.filter(c => c.tags?.includes('Carrinho Abandonado')).length;
    const valorAbandonado = contacts.reduce((sum, c) => sum + (c.abandoned_value || 0), 0);
    const recuperadosAuto = contacts.filter(c => c.tags?.includes('Recuperado (auto)')).length;
    const recuperadosManual = contacts.filter(c => c.tags?.includes('Recuperado (manual)')).length;
    
    return { totalRevenueLost, cancelados, chargebacks, reembolsados, abandonados, valorAbandonado, recuperadosAuto, recuperadosManual, total: contacts.length };
  }, [contacts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Quick date filters
  const handleQuickFilter = (days: number) => {
    setStartDate(format(subDays(new Date(), days), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const isLoading = modulesLoading || contactsLoading;

  // Check if CRM module is enabled
  if (!modulesLoading && !isModuleEnabled('crm')) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Módulo CRM não habilitado</CardTitle>
              <CardDescription>
                O módulo CRM não está habilitado para este projeto.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader pageSubtitle="CRM - Recuperação" />
      
      <CRMSubNav 
        showSettings
        settingsPath="/crm/recovery/settings"
        rightContent={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => refetch()}
                    disabled={isLoading || isFetching}
                  >
                    <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    Recarrega os dados do CRM.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button size="sm" onClick={() => navigate('/crm/recovery/kanban')}>
              <Kanban className="h-4 w-4 mr-2" />
              Kanban
            </Button>
          </>
        }
      />
      
      <main className="flex-1 container px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Recuperação de Clientes</h1>
          <p className="text-muted-foreground">
            Dashboard para ações de win-back com clientes perdidos
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Date Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Período:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                    />
                    <span className="text-muted-foreground">até</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleQuickFilter(7)}>
                      7 dias
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleQuickFilter(30)}>
                      30 dias
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleQuickFilter(90)}>
                      90 dias
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleQuickFilter(365)}>
                      1 ano
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span>Filtra pela data do evento (carrinho abandonado, cancelamento, reembolso ou chargeback)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">Total para recuperar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-purple-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <ShoppingCart className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.abandonados}</p>
                      <p className="text-sm text-muted-foreground">Carrinhos Abandonados</p>
                      {stats.valorAbandonado > 0 && (
                        <p className="text-xs text-purple-500">{formatCurrency(stats.valorAbandonado)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <XCircle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.cancelados}</p>
                      <p className="text-sm text-muted-foreground">Cancelados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.chargebacks}</p>
                      <p className="text-sm text-muted-foreground">Chargebacks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-yellow-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <RotateCcw className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.reembolsados}</p>
                      <p className="text-sm text-muted-foreground">Reembolsados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenueLost)}</p>
                      <p className="text-sm text-muted-foreground">Receita histórica</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Tabs and Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="gap-2">
                  <Users className="h-4 w-4" />
                  Todos ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="Carrinho Abandonado" className="gap-2">
                  <ShoppingCart className="h-4 w-4 text-purple-500" />
                  Carrinhos ({stats.abandonados})
                </TabsTrigger>
                <TabsTrigger value="Cancelado" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Cancelados ({stats.cancelados})
                </TabsTrigger>
                <TabsTrigger value="Chargeback" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Chargebacks ({stats.chargebacks})
                </TabsTrigger>
                <TabsTrigger value="Reembolsado" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reembolsados ({stats.reembolsados})
                </TabsTrigger>
                <TabsTrigger value="Recuperado (auto)" className="gap-2">
                  <RefreshCcw className="h-4 w-4 text-green-500" />
                  Recuperados Auto ({stats.recuperadosAuto})
                </TabsTrigger>
                <TabsTrigger value="Recuperado (manual)" className="gap-2">
                  <RefreshCcw className="h-4 w-4 text-emerald-500" />
                  Recuperados Manual ({stats.recuperadosManual})
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2 bg-primary/10">
                  <BarChart3 className="h-4 w-4" />
                  Análise
                </TabsTrigger>
              </TabsList>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-0">
                <RecoveryAnalytics startDate={startDate} endDate={endDate} />
              </TabsContent>

              {/* Contact List Tabs */}
              {activeTab !== 'analytics' && (
                <TabsContent value={activeTab} className="mt-0">
                  {filteredContacts.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <RefreshCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhum cliente para recuperar</h3>
                        <p className="text-muted-foreground">
                          {search 
                            ? 'Nenhum resultado encontrado para sua busca.'
                            : 'Não há clientes com transações de recuperação no período selecionado.'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Tente ampliar o período de datas ou sincronize as vendas em Integrações.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <ScrollArea className="h-[calc(100vh-550px)]">
                      <div className="grid gap-3">
                        {filteredContacts.map((contact) => (
                          <Card 
                            key={contact.id} 
                            className="hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/crm/contact/${contact.id}`)}
                          >
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-medium truncate">
                                      {contact.name || contact.email.split('@')[0]}
                                    </h3>
                                    <div className="flex gap-1">
                                      {contact.tags
                                        ?.filter((t): t is RecoveryTag => RECOVERY_TAGS.includes(t as RecoveryTag))
                                        .map((tag) => {
                                          const config = TAG_CONFIG[tag];
                                          const Icon = config?.icon || XCircle;
                                        return (
                                          <Badge 
                                            key={tag} 
                                            variant="outline"
                                            className={config?.color}
                                          >
                                            <Icon className="h-3 w-3 mr-1" />
                                            {tag}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {contact.email}
                                    </span>
                                    {contact.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {contact.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-6 text-sm">
                                  <div className="text-right">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <DollarSign className="h-3 w-3" />
                                      Receita histórica
                                    </div>
                                    <p className="font-medium">
                                      {formatCurrency(contact.total_revenue || 0)}
                                    </p>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      Data da perda
                                    </div>
                                    <p className="font-medium">
                                      {contact.last_recovery_date 
                                        ? format(new Date(contact.last_recovery_date), 'dd/MM/yyyy', { locale: ptBR })
                                        : '-'
                                      }
                                    </p>
                                  </div>
                                  
                                  <Button variant="outline" size="sm" className="gap-2">
                                    <ExternalLink className="h-3 w-3" />
                                    Ver perfil
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
