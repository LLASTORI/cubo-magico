import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const POSITION_TYPES = [
  { value: 'FRONT', label: 'FRONT - Produto Principal', maxOrder: 1 },
  { value: 'OB', label: 'OB - Order Bump (1-5)', maxOrder: 5 },
  { value: 'US', label: 'US - Upsell (1-5)', maxOrder: 5 },
  { value: 'DS', label: 'DS - Downsell (1-5)', maxOrder: 5 },
];

const ORDER_OPTIONS = [1, 2, 3, 4, 5];

const formSchema = z.object({
  id_produto_visual: z.string().optional(),
  nome_produto: z.string().min(1, 'Nome do produto é obrigatório').max(200),
  nome_oferta: z.string().optional(),
  codigo_oferta: z.string().optional(),
  valor: z.string().optional(),
  status: z.string().optional(),
  data_ativacao: z.string().optional(),
  data_desativacao: z.string().optional(),
  id_funil: z.string().min(1, 'ID do funil é obrigatório').max(100),
  anotacoes: z.string().optional(),
  tipo_posicao: z.string().optional(),
  ordem_posicao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OfferMapping {
  id: string;
  id_produto: string | null;
  id_produto_visual: string | null;
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

interface OfferMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: OfferMapping | null;
  onSuccess: () => void;
  projectId: string | null;
}

// Generate position display name from type and order
const generatePositionName = (type: string | null, order: number | null): string | null => {
  if (!type) return null;
  if (type === 'FRONT') return 'FRONT';
  if (!order || order === 1) return `${type}1`;
  return `${type}${order}`;
};

export function OfferMappingDialog({
  open,
  onOpenChange,
  mapping,
  onSuccess,
  projectId,
}: OfferMappingDialogProps) {
  const { toast } = useToast();
  const [existingFunnels, setExistingFunnels] = useState<{id: string; name: string}[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id_produto_visual: '',
      nome_produto: '',
      nome_oferta: '',
      codigo_oferta: '',
      valor: '',
      status: 'Ativo',
      data_ativacao: '',
      data_desativacao: '',
      id_funil: '',
      anotacoes: '',
      tipo_posicao: '',
      ordem_posicao: '1',
    },
  });

// Fetch existing funnels from funnels table for this project only
  useEffect(() => {
    const fetchFunnels = async () => {
      if (!projectId) {
        setExistingFunnels([]);
        return;
      }
      
      const { data } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', projectId)
        .order('name');
      
      if (data) {
        setExistingFunnels(data.map(f => ({ id: f.id, name: f.name })));
      }
    };
    
    if (open) {
      fetchFunnels();
    }
  }, [open, projectId]);

  useEffect(() => {
    if (mapping) {
      console.log('Mapping being edited:', mapping);
      form.reset({
        id_produto_visual: mapping.id_produto_visual || mapping.id_produto || '',
        nome_produto: mapping.nome_produto || '',
        nome_oferta: mapping.nome_oferta || '',
        codigo_oferta: mapping.codigo_oferta || '',
        valor: mapping.valor !== null && mapping.valor !== undefined ? mapping.valor.toString() : '',
        status: mapping.status || 'Ativo',
        data_ativacao: mapping.data_ativacao || '',
        data_desativacao: mapping.data_desativacao || '',
        id_funil: mapping.id_funil || '',
        anotacoes: mapping.anotacoes || '',
        tipo_posicao: mapping.tipo_posicao || '',
        ordem_posicao: mapping.ordem_posicao?.toString() || '1',
      });
    } else {
      form.reset({
        id_produto_visual: '',
        nome_produto: '',
        nome_oferta: '',
        codigo_oferta: '',
        valor: '',
        status: 'Ativo',
        data_ativacao: '',
        data_desativacao: '',
        id_funil: '',
        anotacoes: '',
        tipo_posicao: '',
        ordem_posicao: '1',
      });
    }
  }, [mapping, form]);

  const tipoPosicao = form.watch('tipo_posicao');
  const showOrdemField = tipoPosicao && tipoPosicao !== 'FRONT';

  const onSubmit = async (values: FormValues) => {
    try {
      const ordemPosicao = values.ordem_posicao ? parseInt(values.ordem_posicao) : 1;
      const nomePosicao = generatePositionName(values.tipo_posicao || null, ordemPosicao);

      const data = {
        id_produto: values.id_produto_visual || null,
        id_produto_visual: values.id_produto_visual || null,
        nome_produto: values.nome_produto,
        nome_oferta: values.nome_oferta || null,
        codigo_oferta: values.codigo_oferta || null,
        valor: values.valor ? parseFloat(values.valor) : null,
        status: values.status || null,
        data_ativacao: values.data_ativacao || null,
        data_desativacao: values.data_desativacao || null,
        id_funil: values.id_funil,
        anotacoes: values.anotacoes || null,
        tipo_posicao: values.tipo_posicao || null,
        ordem_posicao: ordemPosicao,
        nome_posicao: nomePosicao,
      };

      if (mapping) {
        const { error } = await supabase
          .from('offer_mappings')
          .update(data)
          .eq('id', mapping.id);

        if (error) throw error;

        toast({
          title: 'Sucesso!',
          description: 'Mapeamento atualizado com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('offer_mappings')
          .insert(data);

        if (error) throw error;

        toast({
          title: 'Sucesso!',
          description: 'Mapeamento criado com sucesso',
        });
      }

      onOpenChange(false);
      onSuccess();
      form.reset();
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mapping ? 'Editar Mapeamento' : 'Novo Mapeamento'}
          </DialogTitle>
          <DialogDescription>
            {mapping
              ? 'Atualize as informações do mapeamento de oferta'
              : 'Adicione um novo mapeamento de produto/oferta para um funil'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id_produto_visual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Produto</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ID do produto" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_produto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Produto *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome do produto" 
                        {...field} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome_oferta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Oferta</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome da oferta" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo_oferta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Oferta</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Código da oferta" 
                        {...field} 
                        disabled 
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Valor à vista da oferta (editável)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Pausado">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_ativacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Ativação</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_desativacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Desativação</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ID Funil - Select dos funis cadastrados */}
            <FormField
              control={form.control}
              name="id_funil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funil *</FormLabel>
                  {existingFunnels.length === 0 ? (
                    <div className="p-3 border rounded-md bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        Nenhum funil cadastrado. Acesse a aba "Funis" para criar um novo funil antes de continuar.
                      </p>
                    </div>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um funil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {existingFunnels.map((funnel) => (
                          <SelectItem key={funnel.id} value={funnel.name}>
                            {funnel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Posição no Funil */}
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <h4 className="font-medium text-sm">Posição no Funil</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_posicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Posição</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {POSITION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showOrdemField && (
                  <FormField
                    control={form.control}
                    name="ordem_posicao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordem (1-5)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ORDER_OPTIONS.map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {tipoPosicao}{num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              {tipoPosicao && (
                <p className="text-xs text-muted-foreground">
                  Posição: <span className="font-semibold">{generatePositionName(tipoPosicao, parseInt(form.watch('ordem_posicao') || '1'))}</span>
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="anotacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anotações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anote alterações importantes ou observações sobre este mapeamento..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {mapping ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
