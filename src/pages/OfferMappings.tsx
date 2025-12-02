import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ArrowLeft, Filter } from 'lucide-react';
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

export default function OfferMappings() {
  const [mappings, setMappings] = useState<OfferMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<OfferMapping | null>(null);
  const [mappingToDelete, setMappingToDelete] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState<string>('all');
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

  // Filter mappings by selected funnel and sort by position
  const filteredMappings = useMemo(() => {
    let filtered = selectedFunnel === 'all' ? mappings : mappings.filter(m => m.id_funil === selectedFunnel);
    
    // Sort by position: FRONT first, then OB by order, US by order, DS by order
    const positionOrder = { FRONT: 0, OB: 1, US: 2, DS: 3 };
    return filtered.sort((a, b) => {
      // First sort by funnel
      const funnelCompare = a.id_funil.localeCompare(b.id_funil);
      if (funnelCompare !== 0) return funnelCompare;
      
      // Then by position type
      const aOrder = a.tipo_posicao ? (positionOrder[a.tipo_posicao as keyof typeof positionOrder] ?? 99) : 99;
      const bOrder = b.tipo_posicao ? (positionOrder[b.tipo_posicao as keyof typeof positionOrder] ?? 99) : 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Finally by ordem_posicao
      return (a.ordem_posicao || 0) - (b.ordem_posicao || 0);
    });
  }, [mappings, selectedFunnel]);

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
                Mapeamento de Ofertas
              </h1>
              <p className="text-muted-foreground">
                Gerencie o mapeamento de produtos e ofertas para funis de venda
              </p>
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Oferta
          </Button>
        </div>

        <Card className="p-4">
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
            {selectedFunnel !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFunnel('all')}
              >
                Limpar filtro
              </Button>
            )}
            
            {/* Legenda das posições */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">Posições:</span>
              <Badge className={POSITION_COLORS.FRONT}>FRONT</Badge>
              <Badge className={POSITION_COLORS.OB}>OB</Badge>
              <Badge className={POSITION_COLORS.US}>US</Badge>
              <Badge className={POSITION_COLORS.DS}>DS</Badge>
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
                {selectedFunnel === 'all' 
                  ? 'Nenhum mapeamento cadastrado' 
                  : `Nenhuma oferta encontrada para o funil ${selectedFunnel}`}
              </p>
              {selectedFunnel === 'all' && (
                <Button onClick={handleAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar primeiro mapeamento
                </Button>
              )}
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