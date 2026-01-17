/**
 * CRM - Inteligência de Clientes
 * 
 * PROMPT 28: Nova estrutura com Visão Geral como primeira aba
 * 
 * 4 Perspectivas:
 * 1. Visão Geral (Macro, Executiva) - NOVA
 * 2. Jornada (Canônica – Orders Core)
 * 3. Ascensão (Canônica – Orders Core via offer_mappings)
 * 4. Avançado (Dados históricos para análise comparativa)
 * 
 * Não existe mais conceito de "legado" no produto final.
 * Todos os dados são tratados como canônicos.
 */
import { useState, lazy, Suspense } from 'react';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { CustomerIntelligenceOverview } from '@/components/crm/CustomerIntelligenceOverview';
import { CustomerJourneyOrders } from '@/components/crm/CustomerJourneyOrders';
import { AscensionAnalysis } from '@/components/crm/AscensionAnalysis';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2, Lock, TrendingUp, ShoppingCart, Brain, LayoutDashboard, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateContactDialog } from '@/components/crm/CreateContactDialog';
import { Skeleton } from '@/components/ui/skeleton';

// Avançado: Componente de jornada histórica carregado sob demanda
const CustomerJourneyAnalysis = lazy(() => import('@/components/crm/CustomerJourneyAnalysis').then(m => ({ default: m.CustomerJourneyAnalysis })));

const AdvancedTabLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function CRM() {
  const { navigateTo } = useProjectNavigation();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading } = useProjectModules();
  // PROMPT 28: Tab padrão é 'overview' (Visão Geral)
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const crmEnabled = isModuleEnabled('crm');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Inteligência de Clientes" />
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
      <AppHeader pageSubtitle="Inteligência de Clientes" />
      
      {!currentProject ? (
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Inteligência de Clientes
              </CardTitle>
              <CardDescription>
                Selecione um projeto para visualizar insights de clientes
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
            {/* PROMPT 27: Novo header "Inteligência de Clientes" */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Inteligência de Clientes</h1>
              </div>
              <p className="text-muted-foreground">
                Entenda a jornada de compra, comportamento de ascensão e valor dos seus clientes
              </p>
            </div>

            {/* PROMPT 28: Nova estrutura de 4 perspectivas */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                {/* TAB 1: Visão Geral (NOVA - PROMPT 28) */}
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Visão Geral
                </TabsTrigger>
                
                {/* TAB 2: Jornada Canônica */}
                <TabsTrigger value="journey" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Jornada
                </TabsTrigger>
                
                {/* TAB 3: Ascensão Canônica */}
                <TabsTrigger value="ascension" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ascensão
                </TabsTrigger>
                
                {/* TAB 4: Avançado (dados históricos) */}
                <TabsTrigger value="advanced" className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  Avançado
                </TabsTrigger>
              </TabsList>
              
              {/* TAB 1: Visão Geral (Macro, Executiva) */}
              <TabsContent value="overview" className="mt-2">
                <CustomerIntelligenceOverview />
              </TabsContent>
              
              {/* TAB 2: Jornada Canônica (Orders Core) */}
              <TabsContent value="journey" className="mt-2">
                <CustomerJourneyOrders maxHeight="calc(100vh - 320px)" />
              </TabsContent>
              
              {/* TAB 3: Análise de Ascensão Canônica */}
              <TabsContent value="ascension" className="mt-2">
                <AscensionAnalysis />
              </TabsContent>
              
              {/* TAB 4: Dados Históricos (para análise comparativa) */}
              <TabsContent value="advanced" className="mt-2">
                {activeTab === 'advanced' && (
                  <Suspense fallback={<AdvancedTabLoader />}>
                    <Card className="mb-4 border-muted">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Layers className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              Análise Avançada
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Visualização baseada em dados históricos de transações. 
                              Use para análises comparativas e investigação detalhada.
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    <CustomerJourneyAnalysis />
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
