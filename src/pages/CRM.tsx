/**
 * CRM - Inteligência de Clientes
 * 
 * PROMPT 27: Reestruturação UX + Produto
 * 
 * 3 Perspectivas:
 * 1. Jornada (Canônica – Orders Core)
 * 2. Ascensão (Canônica – Orders Core via offer_mappings)
 * 3. Visão Legada (Avançado / Comparativo)
 * 
 * Ascensão foi RECLASSIFICADA como canônica (não legado).
 * Legado é apenas para comparação histórica.
 */
import { useState, lazy, Suspense } from 'react';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { CustomerJourneyOrders } from '@/components/crm/CustomerJourneyOrders';
import { AscensionAnalysis } from '@/components/crm/AscensionAnalysis';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2, Lock, TrendingUp, Route, AlertTriangle, ShoppingCart, Brain, BookOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateContactDialog } from '@/components/crm/CreateContactDialog';
import { Skeleton } from '@/components/ui/skeleton';

// LEGACY: Apenas o componente de jornada legada é carregado sob demanda
const CustomerJourneyAnalysis = lazy(() => import('@/components/crm/CustomerJourneyAnalysis').then(m => ({ default: m.CustomerJourneyAnalysis })));

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
  // PROMPT 27: Tab padrão é 'journey' (Jornada Canônica)
  const [activeTab, setActiveTab] = useState('journey');
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

            {/* PROMPT 27: Nova estrutura de 3 perspectivas */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                {/* TAB 1: Jornada Canônica */}
                <TabsTrigger value="journey" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Jornada
                </TabsTrigger>
                
                {/* TAB 2: Ascensão CANÔNICA (não mais legada) */}
                <TabsTrigger value="ascension" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ascensão
                </TabsTrigger>
                
                {/* TAB 3: Legado (secundário) */}
                <TabsTrigger value="legacy" className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>Visão Legada</span>
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                </TabsTrigger>
              </TabsList>
              
              {/* TAB 1: Jornada Canônica (Orders Core) */}
              <TabsContent value="journey" className="mt-2">
                <CustomerJourneyOrders maxHeight="calc(100vh - 320px)" />
              </TabsContent>
              
              {/* TAB 2: Análise de Ascensão - CANÔNICA (PROMPT 27: removido banner de legado) */}
              <TabsContent value="ascension" className="mt-2">
                <AscensionAnalysis />
              </TabsContent>
              
              {/* TAB 3: Jornada Legada - apenas para comparação */}
              <TabsContent value="legacy" className="mt-2">
                {activeTab === 'legacy' && (
                  <Suspense fallback={<LegacyTabLoader />}>
                    <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-amber-500/10">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base text-amber-600 dark:text-amber-500">
                              Visão Legada (Comparativo)
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Esta visualização usa dados de <code className="text-xs bg-muted px-1 py-0.5 rounded">crm_transactions</code> (sistema antigo).
                              Use apenas para comparação com dados históricos. Para análises oficiais, use as abas "Jornada" ou "Ascensão".
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
