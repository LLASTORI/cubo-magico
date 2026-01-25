import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Facebook, MessageCircle, Webhook } from 'lucide-react';
import { useCRMWebhookKeys } from '@/hooks/useCRMWebhookKeys';

import { ProviderCard, ProviderStatus } from './providers/ProviderCard';
import { HotmartProviderSettings } from './providers/HotmartProviderSettings';
import { WhatsAppFullSettings } from './WhatsAppFullSettings';
import { CRMWebhookKeysManager } from './CRMWebhookKeysManager';
import { MetaAdsProviderSettings } from './providers/MetaAdsProviderSettings';

type ActiveProvider = 'list' | 'hotmart' | 'meta' | 'whatsapp' | 'webhooks';

export function ProvidersSettings() {
  const { currentProject } = useProject();
  const [activeProvider, setActiveProvider] = useState<ActiveProvider>('list');
  const projectId = currentProject?.id;

  // ==========================================
  // Provider Status Queries
  // ==========================================

  // Hotmart status - based on webhook health
  const { data: hotmartWebhookStatus } = useQuery({
    queryKey: ['hotmart_webhook_health', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('provider_event_log')
        .select('received_at')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  // Meta credentials status
  const { data: metaCredentials } = useQuery({
    queryKey: ['meta_credentials', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('meta_credentials')
        .select('expires_at')
        .eq('project_id', projectId)
        .maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  // WhatsApp numbers
  const { data: whatsappNumbers } = useQuery({
    queryKey: ['whatsapp-numbers-status', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from('whatsapp_numbers')
        .select('status')
        .eq('project_id', projectId);
      return data || [];
    },
    enabled: !!projectId,
  });

  // Webhook keys
  const { webhookKeys } = useCRMWebhookKeys();

  // ==========================================
  // Compute Provider Statuses
  // ==========================================

  const getHotmartStatus = (): ProviderStatus => {
    if (!hotmartWebhookStatus?.received_at) return 'critical';
    const lastEvent = new Date(hotmartWebhookStatus.received_at);
    const daysSince = (Date.now() - lastEvent.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) return 'warning';
    return 'operational';
  };

  const getMetaStatus = (): ProviderStatus => {
    if (!metaCredentials) return 'disconnected';
    if (metaCredentials.expires_at && new Date(metaCredentials.expires_at) < new Date()) {
      return 'warning';
    }
    return 'operational';
  };

  const getWhatsAppStatus = (): ProviderStatus => {
    const hasActive = whatsappNumbers?.some((n: any) => n.status === 'active');
    return hasActive ? 'operational' : 'disconnected';
  };

  const getWebhooksStatus = (): ProviderStatus => {
    return (webhookKeys?.length ?? 0) > 0 ? 'operational' : 'disconnected';
  };

  // ==========================================
  // Render Provider Detail Views
  // ==========================================

  if (activeProvider === 'hotmart') {
    return <HotmartProviderSettings onBack={() => setActiveProvider('list')} />;
  }

  if (activeProvider === 'meta') {
    return <MetaAdsProviderSettings onBack={() => setActiveProvider('list')} />;
  }

  if (activeProvider === 'whatsapp') {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setActiveProvider('list')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          ← Voltar para Providers
        </button>
        <WhatsAppFullSettings />
      </div>
    );
  }

  if (activeProvider === 'webhooks') {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setActiveProvider('list')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          ← Voltar para Providers
        </button>
        <CRMWebhookKeysManager />
      </div>
    );
  }

  // ==========================================
  // Provider List View (Default)
  // ==========================================

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Providers</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie suas integrações com plataformas externas
        </p>
      </div>

      {/* Financial Providers */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          💰 Financeiro
        </h3>
        <div className="grid gap-4">
          <ProviderCard
            name="Hotmart"
            description="Plataforma de vendas de produtos digitais. Fonte primária de dados financeiros."
            icon={<ShoppingCart className="h-5 w-5 text-orange-500" />}
            category="financial"
            status={getHotmartStatus()}
            statusText={getHotmartStatus() === 'critical' ? 'Webhook não configurado' : undefined}
            onClick={() => setActiveProvider('hotmart')}
          />
        </div>
      </div>

      {/* Acquisition Providers */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          📊 Aquisição
        </h3>
        <div className="grid gap-4">
          <ProviderCard
            name="Meta Ads"
            description="Facebook e Instagram Ads. Importe dados de gastos para cálculo de ROAS."
            icon={<Facebook className="h-5 w-5 text-blue-500" />}
            category="acquisition"
            status={getMetaStatus()}
            statusText={getMetaStatus() === 'warning' ? 'Token expirado' : undefined}
            onClick={() => setActiveProvider('meta')}
          />
        </div>
      </div>

      {/* Communication Providers */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          💬 Comunicação
        </h3>
        <div className="grid gap-4">
          <ProviderCard
            name="WhatsApp"
            description="Integração com WhatsApp Business para recuperação de vendas e atendimento."
            icon={<MessageCircle className="h-5 w-5 text-green-500" />}
            category="communication"
            status={getWhatsAppStatus()}
            onClick={() => setActiveProvider('whatsapp')}
          />
        </div>
      </div>

      {/* Ingestion Providers */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          📥 Ingestão
        </h3>
        <div className="grid gap-4">
          <ProviderCard
            name="Webhooks CRM"
            description="Receba leads e eventos de plataformas externas via webhooks personalizados."
            icon={<Webhook className="h-5 w-5 text-purple-500" />}
            category="ingestion"
            status={getWebhooksStatus()}
            onClick={() => setActiveProvider('webhooks')}
          />
        </div>
      </div>
    </div>
  );
}
