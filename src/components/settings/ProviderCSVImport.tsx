// src/components/settings/ProviderCSVImport.tsx

import { useRef, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useProviderCSVImport } from '@/hooks/useProviderCSVImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatMoney } from '@/utils/formatMoney';

interface Props {
  projectId: string;
}

export function ProviderCSVImport({ projectId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { currentProject } = useProject();
  const { preview, productMatch, importing, progress, result, handleFile, runImport } =
    useProviderCSVImport(projectId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const projectName = currentProject?.name ?? 'este projeto';
  const showZeroMatchWarning =
    productMatch && productMatch.ratio === 0 && productMatch.projectHasHistory;

  function handleImportClick() {
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
    await runImport();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Importar Histórico de Vendas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Use o <strong>Modelo Detalhado de Vendas</strong> exportado da Hotmart (arquivo .CSV).
          Vendas já existentes via webhook não serão alteradas.
        </p>
      </div>

      {/* Upload */}
      {!result && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Clique para selecionar o CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Modelo Detalhado de Vendas — Hotmart</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </CardContent>
        </Card>
      )}

      {/* Erros de parse */}
      {preview && preview.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="text-xs space-y-1 mt-1">
              {preview.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {preview.errors.length > 5 && <li>...e mais {preview.errors.length - 5} avisos</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Aviso de projeto errado */}
      {showZeroMatchWarning && (
        <Alert className="border-orange-500/50 bg-orange-500/5">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            <strong>Nenhum produto do CSV foi encontrado no histórico deste projeto.</strong>{' '}
            Verifique se está no projeto correto antes de importar.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview && preview.total_groups > 0 && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Preview
              {/* Badge de validação cruzada */}
              {productMatch && (
                <Badge
                  variant="outline"
                  className={
                    productMatch.ratio >= 0.5
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : productMatch.ratio > 0
                      ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                      : productMatch.projectHasHistory
                      ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                      : 'bg-muted/50 text-muted-foreground'
                  }
                >
                  {productMatch.projectHasHistory
                    ? `${productMatch.matched} de ${productMatch.total} produtos reconhecidos`
                    : 'Projeto novo — sem histórico para comparar'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Pedidos detectados</p>
                <p className="font-semibold text-lg">{preview.total_groups}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Itens (com bumps)</p>
                <p className="font-semibold text-lg">{preview.total_items}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Receita líquida</p>
                <p className="font-semibold text-lg">{formatMoney(preview.total_revenue_brl, 'BRL')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Período</p>
                <p className="font-semibold text-sm">
                  {preview.period_start ? new Date(preview.period_start).toLocaleDateString('pt-BR') : '—'}
                  {' → '}
                  {preview.period_end ? new Date(preview.period_end).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </div>

            {importing ? (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">{progress}% processado</p>
              </div>
            ) : (
              <Button
                onClick={handleImportClick}
                className="w-full"
                variant={showZeroMatchWarning ? 'outline' : 'default'}
              >
                Importar {preview.total_groups} pedidos
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a importar dados no projeto:
                </p>
                <p className="text-xl font-bold text-foreground">{projectName}</p>
                <p className="text-sm text-muted-foreground">
                  {preview?.total_groups} pedidos · {preview?.total_items} itens ·{' '}
                  {formatMoney(preview?.total_revenue_brl ?? 0, 'BRL')} receita líquida
                </p>
                {showZeroMatchWarning && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum produto do CSV foi reconhecido neste projeto. Confirme que está no projeto correto.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-muted-foreground">
                  A importação pode ser desfeita posteriormente em "Histórico de importações".
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirmar importação em {projectName}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resultado */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{result.created} criados</Badge>
                <span className="text-muted-foreground">do zero</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">{result.complemented} compl.</Badge>
                <span className="text-muted-foreground">complementados</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{result.skipped} ignorados</Badge>
                <span className="text-muted-foreground">(webhook)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">{result.contacts_created + result.contacts_updated} contatos</Badge>
                <span className="text-muted-foreground">CRM</span>
              </div>
              {result.no_email > 0 && (
                <div className="flex items-center gap-2 col-span-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{result.no_email} sem email</Badge>
                  <span className="text-muted-foreground">sem vínculo CRM</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Receita importada</p>
              <p className="font-semibold text-lg">{formatMoney(result.total_revenue_brl, 'BRL')}</p>
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">{result.errors.length} erro(s):</p>
                  <ul className="text-xs space-y-1">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 10 && <li>...e mais {result.errors.length - 10}</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nova importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
