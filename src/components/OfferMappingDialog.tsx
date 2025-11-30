import { useEffect } from 'react';
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

const formSchema = z.object({
  id_produto: z.string().optional(),
  nome_produto: z.string().min(1, 'Nome do produto é obrigatório').max(200),
  nome_oferta: z.string().optional(),
  codigo_oferta: z.string().optional(),
  valor: z.string().optional(),
  status: z.string().optional(),
  data_ativacao: z.string().optional(),
  data_desativacao: z.string().optional(),
  id_funil: z.string().min(1, 'ID do funil é obrigatório').max(100),
  anotacoes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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

interface OfferMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: OfferMapping | null;
  onSuccess: () => void;
}

export function OfferMappingDialog({
  open,
  onOpenChange,
  mapping,
  onSuccess,
}: OfferMappingDialogProps) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id_produto: '',
      nome_produto: '',
      nome_oferta: '',
      codigo_oferta: '',
      valor: '',
      status: 'Ativo',
      data_ativacao: '',
      data_desativacao: '',
      id_funil: '',
      anotacoes: '',
    },
  });

  useEffect(() => {
    if (mapping) {
      form.reset({
        id_produto: mapping.id_produto || '',
        nome_produto: mapping.nome_produto || '',
        nome_oferta: mapping.nome_oferta || '',
        codigo_oferta: mapping.codigo_oferta || '',
        valor: mapping.valor?.toString() || '',
        status: mapping.status || 'Ativo',
        data_ativacao: mapping.data_ativacao || '',
        data_desativacao: mapping.data_desativacao || '',
        id_funil: mapping.id_funil || '',
        anotacoes: mapping.anotacoes || '',
      });
    } else {
      form.reset({
        id_produto: '',
        nome_produto: '',
        nome_oferta: '',
        codigo_oferta: '',
        valor: '',
        status: 'Ativo',
        data_ativacao: '',
        data_desativacao: '',
        id_funil: '',
        anotacoes: '',
      });
    }
  }, [mapping, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        id_produto: values.id_produto || null,
        nome_produto: values.nome_produto,
        nome_oferta: values.nome_oferta || null,
        codigo_oferta: values.codigo_oferta || null,
        valor: values.valor ? parseFloat(values.valor) : null,
        status: values.status || null,
        data_ativacao: values.data_ativacao || null,
        data_desativacao: values.data_desativacao || null,
        id_funil: values.id_funil,
        anotacoes: values.anotacoes || null,
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
                name="id_produto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="ID do produto" {...field} />
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
                      <Input placeholder="Nome do produto" {...field} />
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
                      <Input placeholder="Nome da oferta" {...field} />
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
                      <Input placeholder="Código da oferta" {...field} />
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

            <FormField
              control={form.control}
              name="id_funil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Funil *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Face | Maquiagem 35+"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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