import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
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
}

const RECOVERY_STATUS_MAP = {
  CANCELLED: 'Cancelado',
  CHARGEBACK: 'Chargeback',
  REFUNDED: 'Reembolsado',
} as const;

const RECOVERY_TAGS = Object.values(RECOVERY_STATUS_MAP);

type RecoveryTag = (typeof RECOVERY_TAGS)[number];

const TAG_CONFIG: Record<RecoveryTag, { icon: typeof AlertTriangle; color: string; description: string }> = {
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
  }
};

export default function CRMRecovery() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Buscar contatos com base no status das transações (Cancelado, Chargeback, Reembolsado)
  const { data: contacts = [], isLoading: contactsLoading, isFetching, refetch } = useQuery({
    queryKey: ['crm-recovery-contacts', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      
      const recoveryStatuses = Object.keys(RECOVERY_STATUS_MAP);
      
      // 1) Buscar transações de recuperação
      const { data: transactions, error: txError } = await supabase
        .from('crm_transactions')
        .select('contact_id, status, transaction_date')
        .eq('project_id', currentProject.id)
        .in('status', recoveryStatuses);
      
      if (txError) throw txError;
      if (!transactions || transactions.length === 0) return [];
      
      // 2) Mapear contatos envolvidos e suas tags de recuperação
      const contactMap = new Map<string, { tags: Set<RecoveryTag>; lastTxAt: string | null }>();
      
      for (const tx of transactions) {
        const tagLabel = RECOVERY_STATUS_MAP[tx.status as keyof typeof RECOVERY_STATUS_MAP];
        if (!tagLabel) continue;
        
        const entry = contactMap.get(tx.contact_id) || { tags: new Set<RecoveryTag>(), lastTxAt: null };
        entry.tags.add(tagLabel as RecoveryTag);
        if (!entry.lastTxAt || (tx.transaction_date && tx.transaction_date > entry.lastTxAt)) {
          entry.lastTxAt = tx.transaction_date;
        }
        contactMap.set(tx.contact_id, entry);
      }
      
      const contactIds = Array.from(contactMap.keys());
      if (contactIds.length === 0) return [];
      
      // 3) Buscar dados dos contatos
      const { data: contactsData, error: contactsError } = await supabase
        .from('crm_contacts')
        .select('id, name, email, phone, total_revenue, total_purchases, last_activity_at, last_purchase_at, first_purchase_at')
        .eq('project_id', currentProject.id)
        .in('id', contactIds);
      
      if (contactsError) throw contactsError;
      if (!contactsData) return [];
      
      const contactsWithTags: RecoveryContact[] = contactsData.map((c) => {
        const meta = contactMap.get(c.id);
        return {
          ...c,
          tags: meta ? Array.from(meta.tags) : [],
          last_activity_at: meta?.lastTxAt || c.last_activity_at,
        };
      });
      
      // Ordenar por maior receita histórica
      contactsWithTags.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
      
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
    
    return { totalRevenueLost, cancelados, chargebacks, reembolsados, total: contacts.length };
  }, [contacts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
      <AppHeader />
      
      <main className="flex-1 container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <RefreshCcw className="h-6 w-6 text-primary" />
                Recuperação de Clientes
              </h1>
              <p className="text-muted-foreground">
                Dashboard para ações de win-back com clientes perdidos
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
          >
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenueLost)}</p>
                      <p className="text-sm text-muted-foreground">Receita em risco</p>
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
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="gap-2">
                  <Users className="h-4 w-4" />
                  Todos ({stats.total})
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
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {filteredContacts.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <RefreshCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhum cliente para recuperar</h3>
                      <p className="text-muted-foreground">
                        {search 
                          ? 'Nenhum resultado encontrado para sua busca.'
                          : 'Não há clientes com tags de recuperação nesta categoria.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="h-[calc(100vh-450px)]">
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
                                    Última atividade
                                  </div>
                                  <p className="font-medium">
                                    {formatDistanceToNow(new Date(contact.last_activity_at), { 
                                      addSuffix: true, 
                                      locale: ptBR 
                                    })}
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
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
