import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useProjectModules } from '@/hooks/useProjectModules';
import { ShoppingCart, Lock, ArrowLeft } from 'lucide-react';

import { HotmartWebhookStatus } from './HotmartWebhookStatus';
import { HotmartWebhookSection } from './HotmartWebhookSection';
import { HotmartAPISection } from './HotmartAPISection';
import { HotmartBackfillSection } from './HotmartBackfillSection';
import { ProviderCSVImport } from '../ProviderCSVImport';

interface HotmartProviderSettingsProps {
  onBack: () => void;
}

export function HotmartProviderSettings({ onBack }: HotmartProviderSettingsProps) {
  const { currentProject } = useProject();
  const { isModuleEnabled } = useProjectModules();
  const isHotmartEnabled = isModuleEnabled('hotmart');
  const projectId = currentProject?.id;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <ShoppingCart className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Provider: Hotmart
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                💰 Financeiro
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Integração com a plataforma Hotmart para vendas e dados financeiros
            </p>
          </div>
        </div>
      </div>

      {!currentProject ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Selecione um projeto primeiro para configurar o Hotmart.
            </p>
          </CardContent>
        </Card>
      ) : !isHotmartEnabled ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <p className="text-sm">
                O módulo Hotmart está desativado para este projeto. Entre em contato com o administrador para ativá-lo.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : projectId ? (
        <div className="space-y-6">
          {/* Status Operacional - ALWAYS AT TOP */}
          <HotmartWebhookStatus projectId={projectId} />

          {/* Webhook Section - PRIMARY/MANDATORY */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração do Webhook</CardTitle>
              <CardDescription>
                O webhook é a única fonte de dados para integridade financeira
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HotmartWebhookSection projectId={projectId} />
            </CardContent>
          </Card>

          {/* Advanced Sections - API + Backfill unified */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">Configurações Avançadas</CardTitle>
              <CardDescription>
                API Hotmart para importação e sincronização de ofertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Section with integrated OAuth */}
              <HotmartAPISection projectId={projectId} />

              <Separator />

              {/* Backfill Section */}
              <HotmartBackfillSection projectId={projectId} />
            </CardContent>
          </Card>

          {/* CSV Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">Importar Histórico de Vendas</CardTitle>
              <CardDescription>
                Importe vendas anteriores ao webhook via CSV exportado da Hotmart
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProviderCSVImport projectId={projectId} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
