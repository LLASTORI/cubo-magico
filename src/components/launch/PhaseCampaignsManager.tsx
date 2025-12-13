import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Search, Plus, Megaphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLaunchPhases, PhaseCampaign } from "@/hooks/useLaunchPhases";

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
  phaseId: string;
  phaseName: string;
  phaseCampaigns: PhaseCampaign[];
}

export const PhaseCampaignsManager = ({
  projectId,
  funnelId,
  phaseId,
  phaseName,
  phaseCampaigns,
}: PhaseCampaignsManagerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { linkCampaignToPhase, unlinkCampaignFromPhase } = useLaunchPhases(projectId, funnelId);

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

  // Get campaign IDs that are linked to this phase
  const linkedCampaignIds = useMemo(() => {
    return phaseCampaigns
      .filter(pc => pc.phase_id === phaseId)
      .map(pc => pc.campaign_id);
  }, [phaseCampaigns, phaseId]);

  // Filter campaigns by search
  const filteredCampaigns = useMemo(() => {
    if (!search.trim()) return allCampaigns;
    const searchLower = search.toLowerCase();
    return allCampaigns.filter(c => 
      c.campaign_name?.toLowerCase().includes(searchLower) ||
      c.campaign_id.toLowerCase().includes(searchLower)
    );
  }, [allCampaigns, search]);

  // Get the linked campaign details
  const linkedCampaigns = useMemo(() => {
    return allCampaigns.filter(c => linkedCampaignIds.includes(c.campaign_id));
  }, [allCampaigns, linkedCampaignIds]);

  const handleToggleCampaign = (campaignId: string) => {
    const isLinked = linkedCampaignIds.includes(campaignId);
    if (isLinked) {
      unlinkCampaignFromPhase.mutate({ phaseId, campaignId });
    } else {
      linkCampaignToPhase.mutate({ phaseId, campaignId });
    }
  };

  const handleRemoveCampaign = (campaignId: string) => {
    unlinkCampaignFromPhase.mutate({ phaseId, campaignId });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">Campanhas</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="w-3 h-3" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Campanhas da Fase: {phaseName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                      const isLinked = linkedCampaignIds.includes(campaign.campaign_id);
                      return (
                        <div
                          key={campaign.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleToggleCampaign(campaign.campaign_id)}
                        >
                          <Checkbox checked={isLinked} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {campaign.campaign_name || campaign.campaign_id}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                ID: {campaign.campaign_id}
                              </span>
                              {campaign.status && (
                                <Badge variant="outline" className="text-xs">
                                  {campaign.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isLinked && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              <div className="text-sm text-muted-foreground">
                {linkedCampaignIds.length} campanha(s) vinculada(s) a esta fase
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Display linked campaigns as badges */}
      {linkedCampaigns.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {linkedCampaigns.map((campaign) => (
            <Badge
              key={campaign.campaign_id}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              <Megaphone className="w-3 h-3" />
              <span className="truncate max-w-[150px]">
                {campaign.campaign_name || campaign.campaign_id}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-destructive/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCampaign(campaign.campaign_id);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma campanha vinculada
        </p>
      )}
    </div>
  );
};
