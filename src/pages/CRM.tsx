import { useState } from 'react';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { CustomerJourneyAnalysis } from '@/components/crm/CustomerJourneyAnalysis';
import { AscensionAnalysis } from '@/components/crm/AscensionAnalysis';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2, Lock, TrendingUp, Route } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateContactDialog } from '@/components/crm/CreateContactDialog';

export default function CRM() {
  const { navigateTo } = useProjectNavigation();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading } = useProjectModules();
  const [activeTab, setActiveTab] = useState('journey');
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

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="journey" className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Jornada do Cliente
                </TabsTrigger>
                <TabsTrigger value="ascension" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Análise de Ascensão
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="journey" className="mt-6">
                <CustomerJourneyAnalysis />
              </TabsContent>
              
              <TabsContent value="ascension" className="mt-6">
                <AscensionAnalysis />
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
