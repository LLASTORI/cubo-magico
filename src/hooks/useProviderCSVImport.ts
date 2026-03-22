import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseHotmartCSV } from '@/lib/csv-parsers/hotmart';
import type { CSVPreview, ImportResult, NormalizedOrderGroup } from '@/types/csv-import';

const CHUNK_SIZE = 200;

export interface ProductMatchResult {
  matched: number;
  total: number;
  ratio: number;           // 0-1
  projectHasHistory: boolean;
}

export function useProviderCSVImport(projectId: string) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [productMatch, setProductMatch] = useState<ProductMatchResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const parsed = parseHotmartCSV(text);
      setPreview(parsed);
      setResult(null);
      setProductMatch(null);

      if (parsed.total_groups > 0) {
        await validateProductMatch(parsed);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function validateProductMatch(parsed: CSVPreview) {
    // 1. Verificar se projeto tem histórico
    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const projectHasHistory = (orderCount ?? 0) > 0;

    // 2. Extrair product IDs únicos do CSV
    const csvProductIds = [
      ...new Set(
        parsed.groups.flatMap((g) => g.items.map((i) => i.provider_product_id))
      ),
    ];

    if (csvProductIds.length === 0) {
      setProductMatch({ matched: 0, total: 0, ratio: 0, projectHasHistory });
      return;
    }

    // 3. Verificar quais existem no projeto
    const { data: knownItems } = await supabase
      .from('order_items')
      .select('provider_product_id')
      .eq('project_id', projectId)
      .in('provider_product_id', csvProductIds);

    const knownIds = new Set((knownItems ?? []).map((i) => i.provider_product_id));
    const matched = csvProductIds.filter((id) => knownIds.has(id)).length;
    const ratio = csvProductIds.length > 0 ? matched / csvProductIds.length : 0;

    setProductMatch({ matched, total: csvProductIds.length, ratio, projectHasHistory });
  }

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    setProgress(0);

    const groups = preview.groups;
    const chunks: NormalizedOrderGroup[][] = [];
    for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
      chunks.push(groups.slice(i, i + CHUNK_SIZE));
    }

    const accumulated: ImportResult = {
      created: 0, complemented: 0, skipped: 0,
      contacts_created: 0, contacts_updated: 0, no_email: 0,
      errors: [], total_revenue_brl: 0,
      period_start: preview.period_start,
      period_end: preview.period_end,
    };

    let batchId: string | null = null;
    let hasNetworkError = false;

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;

      const body: Record<string, unknown> = {
        provider: 'hotmart',
        project_id: projectId,
        groups: chunks[i],
      };

      // Primeiro chunk: sem batch_id; enviar file_name
      if (i === 0) {
        if (fileName) body.file_name = fileName;
      } else {
        body.batch_id = batchId;
      }

      // Último chunk: fechar batch (só se não houve erro de rede antes e já temos batch_id)
      // Exceção: chunk único — batch_id só existe após a resposta; fechamento via chamada separada abaixo
      if (isLast && !hasNetworkError && batchId && chunks.length > 1) {
        body.is_last_chunk = true;
        body.accumulated_totals = {
          created: accumulated.created,
          complemented: accumulated.complemented,
          skipped: accumulated.skipped,
          errors: accumulated.errors.length,
          total_revenue_brl: accumulated.total_revenue_brl,
        };
      }

      const { data, error } = await supabase.functions.invoke('provider-csv-import', { body });

      if (error) {
        accumulated.errors.push(`Lote ${i + 1}: ${error.message}`);
        hasNetworkError = true;
      } else if (data) {
        // Capturar batch_id da resposta do primeiro chunk
        if (i === 0 && data.batch_id) {
          batchId = data.batch_id;
        }
        accumulated.created += data.created ?? 0;
        accumulated.complemented += data.complemented ?? 0;
        accumulated.skipped += data.skipped ?? 0;
        accumulated.contacts_created += data.contacts_created ?? 0;
        accumulated.contacts_updated += data.contacts_updated ?? 0;
        accumulated.no_email += data.no_email ?? 0;
        accumulated.total_revenue_brl += data.total_revenue_brl ?? 0;
        accumulated.errors.push(...(data.errors ?? []));
      }

      setProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    // Chunk único: batch_id só disponível após a resposta — fechar batch agora
    if (chunks.length === 1 && batchId && !hasNetworkError) {
      await supabase.functions.invoke('provider-csv-import', {
        body: {
          provider: 'hotmart',
          project_id: projectId,
          groups: [],
          batch_id: batchId,
          is_last_chunk: true,
          accumulated_totals: {
            created: accumulated.created,
            complemented: accumulated.complemented,
            skipped: accumulated.skipped,
            errors: accumulated.errors.length,
            total_revenue_brl: accumulated.total_revenue_brl,
          },
        },
      });
    }

    setResult(accumulated);
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['csv-import-batches', projectId] });
    // Invalidate all funnel/order queries so the UI reflects newly imported data
    queryClient.invalidateQueries({ queryKey: ['funnel-orders', projectId] });
    queryClient.invalidateQueries({ queryKey: ['item-revenue', projectId] });
  }

  return { preview, fileName, productMatch, importing, progress, result, handleFile, runImport };
}
