/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VENDAS → IMPORTAR HISTÓRICO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PROPÓSITO:
 * - Importação única de histórico via CSV Hotmart
 * - CSV é tratado como replay de webhook (backfill canônico)
 * - Após importação, pedidos aparecem em Vendas → Pedidos
 * 
 * CONTRATO ARQUITETURAL:
 * - CSV escreve em orders, order_items, ledger_events
 * - CSV NUNCA sobrescreve dados de webhook
 * - Hierarquia: Webhook (1º) > API (2º) > CSV (3º)
 * 
 * STATUS: ATIVO
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Info,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useTenantNavigation } from "@/navigation";
import { Button } from "@/components/ui/button";
import { HotmartUnifiedCSVImport } from "@/components/sales/HotmartUnifiedCSVImport";

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
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Importar Histórico
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                Uso Único
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Importe vendas anteriores ao webhook para unificar seu histórico
            </p>
          </div>
        </div>

        {!currentProject ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Selecione um projeto para continuar</p>
              <Button onClick={() => navigateTo('/projects')}>Gerenciar Projetos</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Info Card */}
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Como funciona a importação?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Pedidos Unificados</p>
                      <p className="text-xs text-muted-foreground">
                        CSV preenche vendas antigas que aparecem junto com as atuais
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">CRM Enriquecido</p>
                      <p className="text-xs text-muted-foreground">
                        Contatos são criados ou atualizados automaticamente
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Auditoria Financeira</p>
                      <p className="text-xs text-muted-foreground">
                        Eventos financeiros são registrados para conciliação
                      </p>
                    </div>
                  </div>
                </div>

                <Alert className="border-muted bg-muted/30">
                  <AlertDescription className="text-xs text-muted-foreground flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Após importar, acesse <strong>Vendas → Pedidos</strong> para ver todos os pedidos unificados.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* CSV Import Component */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Importar CSV da Hotmart</CardTitle>
                <CardDescription>
                  Exporte seu histórico completo da Hotmart e importe aqui. 
                  Pedidos já existentes serão ignorados automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HotmartUnifiedCSVImport />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default SalesHistory;
