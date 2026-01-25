/**
 * SALES HISTORY CSV IMPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CONTRATO ARQUITETURAL (NÃO NEGOCIÁVEL):
 * 
 * 1. CSV é APENAS para importação histórica e contingência excepcional
 * 2. CSV NUNCA cria ledger_events
 * 3. CSV NUNCA sobrescreve dados de webhook
 * 4. CSV NUNCA atualiza transações já existentes
 * 5. Hierarquia: Webhook (1º) > API (2º) > CSV (3º)
 * 
 * FINALIDADE:
 * - Backfill histórico antes da ativação do webhook
 * - Recuperação excepcional de dados
 * - Auditoria/reconciliação (ledger_official)
 * 
 * ESTE COMPONENTE NÃO PERTENCE À TELA DE PROVIDERS.
 * Ele vive no domínio de VENDAS (/vendas, BuscaRapida).
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  History, 
  ChevronDown, 
  AlertTriangle, 
  FileSpreadsheet,
  Upload
} from 'lucide-react';

// Lazy import the actual CSV components to keep bundle size down
import { HotmartCSVImport } from '@/components/settings/HotmartCSVImport';
import { HotmartLedgerCSVImport } from '@/components/settings/HotmartLedgerCSVImport';

interface SalesHistoryCSVImportProps {
  defaultOpen?: boolean;
}

export function SalesHistoryCSVImport({ defaultOpen = false }: SalesHistoryCSVImportProps) {
  const { currentProject } = useProject();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeImport, setActiveImport] = useState<'none' | 'contacts' | 'ledger'>('none');

  if (!currentProject) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-muted">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <History className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Importar Histórico de Vendas
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                      Contingência
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Importação de dados históricos e auditoria (uso excepcional)
                  </CardDescription>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Warning Banner - ALWAYS VISIBLE */}
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                <strong className="block mb-1">⚠️ Importação de Histórico</strong>
                <p>Esta função é apenas para dados passados e contingência excepcional.</p>
                <ul className="list-disc list-inside mt-2 space-y-0.5">
                  <li>Transações já existentes via webhook serão <strong>ignoradas</strong></li>
                  <li>CSV <strong>não cria</strong> eventos financeiros no Ledger</li>
                  <li>CSV <strong>não substitui</strong> o webhook como fonte de dados</li>
                  <li>O webhook é <strong>obrigatório</strong> para dados financeiros completos</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Import Type Selection */}
            {activeImport === 'none' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveImport('contacts')}
                >
                  <Upload className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Atualizar Contatos</p>
                    <p className="text-xs text-muted-foreground">
                      Enriquecer dados de contatos via CSV Hotmart
                    </p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveImport('ledger')}
                >
                  <FileSpreadsheet className="h-5 w-5" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Reconciliação Financeira</p>
                    <p className="text-xs text-muted-foreground">
                      Importar para ledger_official (auditoria)
                    </p>
                  </div>
                </Button>
              </div>
            )}

            {/* Contact Update Import */}
            {activeImport === 'contacts' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Atualização de Contatos</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setActiveImport('none')}
                  >
                    ← Voltar
                  </Button>
                </div>
                <HotmartCSVImport />
              </div>
            )}

            {/* Ledger Reconciliation Import */}
            {activeImport === 'ledger' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Reconciliação Financeira</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setActiveImport('none')}
                  >
                    ← Voltar
                  </Button>
                </div>
                <HotmartLedgerCSVImport />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
