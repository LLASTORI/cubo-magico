import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Grid3X3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatPlanName } from '@/lib/planUtils';

interface Plan {
  id: string;
  name: string;
  type: string;
  max_projects: number;
  is_active: boolean;
}

interface Feature {
  id: string;
  module_key: string;
  feature_key: string;
  name: string;
  is_active: boolean;
}

interface PlanFeature {
  id: string;
  plan_id: string;
  feature_id: string;
  enabled: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  core: 'Core (Dashboard/Configurações)',
  crm: 'CRM',
  insights: 'Insights',
  surveys: 'Pesquisas',
  hotmart: 'Hotmart (inclui Lançamentos)',
  meta_ads: 'Meta Ads',
  whatsapp: 'WhatsApp',
  automations: 'Automações',
};

// Custom plan order: Básico → Pro → Business → Ilimitado
const PLAN_ORDER: Record<string, number> = {
  'básico': 1,
  'basico': 1,
  'pro': 2,
  'business': 3,
  'ilimitado': 4,
};

const getPlanOrder = (planName: string): number => {
  const normalized = planName.toLowerCase().trim();
  return PLAN_ORDER[normalized] ?? 99;
};

export const PlanFeaturesManager = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('id, name, type, max_projects, is_active')
        .eq('is_active', true);

      if (plansError) throw plansError;
      
      // Sort plans by custom order (name then type)
      const typeOrder: Record<string, number> = { monthly: 0, yearly: 1, lifetime: 2, trial: 3 };
      const sortedPlans = (plansData || []).sort((a, b) => {
        const nameOrder = getPlanOrder(a.name) - getPlanOrder(b.name);
        if (nameOrder !== 0) return nameOrder;
        return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
      });
      setPlans(sortedPlans);

      // Fetch features
      const { data: featuresData, error: featuresError } = await supabase
        .from('features' as any)
        .select('id, module_key, feature_key, name, is_active')
        .eq('is_active', true)
        .order('module_key')
        .order('feature_key') as { data: Feature[] | null; error: any };

      if (featuresError) throw featuresError;
      setFeatures(featuresData || []);

      // Fetch plan_features
      const { data: pfData, error: pfError } = await supabase
        .from('plan_features' as any)
        .select('id, plan_id, feature_id, enabled') as { data: PlanFeature[] | null; error: any };

      if (pfError) throw pfError;
      setPlanFeatures(pfData || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getPlanFeatureStatus = (planId: string, featureId: string): boolean => {
    const pf = planFeatures.find(p => p.plan_id === planId && p.feature_id === featureId);
    return pf?.enabled ?? false;
  };

  const toggleFeature = async (planId: string, featureId: string) => {
    const key = `${planId}-${featureId}`;
    setSaving(key);

    try {
      const existing = planFeatures.find(p => p.plan_id === planId && p.feature_id === featureId);

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('plan_features' as any)
          .update({ enabled: !existing.enabled })
          .eq('id', existing.id);

        if (error) throw error;

        setPlanFeatures(prev => 
          prev.map(pf => pf.id === existing.id ? { ...pf, enabled: !pf.enabled } : pf)
        );
      } else {
        // Create new
        const { data, error } = await supabase
          .from('plan_features' as any)
          .insert({ plan_id: planId, feature_id: featureId, enabled: true })
          .select('id, plan_id, feature_id, enabled')
          .single() as { data: PlanFeature | null; error: any };

        if (error) throw error;
        if (data) {
          setPlanFeatures(prev => [...prev, data]);
        }
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar', { description: error.message });
    } finally {
      setSaving(null);
    }
  };

  const enableAllForPlan = async (planId: string) => {
    setSaving(`all-${planId}`);
    try {
      // Get features not yet in plan_features for this plan
      const existingFeatureIds = planFeatures
        .filter(pf => pf.plan_id === planId)
        .map(pf => pf.feature_id);

      const missingFeatures = features.filter(f => !existingFeatureIds.includes(f.id));

      // Insert missing ones
      if (missingFeatures.length > 0) {
        const { error: insertError } = await supabase
          .from('plan_features' as any)
          .insert(missingFeatures.map(f => ({
            plan_id: planId,
            feature_id: f.id,
            enabled: true
          })));

        if (insertError) throw insertError;
      }

      // Update all existing to enabled
      const { error: updateError } = await supabase
        .from('plan_features' as any)
        .update({ enabled: true })
        .eq('plan_id', planId);

      if (updateError) throw updateError;

      toast.success('Todas as features habilitadas!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao habilitar', { description: error.message });
    } finally {
      setSaving(null);
    }
  };

  // Group features by module
  const groupedFeatures = features.reduce((acc, f) => {
    if (!acc[f.module_key]) acc[f.module_key] = [];
    acc[f.module_key].push(f);
    return acc;
  }, {} as Record<string, Feature[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Grid3X3 className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Matriz Planos × Features</CardTitle>
                <CardDescription>Configure quais features cada plano tem acesso</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 bg-muted/50 sticky left-0 z-10 min-w-[250px]">Feature</th>
                  {plans.map(plan => (
                    <th key={plan.id} className="text-center p-3 bg-muted/50 min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold text-xs">{formatPlanName(plan.name, plan.type)}</span>
                        <Badge variant="outline" className="text-xs">
                          {plan.max_projects === 0 ? '∞' : plan.max_projects} proj
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-xs h-6"
                          onClick={() => enableAllForPlan(plan.id)}
                          disabled={saving === `all-${plan.id}`}
                        >
                          {saving === `all-${plan.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Habilitar Todos'
                          )}
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedFeatures).map(([module, moduleFeatures]) => (
                  <>
                    <tr key={`header-${module}`} className="bg-muted/30">
                      <td colSpan={plans.length + 1} className="p-2">
                        <Badge variant="secondary">{MODULE_LABELS[module] || module}</Badge>
                      </td>
                    </tr>
                    {moduleFeatures.map(feature => (
                      <tr key={feature.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3 sticky left-0 bg-background">
                          <div>
                            <p className="font-medium text-sm">{feature.name}</p>
                            <code className="text-xs text-muted-foreground">{feature.feature_key}</code>
                          </div>
                        </td>
                        {plans.map(plan => {
                          const key = `${plan.id}-${feature.id}`;
                          const isEnabled = getPlanFeatureStatus(plan.id, feature.id);
                          return (
                            <td key={key} className="text-center p-3">
                              {saving === key ? (
                                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                              ) : (
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={() => toggleFeature(plan.id, feature.id)}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
