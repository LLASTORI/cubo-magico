/**
 * CRM - Página principal de análises
 * 
 * PROMPT 26: Jornada Canônica baseada em Orders Core
 * - CustomerJourneyOrders é a jornada PADRÃO
 * - CustomerJourneyAnalysis é LEGADO (aba secundária)
 * - useCRMJourneyData está marcado como LEGACY
 */
import { useState, lazy, Suspense } from 'react';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { CustomerJourneyOrders } from '@/components/crm/CustomerJourneyOrders';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2, Lock, TrendingUp, Route, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateContactDialog } from '@/components/crm/CreateContactDialog';
import { Skeleton } from '@/components/ui/skeleton';

// LEGACY: Componentes legados carregados sob demanda apenas quando necessário
const CustomerJourneyAnalysis = lazy(() => import('@/components/crm/CustomerJourneyAnalysis').then(m => ({ default: m.CustomerJourneyAnalysis })));
const AscensionAnalysis = lazy(() => import('@/components/crm/AscensionAnalysis').then(m => ({ default: m.AscensionAnalysis })));

const LegacyTabLoader = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-4">
      <AlertTriangle className="h-4 w-4" />
      <span className="text-sm">Carregando visualização legada...</span>
    </div>
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function CRM() {
  const { navigateTo } = useProjectNavigation();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading } = useProjectModules();
  // PROMPT 26: Tab padrão é 'orders' (Jornada Canônica)
  const [activeTab, setActiveTab] = useState('orders');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const crmEnabled = isModuleEnabled('crm');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="CRM - Análises" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Verificando permissões...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="CRM - Análises" />
      
      {!currentProject ? (
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                CRM - Análise de Jornada
              </CardTitle>
              <CardDescription>
                Selecione um projeto para visualizar a jornada dos clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Nenhum projeto selecionado. Use o seletor de projetos no cabeçalho para escolher um projeto.
              </p>
            </CardContent>
          </Card>
        </main>
      ) : !crmEnabled ? (
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="max-w-md cursor-help border-muted">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Users className="h-5 w-5" />
                      Módulo CRM
                    </CardTitle>
                    <CardDescription>
                      Este módulo não está habilitado para o seu projeto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Entre em contato com o suporte para ativar este recurso.
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Para ativar o módulo CRM, entre em contato com nosso suporte pelo email suporte@cubo.app ou WhatsApp.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </main>
      ) : (
        <>
          <CRMSubNav 
            showNewContact 
            onNewContact={() => setShowCreateDialog(true)}
          />
          
          <main className="container mx-auto px-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Análise de Clientes</h1>
              <p className="text-muted-foreground">
                Analise o comportamento de compra e ascensão dos seus clientes
              </p>
            </div>

            {/* PROMPT 26: Jornada Canônica (Orders Core) como padrão */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Jornada do Cliente
                </TabsTrigger>
                <TabsTrigger value="legacy-journey" className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  <span>Jornada (Legado)</span>
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                </TabsTrigger>
                <TabsTrigger value="ascension" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Análise de Ascensão
                </TabsTrigger>
              </TabsList>
              
              {/* Tab Padrão: Jornada Canônica baseada em Orders Core */}
              <TabsContent value="orders" className="mt-6">
                <CustomerJourneyOrders maxHeight="calc(100vh - 300px)" />
              </TabsContent>
              
              {/* LEGACY: Jornada baseada em crm_transactions - NÃO DISPARA POR PADRÃO */}
              <TabsContent value="legacy-journey" className="mt-6">
                {activeTab === 'legacy-journey' && (
                  <Suspense fallback={<LegacyTabLoader />}>
                    <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-600 dark:text-amber-500">
                            Visualização Legada
                          </p>
                          <p className="text-muted-foreground mt-1">
                            Esta visualização usa dados de <code className="text-xs bg-muted px-1 py-0.5 rounded">crm_transactions</code> (legado).
                            A aba "Jornada do Cliente" usa Orders Core (dados canônicos).
                          </p>
                        </div>
                      </div>
                    </div>
                    <CustomerJourneyAnalysis />
                  </Suspense>
                )}
              </TabsContent>
              
              {/* LEGACY: Análise de Ascensão - também usa dados legados */}
              <TabsContent value="ascension" className="mt-6">
                {activeTab === 'ascension' && (
                  <Suspense fallback={<LegacyTabLoader />}>
                    <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-600 dark:text-amber-500">
                            Visualização Legada
                          </p>
                          <p className="text-muted-foreground mt-1">
                            Esta análise usa dados legados. Será migrada para Orders Core em breve.
                          </p>
                        </div>
                      </div>
                    </div>
                    <AscensionAnalysis />
                  </Suspense>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </>
      )}

      <CreateContactDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(contactId) => {
          navigateTo(`/crm/contact/${contactId}`);
        }}
      />
    </div>
  );
}
