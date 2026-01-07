import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Search, Plus, Megaphone, Check, Wand2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLaunchPhases, PhaseCampaign, LaunchPhase } from "@/hooks/useLaunchPhases";
import { useToast } from "@/hooks/use-toast";

interface MetaCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  status: string | null;
  objective: string | null;
}

interface PhaseCampaignsManagerProps {
  projectId: string;
  funnelId: string;
  phase: LaunchPhase;
  phaseCampaigns: PhaseCampaign[];
}

export const PhaseCampaignsManager = ({
  projectId,
  funnelId,
  phase,
  phaseCampaigns,
}: PhaseCampaignsManagerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pattern, setPattern] = useState(phase.campaign_name_pattern || "");
  const [isSavingPattern, setIsSavingPattern] = useState(false);
  const { toast } = useToast();

  const { linkCampaignToPhase, unlinkCampaignFromPhase, updatePhase } = useLaunchPhases(projectId, funnelId);

  // Update local pattern when phase changes
  useEffect(() => {
    setPattern(phase.campaign_name_pattern || "");
  }, [phase.campaign_name_pattern]);

  // Fetch all Meta campaigns for this project
  const { data: allCampaigns = [], isLoading } = useQuery({
    queryKey: ['meta-campaigns', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('id, campaign_id, campaign_name, status, objective')
        .eq('project_id', projectId)
        .order('campaign_name');
      if (error) throw error;
      return data as MetaCampaign[];
    },
    enabled: !!projectId,
  });

  // Get manually linked campaign IDs
  const manuallyLinkedCampaignIds = useMemo(() => {
    return phaseCampaigns
      .filter(pc => pc.phase_id === phase.id)
      .map(pc => pc.campaign_id);
  }, [phaseCampaigns, phase.id]);

  // Get campaigns matching the pattern (automatic)
  const patternMatchedCampaigns = useMemo(() => {
    if (!phase.campaign_name_pattern?.trim()) return [];
    // Normalize to handle special characters like Ç, Ã, etc.
    const patternNormalized = phase.campaign_name_pattern
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return allCampaigns.filter(c => {
      const campaignNormalized = c.campaign_name
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return campaignNormalized?.includes(patternNormalized);
    });
  }, [allCampaigns, phase.campaign_name_pattern]);

  // Combined: pattern matched + manually linked (unique)
  const allLinkedCampaigns = useMemo(() => {
    const patternIds = patternMatchedCampaigns.map(c => c.campaign_id);
    const allIds = new Set([...patternIds, ...manuallyLinkedCampaignIds]);
    return allCampaigns.filter(c => allIds.has(c.campaign_id));
  }, [allCampaigns, patternMatchedCampaigns, manuallyLinkedCampaignIds]);

  // Filter campaigns by search in dialog
  const filteredCampaigns = useMemo(() => {
    if (!search.trim()) return allCampaigns;
    const searchLower = search.toLowerCase();
    return allCampaigns.filter(c => 
      c.campaign_name?.toLowerCase().includes(searchLower) ||
      c.campaign_id.toLowerCase().includes(searchLower)
    );
  }, [allCampaigns, search]);

  // Preview of what the current pattern would match
  const patternPreview = useMemo(() => {
    if (!pattern.trim()) return [];
    // Normalize to handle special characters like Ç, Ã, etc.
    const patternNormalized = pattern
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return allCampaigns.filter(c => {
      const campaignNormalized = c.campaign_name
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return campaignNormalized?.includes(patternNormalized);
    });
  }, [allCampaigns, pattern]);

  const handleSavePattern = async () => {
    setIsSavingPattern(true);
    try {
      await updatePhase.mutateAsync({
        id: phase.id,
        campaign_name_pattern: pattern.trim() || null,
      });
      toast({
        title: "Padrão salvo",
        description: `${patternPreview.length} campanha(s) correspondem ao padrão`,
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o padrão",
        variant: "destructive",
      });
    } finally {
      setIsSavingPattern(false);
    }
  };

  const handleToggleCampaign = (campaignId: string) => {
    const isLinked = manuallyLinkedCampaignIds.includes(campaignId);
    if (isLinked) {
      unlinkCampaignFromPhase.mutate({ phaseId: phase.id, campaignId });
    } else {
      linkCampaignToPhase.mutate({ phaseId: phase.id, campaignId });
    }
  };

  const handleRemoveCampaign = (campaignId: string, isFromPattern: boolean) => {
    // Only remove if it's manually linked
    if (!isFromPattern && manuallyLinkedCampaignIds.includes(campaignId)) {
      unlinkCampaignFromPhase.mutate({ phaseId: phase.id, campaignId });
    }
  };

  const isMatchedByPattern = (campaignId: string) => {
    return patternMatchedCampaigns.some(c => c.campaign_id === campaignId);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">Campanhas</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="w-3 h-3" />
              Configurar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Campanhas: {phase.name}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="pattern" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pattern" className="gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  Por Padrão
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Manual
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pattern" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Padrão de Nomenclatura</Label>
                  <p className="text-xs text-muted-foreground">
                    Campanhas que contêm este texto no nome serão automaticamente vinculadas a esta fase.
                    Ex: <code className="bg-muted px-1 rounded">BF2025_LEAD</code> para fase de captação.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: BF2025_VENDA"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSavePattern} 
                      disabled={isSavingPattern || pattern === (phase.campaign_name_pattern || "")}
                      size="sm"
                      className="gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar
                    </Button>
                  </div>
                </div>

                {pattern.trim() && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Pré-visualização: {patternPreview.length} campanha(s) correspondem
                    </Label>
                    <ScrollArea className="h-[200px] border rounded-md">
                      {patternPreview.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          Nenhuma campanha corresponde ao padrão
                        </div>
                      ) : (
                        <div className="p-2 space-y-1">
                          {patternPreview.map((campaign) => (
                            <div
                              key={campaign.id}
                              className="flex items-center gap-2 p-2 rounded-md bg-primary/5"
                            >
                              <Check className="w-3.5 h-3.5 text-primary" />
                              <span className="text-sm truncate flex-1">
                                {campaign.campaign_name || campaign.campaign_id}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {campaign.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar campanhas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[300px] border rounded-md">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Carregando campanhas...
                    </div>
                  ) : filteredCampaigns.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {search ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha disponível'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredCampaigns.map((campaign) => {
                        const isManuallyLinked = manuallyLinkedCampaignIds.includes(campaign.campaign_id);
                        const isPatternMatched = isMatchedByPattern(campaign.campaign_id);
                        return (
                          <div
                            key={campaign.id}
                            className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer ${
                              isPatternMatched ? 'bg-primary/5 opacity-60' : ''
                            }`}
                            onClick={() => !isPatternMatched && handleToggleCampaign(campaign.campaign_id)}
                          >
                            <Checkbox 
                              checked={isManuallyLinked || isPatternMatched} 
                              disabled={isPatternMatched}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {campaign.campaign_name || campaign.campaign_id}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  ID: {campaign.campaign_id}
                                </span>
                                {isPatternMatched && (
                                  <Badge variant="secondary" className="text-xs gap-0.5">
                                    <Wand2 className="w-2.5 h-2.5" />
                                    padrão
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {(isManuallyLinked || isPatternMatched) && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                <div className="text-sm text-muted-foreground">
                  {manuallyLinkedCampaignIds.length} selecionada(s) manualmente
                  {patternMatchedCampaigns.length > 0 && ` + ${patternMatchedCampaigns.length} por padrão`}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Display pattern if set */}
      {phase.campaign_name_pattern && (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="gap-1 text-xs bg-primary/5">
            <Wand2 className="w-3 h-3" />
            {phase.campaign_name_pattern}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({patternMatchedCampaigns.length} campanhas)
          </span>
        </div>
      )}

      {/* Display linked campaigns as badges */}
      {allLinkedCampaigns.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {allLinkedCampaigns.slice(0, 5).map((campaign) => {
            const isFromPattern = isMatchedByPattern(campaign.campaign_id);
            return (
              <Badge
                key={campaign.campaign_id}
                variant={isFromPattern ? "outline" : "secondary"}
                className="gap-1 pr-1 text-xs"
              >
                <Megaphone className="w-3 h-3" />
                <span className="truncate max-w-[120px]">
                  {campaign.campaign_name || campaign.campaign_id}
                </span>
                {!isFromPattern && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-destructive/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCampaign(campaign.campaign_id, isFromPattern);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </Badge>
            );
          })}
          {allLinkedCampaigns.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{allLinkedCampaigns.length - 5} mais
            </Badge>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma campanha vinculada
        </p>
      )}
    </div>
  );
};
