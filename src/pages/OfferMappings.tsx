import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Filter, Search, X, Download, Loader2, RotateCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { useProject } from '@/contexts/ProjectContext';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OfferMappingDialog } from '@/components/OfferMappingDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FunnelManager } from '@/components/FunnelManager';
import { CubeLoader } from '@/components/CubeLoader';
import { AppHeader } from '@/components/AppHeader';

interface Funnel {
  id: string;
  name: string;
  project_id: string;
}

interface OfferMapping {
  id: string;
  id_produto: string | null;
  id_produto_visual: string | null;
  nome_produto: string;
  nome_oferta: string | null;
  codigo_oferta: string | null;
  moeda: string | null;
  valor_original: number | null;
  valor: number | null;
  status: string | null;
  data_ativacao: string | null;
  data_desativacao: string | null;
  id_funil: string;
  anotacoes: string | null;
  tipo_posicao: string | null;
  ordem_posicao: number | null;
  nome_posicao: string | null;
}

interface HotmartProduct {
  id: number;
  ucode: string;
  name: string;
  status: string;
  format: string;
  warranty_period: number;
  created_at: number;
  is_subscription: boolean;
}

interface HotmartOffer {
  code: string;
  name: string;
  description: string;
  is_main_offer: boolean;
  price: {
    value: number;
    currency_code: string;
  };
  payment_mode: string;
  is_smart_recovery_enabled: boolean;
  is_currency_conversion_enabled: boolean;
}

const POSITION_COLORS: Record<string, string> = {
  FRONT: 'bg-cube-blue text-white',
  OB: 'bg-cube-green text-white',
  US: 'bg-cube-orange text-white',
  DS: 'bg-cube-red text-white',
};

const getPositionBadgeClass = (tipo: string | null) => {
  if (!tipo) return 'bg-muted text-muted-foreground';
  return POSITION_COLORS[tipo] || 'bg-muted text-muted-foreground';
};

export default function OfferMappingsAuto() {
  const [mappings, setMappings] = useState<OfferMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<OfferMapping | null>(null);
  const [mappingToDelete, setMappingToDelete] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [importingOffers, setImportingOffers] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [syncingOffers, setSyncingOffers] = useState(false);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  
  const { toast } = useToast();
  const { navigateTo, navigate } = useProjectNavigation();
  const { currentProject } = useProject();

  useEffect(() => {
    if (!currentProject) {
      toast({
        title: 'Projeto não selecionado',
        description: 'Selecione um projeto para acessar os mapeamentos',
        variant: 'destructive',
      });
      navigateTo('/dashboard');
    }
  }, [currentProject, navigate, toast]);

  const funnelData = useMemo(() => {
    const funnelMap = new Map<string, number>();
    mappings.forEach(mapping => {
      const count = funnelMap.get(mapping.id_funil) || 0;
      funnelMap.set(mapping.id_funil, count + 1);
    });
    return Array.from(funnelMap.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [mappings]);

  const filteredMappings = useMemo(() => {
    let filtered = selectedFunnel === 'all' ? mappings : mappings.filter(m => m.id_funil === selectedFunnel);
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(m => 
        (m.nome_produto?.toLowerCase().includes(search)) ||
        (m.nome_oferta?.toLowerCase().includes(search)) ||
        (m.codigo_oferta?.toLowerCase().includes(search)) ||
        (m.id_produto?.toLowerCase().includes(search))
      );
    }
    
    const positionOrder = { FRONT: 0, OB: 1, US: 2, DS: 3 };
    return filtered.sort((a, b) => {
      const funnelCompare = a.id_funil.localeCompare(b.id_funil);
      if (funnelCompare !== 0) return funnelCompare;
      
      const aOrder = a.tipo_posicao ? (positionOrder[a.tipo_posicao as keyof typeof positionOrder] ?? 99) : 99;
      const bOrder = b.tipo_posicao ? (positionOrder[b.tipo_posicao as keyof typeof positionOrder] ?? 99) : 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      return (a.ordem_posicao || 0) - (b.ordem_posicao || 0);
    });
  }, [mappings, selectedFunnel, searchTerm]);

  const fetchMappings = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMappings(data || []);
    } catch (error: any) {
      console.error('Error fetching mappings:', error);
      toast({
        title: 'Erro ao carregar mapeamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const importAllFromHotmart = async () => {
    if (!currentProject) return;
    
    try {
      setImportingOffers(true);
      setImportProgress('Buscando ofertas das vendas no banco de dados...');
      
      // First, import offers from sales data with intelligent pricing
      // Get all sales with their pricing info to determine the real offer value
      const { data: salesOffers, error: salesError } = await supabase
        .from('hotmart_sales')
        .select('offer_code, product_name, offer_price, total_price, offer_currency, payment_type, installment_number, recurrence')
        .eq('project_id', currentProject.id)
        .eq('offer_currency', 'BRL') // Only BRL to avoid currency conversion issues
        .not('offer_code', 'is', null);
      
      if (salesError) throw salesError;
      
      const existingOfferCodes = new Set(mappings.map(m => m.codigo_oferta));
      
      interface OfferToImport {
        id_produto: string | null;
        id_produto_visual: string | null;
        nome_produto: string;
        nome_oferta: string;
        codigo_oferta: string;
        valor: number | null;
        status: string;
        id_funil: string;
        funnel_id: string | null;
        data_ativacao: string;
        project_id: string;
      }

      // Get the "A Definir" funnel ID for new imports
      const { data: defaultFunnel } = await supabase
        .from('funnels')
        .select('id')
        .eq('project_id', currentProject.id)
        .eq('name', 'A Definir')
        .maybeSingle();
      
      const defaultFunnelId = defaultFunnel?.id || null;
      
      const offersToImport: OfferToImport[] = [];
      const seenOfferCodes = new Set<string>();
      
      // Group sales by offer_code to find the best price
      const offerPriceMap = new Map<string, { productName: string; bestPrice: number | null; }>();
      
      if (salesOffers && salesOffers.length > 0) {
        for (const sale of salesOffers) {
          if (!sale.offer_code) continue;
          
          const existing = offerPriceMap.get(sale.offer_code);
          let currentBestPrice = existing?.bestPrice || null;
          
          // Priority for pricing:
          // 1. PIX payment (always full value, no installments)
          // 2. Single installment payments (full value)
          // 3. Max total_price for single payments without recurrence
          const isFullPayment = sale.payment_type === 'PIX' || 
                               sale.payment_type === 'PAYPAL' ||
                               (sale.installment_number === 1 && !sale.recurrence);
          
          if (isFullPayment && sale.total_price) {
            // Only update if this is a better (higher) full payment price
            // and it's reasonable (not currency conversion errors like 215714)
            if (sale.total_price < 10000 && (!currentBestPrice || sale.total_price > currentBestPrice)) {
              currentBestPrice = sale.total_price;
            }
          }
          
          offerPriceMap.set(sale.offer_code, {
            productName: sale.product_name || 'Produto Desconhecido',
            bestPrice: currentBestPrice,
          });
        }
        
        // Create import entries from the grouped data
        for (const [offerCode, data] of offerPriceMap.entries()) {
          if (!existingOfferCodes.has(offerCode) && !seenOfferCodes.has(offerCode)) {
            offersToImport.push({
              id_produto: null,
              id_produto_visual: null,
              nome_produto: data.productName,
              nome_oferta: 'Importado das vendas',
              codigo_oferta: offerCode,
              valor: data.bestPrice,
              status: 'Ativo',
              id_funil: 'A Definir',
              funnel_id: defaultFunnelId,
              data_ativacao: new Date().toISOString().split('T')[0],
              project_id: currentProject.id,
            });
            seenOfferCodes.add(offerCode);
          }
        }
      }
      
      console.log(`Found ${offersToImport.length} offers from sales data`);
      setImportProgress(`Encontradas ${offersToImport.length} ofertas nas vendas. Buscando produtos da API...`);
      
      // Now also check the Hotmart Products API for additional offers
      try {
        const { data: productsData, error: productsError } = await supabase.functions.invoke('hotmart-api', {
          body: {
            endpoint: '/products',
            apiType: 'products',
            projectId: currentProject.id
          }
        });

        if (!productsError && productsData) {
          const products: HotmartProduct[] = productsData.items || productsData || [];
          console.log(`Found ${products.length} products from API`);
          
          for (let i = 0; i < products.length; i++) {
            const product = products[i];
            setImportProgress(`Buscando ofertas do produto ${i + 1}/${products.length}: ${product.name.substring(0, 30)}...`);
            
            try {
              const { data: offersData, error: offersError } = await supabase.functions.invoke('hotmart-api', {
                body: {
                  endpoint: `/products/${product.ucode}/offers`,
                  apiType: 'products',
                  projectId: currentProject.id
                }
              });

              if (!offersError && offersData) {
                const offers: HotmartOffer[] = offersData.items || offersData || [];
                
                offers.forEach(offer => {
                  if (!existingOfferCodes.has(offer.code) && !seenOfferCodes.has(offer.code)) {
                    offersToImport.push({
                      id_produto: product.ucode,
                      id_produto_visual: `ID ${product.id}`,
                      nome_produto: product.name,
                      nome_oferta: offer.name || (offer.is_main_offer ? 'Oferta Principal' : 'Sem Nome'),
                      codigo_oferta: offer.code,
                      valor: offer.price.value,
                      status: 'Ativo',
                      id_funil: 'A Definir',
                      funnel_id: defaultFunnelId,
                      data_ativacao: new Date().toISOString().split('T')[0],
                      project_id: currentProject.id,
                    });
                    seenOfferCodes.add(offer.code);
                  }
                });
              }
            } catch (error) {
              console.error(`Error processing product ${product.ucode}:`, error);
            }
          }
        }
      } catch (apiError) {
        console.error('Error fetching from Hotmart API, continuing with sales data only:', apiError);
      }
      
      if (offersToImport.length === 0) {
        toast({
          title: 'Importação concluída',
          description: 'Todas as ofertas já estão importadas. Nenhuma nova oferta encontrada.',
        });
        return;
      }
      
      setImportProgress(`Importando ${offersToImport.length} ofertas...`);
      
      // Insert in batches to avoid timeout
      const BATCH_SIZE = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < offersToImport.length; i += BATCH_SIZE) {
        const batch = offersToImport.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('offer_mappings')
          .insert(batch);
        
        if (insertError) {
          console.error('Error inserting batch:', insertError);
        } else {
          insertedCount += batch.length;
        }
        
        setImportProgress(`Importando ofertas... ${insertedCount}/${offersToImport.length}`);
      }
      
      toast({
        title: 'Importação concluída!',
        description: `${insertedCount} ofertas importadas com sucesso`,
      });
      
      fetchMappings();
      
    } catch (error: any) {
      console.error('Error importing offers:', error);
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImportingOffers(false);
      setImportProgress('');
    }
  };

  const syncOffersWithHotmart = async () => {
    if (!currentProject) {
      toast({
        title: 'Erro',
        description: 'Nenhum projeto selecionado',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSyncingOffers(true);
      
      toast({
        title: 'Sincronizando...',
        description: 'Buscando todos os produtos da Hotmart',
      });
      
      // Buscar todos os produtos da Hotmart
      const { data: productsData, error: productsError } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/products',
          apiType: 'products',
          projectId: currentProject.id
        }
      });

      if (productsError) throw productsError;
      
      const products: HotmartProduct[] = productsData.items || productsData || [];
      
      if (products.length === 0) {
        toast({
          title: 'Nenhum produto encontrado',
          description: 'Não foram encontrados produtos na sua conta Hotmart',
        });
        return;
      }
      
      let updatedCount = 0;
      const changes: string[] = [];
      
      // Para cada produto, buscar suas ofertas
      for (const product of products) {
        try {
          const { data, error } = await supabase.functions.invoke('hotmart-api', {
            body: {
              endpoint: `/products/${product.ucode}/offers`,
              apiType: 'products',
              projectId: currentProject.id
            }
          });
          
          if (error) continue;
          
          const offers: HotmartOffer[] = data.items || data || [];
          
          // Para cada oferta, verificar se existe no banco e atualizar
          for (const offer of offers) {
            const existingMapping = mappings.find(m => m.codigo_oferta === offer.code);
            
            if (existingMapping) {
              const updates: Record<string, any> = {};
              const changeNotes: string[] = [];
              
              const offerName = offer.name || (offer.is_main_offer ? 'Oferta Principal' : 'Sem Nome');
              if (existingMapping.nome_oferta !== offerName) {
                updates.nome_oferta = offerName;
                changeNotes.push(`Nome: ${existingMapping.nome_oferta} → ${offerName}`);
              }
              
              if (existingMapping.valor !== offer.price.value) {
                updates.valor = offer.price.value;
                changeNotes.push(`Valor: R$ ${existingMapping.valor || 0} → R$ ${offer.price.value}`);
              }
              
              // Atualizar nome do produto se diferente
              if (existingMapping.nome_produto !== product.name) {
                updates.nome_produto = product.name;
                changeNotes.push(`Produto: ${existingMapping.nome_produto} → ${product.name}`);
              }
              
              // Atualizar id_produto para o ucode correto
              if (existingMapping.id_produto !== product.ucode) {
                updates.id_produto = product.ucode;
              }
              
              // Atualizar id_produto_visual
              const visualId = `ID ${product.id}`;
              if (existingMapping.id_produto_visual !== visualId) {
                updates.id_produto_visual = visualId;
              }
              
              if (Object.keys(updates).length > 0) {
                if (changeNotes.length > 0) {
                  const timestamp = new Date().toLocaleDateString('pt-BR');
                  const annotation = `[${timestamp}] Sincronizado com Hotmart:\n${changeNotes.join('\n')}`;
                  updates.anotacoes = existingMapping.anotacoes 
                    ? `${existingMapping.anotacoes}\n\n${annotation}`
                    : annotation;
                }
                
                const { error: updateError } = await supabase
                  .from('offer_mappings')
                  .update(updates)
                  .eq('id', existingMapping.id);
                
                if (!updateError && changeNotes.length > 0) {
                  updatedCount++;
                  changes.push(`${existingMapping.nome_produto}: ${changeNotes.join(', ')}`);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing product ${product.ucode}:`, error);
        }
      }
      
      if (updatedCount > 0) {
        toast({
          title: 'Sincronização concluída!',
          description: `${updatedCount} ofertas atualizadas`,
        });
        fetchMappings();
      } else {
        toast({
          title: 'Sincronização concluída',
          description: 'Todas as ofertas já estão atualizadas',
        });
      }
      
    } catch (error: any) {
      console.error('Error syncing offers:', error);
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncingOffers(false);
    }
  };

  const fetchFunnels = async () => {
    if (!currentProject) return;
    const { data } = await supabase
      .from('funnels')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('name');
    setFunnels(data || []);
  };

  useEffect(() => {
    fetchMappings();
    fetchFunnels();
  }, [currentProject]);

  const handleEdit = (mapping: OfferMapping) => {
    setSelectedMapping(mapping);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setMappingToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!mappingToDelete) return;

    try {
      const { error } = await supabase
        .from('offer_mappings')
        .delete()
        .eq('id', mappingToDelete);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Mapeamento excluído com sucesso',
      });

      fetchMappings();
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setMappingToDelete(null);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };


  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-6 py-6 space-y-6">

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="existing">Ofertas Cadastradas</TabsTrigger>
            <TabsTrigger value="funnels">Funis</TabsTrigger>
            <TabsTrigger value="import">Importar da Hotmart</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome do produto, código da oferta ou ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => {
                        setSelectedMapping(null);
                        setDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      Criar Oferta
                    </Button>
                    <Button 
                      onClick={syncOffersWithHotmart}
                      disabled={syncingOffers || mappings.length === 0}
                      variant="outline"
                      className="gap-2"
                    >
                      {syncingOffers ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCw className="h-4 w-4" />
                      )}
                      Sincronizar com Hotmart
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filtrar por Funil:</span>
                  </div>
                  <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Selecione um funil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <span>Todos os Funis</span>
                          <Badge variant="secondary" className="ml-2">
                            {mappings.length}
                          </Badge>
                        </div>
                      </SelectItem>
                      {funnelData.map(({ id, count }) => (
                        <SelectItem key={id} value={id}>
                          <div className="flex items-center gap-2">
                            <span>{id}</span>
                            <Badge variant="secondary" className="ml-2">
                              {count}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground">Posições:</span>
                    <Badge className={POSITION_COLORS.FRONT}>FRONT</Badge>
                    <Badge className={POSITION_COLORS.OB}>OB</Badge>
                    <Badge className={POSITION_COLORS.US}>US</Badge>
                    <Badge className={POSITION_COLORS.DS}>DS</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              {loading ? (
                <div className="py-8">
                  <CubeLoader message="Carregando mapeamentos..." size="md" />
                </div>
              ) : filteredMappings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Nenhum mapeamento encontrado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use a aba "Importar da Hotmart" para adicionar ofertas
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Posição</TableHead>
                        <TableHead>ID Produto</TableHead>
                        <TableHead>Nome Produto</TableHead>
                        <TableHead>Nome Oferta</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>ID Funil</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell>
                            {mapping.nome_posicao ? (
                              <Badge className={getPositionBadgeClass(mapping.tipo_posicao)}>
                                {mapping.nome_posicao}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {mapping.id_produto_visual || mapping.id_produto || '-'}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {mapping.nome_produto}
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate">
                                {mapping.nome_oferta === 'Importado das vendas' ? '-' : (mapping.nome_oferta || '-')}
                              </span>
                              {mapping.nome_oferta === 'Importado das vendas' && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                                  Auto
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {mapping.codigo_oferta || '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(mapping.valor)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              mapping.status === 'Ativo' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {mapping.status || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-semibold text-xs">
                              {mapping.id_funil}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(mapping)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(mapping.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="funnels" className="space-y-4">
            <FunnelManager 
              projectId={currentProject?.id || null} 
              onFunnelChange={() => {
                fetchFunnels();
                fetchMappings();
              }}
            />
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Card className="p-6">
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Importar Ofertas da Hotmart</h3>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Clique no botão abaixo para buscar e importar automaticamente todos os produtos 
                    e ofertas da sua conta Hotmart. Ofertas já importadas serão ignoradas.
                  </p>
                </div>
                
                {importProgress && (
                  <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{importProgress}</span>
                  </div>
                )}
                
                <Button 
                  onClick={importAllFromHotmart}
                  disabled={importingOffers}
                  size="lg"
                  className="gap-2"
                >
                  {importingOffers ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  {importingOffers ? 'Importando...' : 'Importar Todas as Ofertas'}
                </Button>
                
                {mappings.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Você já tem {mappings.length} ofertas cadastradas
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <OfferMappingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mapping={selectedMapping}
        onSuccess={fetchMappings}
        projectId={currentProject?.id || null}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este mapeamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
