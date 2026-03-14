// src/hooks/useProviderCSVImport.ts

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseHotmartCSV } from '@/lib/csv-parsers/hotmart';
import type { CSVPreview, ImportResult, NormalizedOrderGroup } from '@/types/csv-import';

const CHUNK_SIZE = 200;

export function useProviderCSVImport(projectId: string) {
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseHotmartCSV(text);
      setPreview(parsed);
      setResult(null);
    };
    reader.readAsText(file, 'UTF-8');
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

    for (let i = 0; i < chunks.length; i++) {
      const { data, error } = await supabase.functions.invoke('provider-csv-import', {
        body: { provider: 'hotmart', project_id: projectId, groups: chunks[i] },
      });

      if (error) {
        accumulated.errors.push(`Lote ${i + 1}: ${error.message}`);
      } else if (data) {
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

    setResult(accumulated);
    setImporting(false);
  }

  return { preview, importing, progress, result, handleFile, runImport };
}
