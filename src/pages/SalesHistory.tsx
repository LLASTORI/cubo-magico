/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VENDAS → HISTÓRICO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PROPÓSITO:
 * - Importação histórica de vendas (antes da ativação do webhook)
 * - Contingência excepcional
 * - Auditoria / Reconciliação
 * 
 * CONTRATO ARQUITETURAL:
 * - CSV NUNCA cria ledger_events
 * - CSV NUNCA sobrescreve dados de webhook
 * - CSV NUNCA atualiza transações já existentes
 * - Hierarquia: Webhook (1º) > API (2º) > CSV (3º)
 * 
 * STATUS: ATIVO - Descongelado após auditoria completa
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { History, AlertTriangle, Webhook, FileSpreadsheet } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useTenantNavigation } from "@/navigation";
import { Button } from "@/components/ui/button";
import { SalesHistoryCSVImport } from "@/components/sales/SalesHistoryCSVImport";

const SalesHistory = () => {
  const { currentProject } = useProject();
  const { navigateTo } = useTenantNavigation();

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
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                Contingência
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Importação de dados históricos e auditoria
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
            {/* Primary Warning */}
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <strong className="block mb-2">⚠️ Esta área é destinada à importação de histórico de vendas ou contingência.</strong>
                <p>O webhook é a fonte primária de dados financeiros. Transações existentes serão ignoradas.</p>
              </AlertDescription>
            </Alert>

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

            {/* CSV Import Component - DESCONGELADO */}
            <SalesHistoryCSVImport defaultOpen={false} />
          </div>
        )}
      </main>
    </div>
  );
};

export default SalesHistory;
