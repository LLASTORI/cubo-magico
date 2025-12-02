import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ArrowLeft, Filter, Search, X, Download, Loader2, RefreshCw, CheckSquare, XSquare, RotateCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';

interface OfferMapping {
  id: string;
  id_produto: string | null;
  nome_produto: string;
  nome_oferta: string | null;
  codigo_oferta: string | null;
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

interface ProductWithOffers extends HotmartProduct {
  offers: HotmartOffer[];
  loadingOffers: boolean;
}

const POSITION_COLORS: Record<string, string> = {
  FRONT: 'bg-blue-500 text-white',
  OB: 'bg-amber-500 text-white',
  US: 'bg-green-500 text-white',
  DS: 'bg-purple-500 text-white',
};

const getPositionBadgeClass = (tipo: string | null) => {
  if (!tipo) return 'bg-muted text-muted-foreground';
  return POSITION_COLORS[tipo] || 'bg-muted text-muted-foreground';
};

export default function OfferMappingsAuto() {
  // Existing mappings state
  const [mappings, setMappings] = useState<OfferMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<OfferMapping | null>(null);
  const [mappingToDelete, setMappingToDelete] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Hotmart import state
  const [hotmartProducts, setHotmartProducts] = useState<ProductWithOffers[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedOffers, setSelectedOffers] = useState<Map<string, Set<string>>>(new Map());
  const [importingOffers, setImportingOffers] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [syncingOffers, setSyncingOffers] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get unique funnels and their counts
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

  // Filter mappings
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

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return hotmartProducts;
    const search = productSearchTerm.toLowerCase();
    return hotmartProducts.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.id.toString().includes(search) ||
      p.ucode.toLowerCase().includes(search)
    );
  }, [hotmartProducts, productSearchTerm]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('*')
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

  const fetchHotmartProducts = async () => {
    try {
      setLoadingProducts(true);
      console.log('Fetching Hotmart products...');
      
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: '/products',
          apiType: 'products'
        }
      });

      if (error) throw error;
      
      console.log('Products response:', data);
      
      const products: HotmartProduct[] = data.items || data || [];
      const productsWithOffers: ProductWithOffers[] = products.map(p => ({
        ...p,
        offers: [],
        loadingOffers: false
      }));
      
      setHotmartProducts(productsWithOffers);
      
      toast({
        title: 'Produtos carregados!',
        description: `${productsWithOffers.length} produtos encontrados na Hotmart`,
      });
    } catch (error: any) {
      console.error('Error fetching Hotmart products:', error);
      toast({
        title: 'Erro ao buscar produtos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchProductOffers = async (product: ProductWithOffers) => {
    try {
      // Update loading state for this product
      setHotmartProducts(prev => 
        prev.map(p => p.ucode === product.ucode ? { ...p, loadingOffers: true } : p)
      );
      
      console.log('Fetching offers for product:', product.ucode);
      
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          endpoint: `/products/${product.ucode}/offers`,
          apiType: 'products'
        }
      });

      if (error) throw error;
      
      console.log('Offers response:', data);
      
      const offers: HotmartOffer[] = data.items || data || [];
      
      setHotmartProducts(prev => 
        prev.map(p => p.ucode === product.ucode ? { ...p, offers, loadingOffers: false } : p)
      );
      
      toast({
        title: 'Ofertas carregadas!',
        description: `${offers.length} ofertas encontradas para ${product.name}`,
      });
    } catch (error: any) {
      console.error('Error fetching offers:', error);
      setHotmartProducts(prev => 
        prev.map(p => p.ucode === product.ucode ? { ...p, loadingOffers: false } : p)
      );
      toast({
        title: 'Erro ao buscar ofertas',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleProductSelection = (productUcode: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productUcode)) {
        next.delete(productUcode);
        // Also remove offer selections for this product
        setSelectedOffers(prevOffers => {
          const nextOffers = new Map(prevOffers);
          nextOffers.delete(productUcode);
          return nextOffers;
        });
      } else {
        next.add(productUcode);
      }
      return next;
    });
  };

  const toggleOfferSelection = (productUcode: string, offerCode: string) => {
    setSelectedOffers(prev => {
      const next = new Map(prev);
      const productOffers = next.get(productUcode) || new Set();
      
      if (productOffers.has(offerCode)) {
        productOffers.delete(offerCode);
      } else {
        productOffers.add(offerCode);
      }
      
      next.set(productUcode, productOffers);
      return next;
    });
  };

  const selectAllProductsAndOffers = async () => {
    // First, load offers for all products that don't have offers loaded
    const productsWithoutOffers = hotmartProducts.filter(p => p.offers.length === 0 && !p.loadingOffers);
    
    if (productsWithoutOffers.length > 0) {
      toast({
        title: 'Carregando ofertas...',
        description: `Buscando ofertas de ${productsWithoutOffers.length} produtos`,
      });
      
      // Load offers for all products
      await Promise.all(productsWithoutOffers.map(p => fetchProductOffers(p)));
    }
    
    // Wait a bit for state to update
    setTimeout(() => {
      // Select all products
      const allProductUcodes = new Set(hotmartProducts.map(p => p.ucode));
      setSelectedProducts(allProductUcodes);
      
      // Select all offers from all products
      const allOffers = new Map<string, Set<string>>();
      hotmartProducts.forEach(product => {
        if (product.offers.length > 0) {
          const offerCodes = new Set(product.offers.map(o => o.code));
          allOffers.set(product.ucode, offerCodes);
        }
      });
      setSelectedOffers(allOffers);
      
      toast({
        title: 'Tudo selecionado!',
        description: 'Todos os produtos e ofertas foram selecionados',
      });
    }, productsWithoutOffers.length > 0 ? 2000 : 0);
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
    setSelectedOffers(new Map());
    toast({
      title: 'Seleção limpa',
      description: 'Todas as seleções foram removidas',
    });
  };

  const importSelectedOffers = async () => {
    try {
      setImportingOffers(true);
      
      interface OfferToImport {
        id_produto: string;
        nome_produto: string;
        nome_oferta: string;
        codigo_oferta: string;
        valor: number;
        status: string;
        id_funil: string;
        data_ativacao: string;
      }
      
      const offersToImport: OfferToImport[] = [];
      
      hotmartProducts.forEach(product => {
        const productOfferCodes = selectedOffers.get(product.ucode);
        
        if (productOfferCodes && productOfferCodes.size > 0) {
          product.offers.forEach(offer => {
            if (productOfferCodes.has(offer.code)) {
              // Check if this offer already exists
              const exists = mappings.some(m => m.codigo_oferta === offer.code);
              if (!exists) {
                offersToImport.push({
                  id_produto: product.ucode,
                  nome_produto: product.name,
                  nome_oferta: offer.name || (offer.is_main_offer ? 'Oferta Principal' : 'Sem Nome'),
                  codigo_oferta: offer.code,
                  valor: offer.price.value,
                  status: 'Ativo',
                  id_funil: 'A Definir', // User will need to set this
                  data_ativacao: new Date().toISOString().split('T')[0],
                });
              }
            }
          });
        }
      });
      
      if (offersToImport.length === 0) {
        toast({
          title: 'Nenhuma oferta para importar',
          description: 'Selecione ofertas que ainda não foram importadas',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('Importing offers:', offersToImport);
      
      const { error } = await supabase
        .from('offer_mappings')
        .insert(offersToImport);
      
      if (error) throw error;
      
      toast({
        title: 'Importação concluída!',
        description: `${offersToImport.length} ofertas importadas com sucesso`,
      });
      
      // Clear selections and refresh
      setSelectedProducts(new Set());
      setSelectedOffers(new Map());
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
    }
  };

  // Sync existing offers with Hotmart data
  const syncOffersWithHotmart = async () => {
    try {
      setSyncingOffers(true);
      
      // Get unique product IDs from existing mappings (clean "ID " prefix if present)
      const productIds = [...new Set(mappings.filter(m => m.id_produto).map(m => {
        const id = m.id_produto!;
        // Remove "ID " prefix if present (some products were stored with this format)
        return id.startsWith('ID ') ? id.substring(3) : id;
      }))];
      
      if (productIds.length === 0) {
        toast({
          title: 'Nada para sincronizar',
          description: 'Não há ofertas importadas com ID de produto',
        });
        return;
      }
      
      toast({
        title: 'Sincronizando...',
        description: `Buscando dados de ${productIds.length} produtos na Hotmart`,
      });
      
      let updatedCount = 0;
      const changes: string[] = [];
      
      // For each product, fetch offers and compare
      for (const productId of productIds) {
        try {
          const { data, error } = await supabase.functions.invoke('hotmart-api', {
            body: {
              endpoint: `products/${productId}/offers`,
              params: {},
              apiType: 'products'
            }
          });
          
          if (error) {
            console.error(`Error fetching offers for product ${productId}:`, error);
            continue;
          }
          
          const hotmartOffers: HotmartOffer[] = data.items || data || [];
          
          // Compare with local mappings
          for (const hotmartOffer of hotmartOffers) {
            const localMapping = mappings.find(m => m.codigo_oferta === hotmartOffer.code);
            
            if (localMapping) {
              const changesForOffer: string[] = [];
              const now = new Date().toLocaleDateString('pt-BR');
              
              // Check for price change
              if (hotmartOffer.price?.value && localMapping.valor !== hotmartOffer.price.value) {
                changesForOffer.push(`Valor: R$ ${localMapping.valor?.toFixed(2) || '0'} → R$ ${hotmartOffer.price.value.toFixed(2)}`);
              }
              
              // Check for name change
              const hotmartOfferName = hotmartOffer.name || (hotmartOffer.is_main_offer ? 'Oferta Principal' : 'Sem Nome');
              if (hotmartOfferName !== localMapping.nome_oferta) {
                changesForOffer.push(`Nome: "${localMapping.nome_oferta}" → "${hotmartOfferName}"`);
              }
              
              if (changesForOffer.length > 0) {
                // Update the mapping with new data and add annotation
                const existingNotes = localMapping.anotacoes || '';
                const newNote = `[${now}] Alterações sincronizadas da Hotmart:\n${changesForOffer.join('\n')}`;
                const updatedNotes = existingNotes ? `${newNote}\n\n${existingNotes}` : newNote;
                
                const { error: updateError } = await supabase
                  .from('offer_mappings')
                  .update({
                    valor: hotmartOffer.price?.value || localMapping.valor,
                    nome_oferta: hotmartOfferName,
                    anotacoes: updatedNotes,
                  })
                  .eq('id', localMapping.id);
                
                if (!updateError) {
                  updatedCount++;
                  changes.push(`${localMapping.nome_produto} - ${hotmartOfferName}`);
                }
              }
            }
          }
        } catch (e) {
          console.error(`Error processing product ${productId}:`, e);
        }
      }
      
      if (updatedCount > 0) {
        toast({
          title: 'Sincronização concluída!',
          description: `${updatedCount} oferta(s) atualizada(s). Alterações anotadas automaticamente.`,
        });
        fetchMappings();
      } else {
        toast({
          title: 'Tudo sincronizado!',
          description: 'Nenhuma alteração detectada nas ofertas',
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

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleAdd = () => {
    setSelectedMapping(null);
    setDialogOpen(true);
  };

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

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getSelectedOffersCount = () => {
    let count = 0;
    selectedOffers.forEach(offers => {
      count += offers.size;
    });
    return count;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Mapeamento de Ofertas (V2)
              </h1>
              <p className="text-muted-foreground">
                Importação automática + cadastro manual de ofertas
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="existing">Ofertas Cadastradas</TabsTrigger>
            <TabsTrigger value="import">Importar da Hotmart</TabsTrigger>
          </TabsList>

          {/* Tab: Existing Mappings */}
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
                    <Button onClick={handleAdd} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nova Oferta
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
                <div className="text-center py-8 text-muted-foreground">
                  Carregando mapeamentos...
                </div>
              ) : filteredMappings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Nenhum mapeamento encontrado
                  </p>
                  <Button onClick={handleAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar primeiro mapeamento
                  </Button>
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
                            {mapping.id_produto || '-'}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {mapping.nome_produto}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {mapping.nome_oferta || '-'}
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

          {/* Tab: Import from Hotmart */}
          <TabsContent value="import" className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">Importar Produtos e Ofertas da Hotmart</h3>
                  <p className="text-sm text-muted-foreground">
                    Busque produtos da sua conta Hotmart e importe as ofertas para o sistema
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hotmartProducts.length > 0 && (
                    <>
                      <Button 
                        onClick={selectAllProductsAndOffers}
                        variant="outline"
                        className="gap-2"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Selecionar Tudo
                      </Button>
                      {getSelectedOffersCount() > 0 && (
                        <Button 
                          onClick={deselectAll}
                          variant="ghost"
                          className="gap-2"
                        >
                          <XSquare className="h-4 w-4" />
                          Limpar
                        </Button>
                      )}
                    </>
                  )}
                  {getSelectedOffersCount() > 0 && (
                    <Button 
                      onClick={importSelectedOffers}
                      disabled={importingOffers}
                      className="gap-2"
                    >
                      {importingOffers ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Importar {getSelectedOffersCount()} oferta(s)
                    </Button>
                  )}
                  <Button 
                    onClick={fetchHotmartProducts}
                    disabled={loadingProducts}
                    variant="outline"
                    className="gap-2"
                  >
                    {loadingProducts ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Buscar Produtos
                  </Button>
                </div>
              </div>
            </Card>

            {hotmartProducts.length > 0 && (
              <Card className="p-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </Card>
            )}

            <Card className="p-6">
              {loadingProducts ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Buscando produtos da Hotmart...</p>
                </div>
              ) : hotmartProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Clique em "Buscar Produtos" para carregar os produtos da sua conta Hotmart
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {filteredProducts.length} produtos encontrados. Clique em um produto para carregar suas ofertas.
                  </p>
                  
                  <div className="space-y-2">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedProducts.has(product.ucode);
                      const productOffers = selectedOffers.get(product.ucode) || new Set();
                      const existingOfferCodes = mappings.map(m => m.codigo_oferta);
                      
                      return (
                        <div key={product.ucode} className="border rounded-lg">
                          <div 
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              toggleProductSelection(product.ucode);
                              if (!isSelected && product.offers.length === 0) {
                                fetchProductOffers(product);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => {}}
                              />
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {product.id} | ucode: {product.ucode}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {product.status}
                              </Badge>
                              <Badge variant="outline">{product.format}</Badge>
                              {product.offers.length > 0 && (
                                <Badge variant="secondary">
                                  {product.offers.length} ofertas
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Offers section */}
                          {isSelected && (
                            <div className="border-t bg-muted/30 p-4">
                              {product.loadingOffers ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Carregando ofertas...
                                </div>
                              ) : product.offers.length === 0 ? (
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-muted-foreground">
                                    Nenhuma oferta encontrada para este produto
                                  </p>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchProductOffers(product);
                                    }}
                                  >
                                    Buscar Ofertas
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium mb-2">Selecione as ofertas para importar:</p>
                                  {product.offers.map((offer) => {
                                    const alreadyImported = existingOfferCodes.includes(offer.code);
                                    const isOfferSelected = productOffers.has(offer.code);
                                    const offerDisplayName = offer.name || (offer.is_main_offer ? 'Oferta Principal' : 'Sem Nome');
                                    
                                    return (
                                      <div 
                                        key={offer.code}
                                        className={`flex items-center justify-between p-2 rounded ${
                                          alreadyImported ? 'bg-muted opacity-60' : 'hover:bg-muted/50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <Checkbox 
                                            checked={isOfferSelected}
                                            disabled={alreadyImported}
                                            onCheckedChange={() => {
                                              if (!alreadyImported) {
                                                toggleOfferSelection(product.ucode, offer.code);
                                              }
                                            }}
                                          />
                                          <div>
                                            <p className="text-sm font-medium">
                                              {offerDisplayName}
                                              {offer.is_main_offer && (
                                                <Badge variant="outline" className="ml-2 text-xs">Principal</Badge>
                                              )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              Código: {offer.code} | {offer.payment_mode}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">
                                            {new Intl.NumberFormat('pt-BR', {
                                              style: 'currency',
                                              currency: offer.price.currency_code || 'BRL',
                                            }).format(offer.price.value)}
                                          </span>
                                          {alreadyImported && (
                                            <Badge variant="outline" className="text-green-600">
                                              Já importada
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <OfferMappingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mapping={selectedMapping}
        onSuccess={fetchMappings}
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

