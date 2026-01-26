/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VENDAS → HISTÓRICO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PROPÓSITO:
 * - Importação histórica de vendas (antes da ativação do webhook)
 * - Visualização de pedidos históricos
 * - Contingência excepcional
 * - Auditoria / Reconciliação
 * 
 * CONTRATO ARQUITETURAL:
 * - CSV NUNCA cria ledger_events
 * - CSV NUNCA sobrescreve dados de webhook
 * - CSV NUNCA atualiza transações já existentes
 * - Hierarquia: Webhook (1º) > API (2º) > CSV (3º)
 * 
 * CAMADAS:
 * - sales_history_orders: Pedidos históricos para visualização (Camada 3)
 * - ledger_official: Reconciliação financeira (Auditoria)
 * 
 * STATUS: ATIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  History, 
  AlertTriangle, 
  Webhook, 
  FileSpreadsheet,
  ShoppingBag,
  Scale,
  Info
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useTenantNavigation } from "@/navigation";
import { Button } from "@/components/ui/button";
import { SalesHistoryCSVImport } from "@/components/sales/SalesHistoryCSVImport";
import { SalesHistoryOrdersTable } from "@/components/sales/SalesHistoryOrdersTable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SalesHistory = () => {
  const { currentProject } = useProject();
  const { navigateTo } = useTenantNavigation();
  const [activeTab, setActiveTab] = useState<'orders' | 'import'>('orders');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-muted">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Histórico de Vendas
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                Histórico
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-5 w-5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      Dados históricos importados via CSV. Não interferem em vendas atuais, 
                      métricas ou financeiro em tempo real.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h1>
            <p className="text-sm text-muted-foreground">
              Visualização e importação de dados históricos
            </p>
          </div>
        </div>

        {!currentProject ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Selecione um projeto para continuar</p>
              <Button onClick={() => navigateTo('/projects')}>Gerenciar Projetos</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Primary Info */}
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                <strong>ℹ️ Área de Histórico</strong> — Dados importados via CSV para análise e auditoria. 
                O webhook é a fonte primária para vendas operacionais.
              </AlertDescription>
            </Alert>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'orders' | 'import')}>
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Pedidos Históricos
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-6">
                <SalesHistoryOrdersTable />
              </TabsContent>

              <TabsContent value="import" className="mt-6 space-y-6">
                {/* Information Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Webhook Priority */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Webhook className="h-5 w-5 text-emerald-500" />
                        Webhook (Fonte Primária)
                      </CardTitle>
                      <CardDescription>
                        Dados financeiros em tempo real com integridade total
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>✓ Ledger events criados automaticamente</li>
                        <li>✓ Order items com composição correta</li>
                        <li>✓ Métricas financeiras precisas</li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* CSV Usage */}
                  <Card className="border-muted">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
                        <FileSpreadsheet className="h-5 w-5" />
                        CSV (Histórico / Contingência)
                      </CardTitle>
                      <CardDescription>
                        Apenas para dados anteriores à ativação do webhook
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>✗ Não cria ledger events</li>
                        <li>✗ Não sobrescreve dados existentes</li>
                        <li>✗ Não substitui o webhook</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* CSV Import Component */}
                <SalesHistoryCSVImport defaultOpen={true} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default SalesHistory;
