import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
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
}

export default function OfferMappings() {
  const [mappings, setMappings] = useState<OfferMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<OfferMapping | null>(null);
  const [mappingToDelete, setMappingToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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

        <Card className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando mapeamentos...
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhum mapeamento cadastrado
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
                    <TableHead>ID Produto</TableHead>
                    <TableHead>Nome Produto</TableHead>
                    <TableHead>Nome Oferta</TableHead>
                    <TableHead>Código Oferta</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ativação</TableHead>
                    <TableHead>Desativação</TableHead>
                    <TableHead>ID Funil</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-mono text-xs">
                        {mapping.id_produto || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {mapping.nome_produto}
                      </TableCell>
                      <TableCell>{mapping.nome_oferta || '-'}</TableCell>
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
                      <TableCell>{formatDate(mapping.data_ativacao)}</TableCell>
                      <TableCell>{formatDate(mapping.data_desativacao)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {mapping.id_funil}
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