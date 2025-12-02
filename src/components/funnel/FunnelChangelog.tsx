import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, History, DollarSign, Tag, FileText, Trash2, Edit2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FunnelChange {
  id: string;
  id_funil: string;
  codigo_oferta: string | null;
  tipo_alteracao: string;
  descricao: string;
  valor_anterior: number | null;
  valor_novo: number | null;
  data_alteracao: string;
  anotacoes: string | null;
  created_at: string;
}

interface OfferOption {
  codigo_oferta: string;
  nome_oferta: string;
}

interface FunnelChangelogProps {
  selectedFunnel: string;
  offerOptions: OfferOption[];
}

const TIPO_ALTERACAO_OPTIONS = [
  { value: 'preco', label: 'Alteração de Preço', icon: DollarSign, color: 'bg-green-500/20 text-green-400' },
  { value: 'oferta_nova', label: 'Nova Oferta', icon: Plus, color: 'bg-blue-500/20 text-blue-400' },
  { value: 'oferta_removida', label: 'Oferta Removida', icon: X, color: 'bg-red-500/20 text-red-400' },
  { value: 'copy', label: 'Alteração de Copy', icon: FileText, color: 'bg-purple-500/20 text-purple-400' },
  { value: 'outro', label: 'Outro', icon: Tag, color: 'bg-gray-500/20 text-gray-400' },
];

const FunnelChangelog = ({ selectedFunnel, offerOptions }: FunnelChangelogProps) => {
  const [changes, setChanges] = useState<FunnelChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    codigo_oferta: '',
    tipo_alteracao: 'preco',
    descricao: '',
    valor_anterior: '',
    valor_novo: '',
    data_alteracao: format(new Date(), 'yyyy-MM-dd'),
    anotacoes: '',
  });

  const fetchChanges = async () => {
    if (!selectedFunnel) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('funnel_changes')
      .select('*')
      .eq('id_funil', selectedFunnel)
      .order('data_alteracao', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar histórico');
      console.error(error);
    } else {
      setChanges(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChanges();
  }, [selectedFunnel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    const { error } = await supabase.from('funnel_changes').insert({
      id_funil: selectedFunnel,
      codigo_oferta: formData.codigo_oferta || null,
      tipo_alteracao: formData.tipo_alteracao,
      descricao: formData.descricao,
      valor_anterior: formData.valor_anterior ? parseFloat(formData.valor_anterior) : null,
      valor_novo: formData.valor_novo ? parseFloat(formData.valor_novo) : null,
      data_alteracao: formData.data_alteracao,
      anotacoes: formData.anotacoes || null,
    });

    if (error) {
      toast.error('Erro ao registrar alteração');
      console.error(error);
    } else {
      toast.success('Alteração registrada com sucesso!');
      setDialogOpen(false);
      setFormData({
        codigo_oferta: '',
        tipo_alteracao: 'preco',
        descricao: '',
        valor_anterior: '',
        valor_novo: '',
        data_alteracao: format(new Date(), 'yyyy-MM-dd'),
        anotacoes: '',
      });
      fetchChanges();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('funnel_changes').delete().eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Registro excluído');
      fetchChanges();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getTipoConfig = (tipo: string) => {
    return TIPO_ALTERACAO_OPTIONS.find(t => t.value === tipo) || TIPO_ALTERACAO_OPTIONS[4];
  };

  if (!selectedFunnel) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Alterações
          </h3>
          <p className="text-sm text-muted-foreground">Registre mudanças no funil para acompanhar impactos</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Registrar Alteração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Nova Alteração</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Alteração</Label>
                  <Select 
                    value={formData.tipo_alteracao} 
                    onValueChange={(v) => setFormData({ ...formData, tipo_alteracao: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_ALTERACAO_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input 
                    type="date" 
                    value={formData.data_alteracao}
                    onChange={(e) => setFormData({ ...formData, data_alteracao: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Oferta (opcional)</Label>
                <Select 
                  value={formData.codigo_oferta} 
                  onValueChange={(v) => setFormData({ ...formData, codigo_oferta: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma oferta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (geral)</SelectItem>
                    {offerOptions.map(opt => (
                      <SelectItem key={opt.codigo_oferta} value={opt.codigo_oferta}>
                        {opt.nome_oferta || opt.codigo_oferta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo_alteracao === 'preco' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Anterior (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0,00"
                      value={formData.valor_anterior}
                      onChange={(e) => setFormData({ ...formData, valor_anterior: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Novo (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0,00"
                      value={formData.valor_novo}
                      onChange={(e) => setFormData({ ...formData, valor_novo: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input 
                  placeholder="Ex: Aumentei preço do US1 de R$97 para R$147"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Anotações (opcional)</Label>
                <Textarea 
                  placeholder="Motivo da alteração, expectativas..."
                  value={formData.anotacoes}
                  onChange={(e) => setFormData({ ...formData, anotacoes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : changes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma alteração registrada ainda.</p>
          <p className="text-sm">Clique em "Registrar Alteração" para começar a acompanhar mudanças.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {changes.map((change, index) => {
            const config = getTipoConfig(change.tipo_alteracao);
            const Icon = config.icon;
            
            return (
              <div 
                key={change.id} 
                className="relative pl-8 pb-4 border-l-2 border-border/50 last:pb-0"
              >
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-background",
                  config.color.split(' ')[0]
                )} />
                
                <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={cn("text-xs", config.color)}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(change.data_alteracao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <p className="font-medium text-foreground">{change.descricao}</p>
                      
                      {change.valor_anterior !== null && change.valor_novo !== null && (
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <span className="text-red-400 line-through">{formatCurrency(change.valor_anterior)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-green-400 font-semibold">{formatCurrency(change.valor_novo)}</span>
                        </div>
                      )}
                      
                      {change.codigo_oferta && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Oferta: {change.codigo_oferta}
                        </p>
                      )}
                      
                      {change.anotacoes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{change.anotacoes}"
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      onClick={() => handleDelete(change.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default FunnelChangelog;
