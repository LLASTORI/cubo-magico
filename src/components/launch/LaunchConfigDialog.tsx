import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Settings, Rocket, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LaunchPhaseEditor } from "./LaunchPhaseEditor";
import { useLaunchPhases, PRODUCT_TYPES } from "@/hooks/useLaunchPhases";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface LaunchConfigDialogProps {
  funnel: {
    id: string;
    name: string;
    project_id: string | null;
    launch_start_date?: string | null;
    launch_end_date?: string | null;
    has_fixed_dates?: boolean;
  };
  trigger?: React.ReactNode;
}

export const LaunchConfigDialog = ({ funnel, trigger }: LaunchConfigDialogProps) => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    funnel.launch_start_date ? new Date(funnel.launch_start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    funnel.launch_end_date ? new Date(funnel.launch_end_date) : undefined
  );
  const [hasFixedDates, setHasFixedDates] = useState(funnel.has_fixed_dates ?? true);
  
  const queryClient = useQueryClient();
  const projectId = funnel.project_id || '';
  
  const { launchProducts, createLaunchProduct, updateLaunchProduct, deleteLaunchProduct } = useLaunchPhases(projectId, funnel.id);

  // Fetch offer mappings for this funnel
  const { data: offerMappings = [] } = useQuery({
    queryKey: ['offer-mappings', projectId, funnel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('funnel_id', funnel.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!funnel.id,
  });

  // Update funnel dates
  const updateFunnelDates = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('funnels')
        .update({
          launch_start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
          launch_end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          has_fixed_dates: hasFixedDates,
        })
        .eq('id', funnel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels-lancamento'] });
      toast.success('Período atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const handleSaveDates = () => {
    updateFunnelDates.mutate();
  };

  const handleAddProduct = (offerMappingId: string, productType: string, lotName: string | null = null) => {
    createLaunchProduct.mutate({
      funnel_id: funnel.id,
      offer_mapping_id: offerMappingId,
      project_id: projectId,
      product_type: productType,
      lot_name: lotName,
    });
  };

  const handleUpdateLotName = (productId: string, lotName: string) => {
    updateLaunchProduct.mutate({
      id: productId,
      lot_name: lotName || null,
    });
  };

  const getProductInfo = (offerMappingId: string) => {
    return launchProducts.find(p => p.offer_mapping_id === offerMappingId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Configurar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Configuração: {funnel.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="period" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="period">Período</TabsTrigger>
            <TabsTrigger value="phases">Fases</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
          </TabsList>

          <TabsContent value="period" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Período Fixo</Label>
                  <p className="text-sm text-muted-foreground">
                    O lançamento tem datas definidas de início e fim?
                  </p>
                </div>
                <Switch
                  checked={hasFixedDates}
                  onCheckedChange={setHasFixedDates}
                />
              </div>

              {hasFixedDates && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {startDate 
                            ? format(startDate, 'dd/MM/yyyy', { locale: ptBR })
                            : 'Selecionar data'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Encerramento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {endDate 
                            ? format(endDate, 'dd/MM/yyyy', { locale: ptBR })
                            : 'Selecionar data'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveDates} disabled={updateFunnelDates.isPending}>
                  Salvar Período
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="phases" className="space-y-4">
            <LaunchPhaseEditor 
              projectId={projectId} 
              funnelId={funnel.id} 
              funnelName={funnel.name} 
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Produtos do Lançamento
                </h3>
                <p className="text-sm text-muted-foreground">
                  Classifique as ofertas como Principal, Upsell ou Downsell
                </p>
              </div>

              {offerMappings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma oferta mapeada para este funil.
                </div>
              ) : (
                <div className="space-y-3">
                  {offerMappings.map((mapping) => {
                    const linkedProduct = getProductInfo(mapping.id);
                    const currentType = linkedProduct?.product_type || null;
                    const currentLot = linkedProduct?.lot_name || '';
                    
                    return (
                      <div 
                        key={mapping.id}
                        className="p-3 rounded-lg border bg-card space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{mapping.nome_oferta || mapping.nome_produto}</p>
                            <p className="text-xs text-muted-foreground">
                              {mapping.codigo_oferta} • {mapping.tipo_posicao || 'Sem posição'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={currentType || 'none'}
                              onValueChange={(value) => {
                                if (linkedProduct) {
                                  deleteLaunchProduct.mutate(linkedProduct.id);
                                }
                                if (value && value !== 'none') {
                                  handleAddProduct(mapping.id, value, currentLot || null);
                                }
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Classificar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem classificação</SelectItem>
                                {PRODUCT_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Lot Name Field - only show when product is classified */}
                        {linkedProduct && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Label className="text-sm text-muted-foreground whitespace-nowrap">Lote:</Label>
                            <Input
                              placeholder="Ex: Lote 1, Early Bird, VIP..."
                              value={currentLot}
                              onChange={(e) => handleUpdateLotName(linkedProduct.id, e.target.value)}
                              className="h-8 text-sm"
                            />
                            {currentLot && (
                              <Badge variant="secondary" className="whitespace-nowrap">
                                {currentLot}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
