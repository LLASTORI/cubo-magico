import { useState, useRef } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  X,
  Info,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useSurveys } from '@/hooks/useSurveys';

interface ParsedRow {
  email: string;
  [key: string]: string;
}

interface ColumnMapping {
  csvColumn: string;
  questionId: string | null;
}

interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
}

export const SurveyCSVImport = () => {
  const { currentProject } = useProject();
  const { surveys } = useSurveys();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<any[]>([]);

  const projectId = currentProject?.id;
  const activeSurveys = surveys?.filter(s => s.status === 'active') || [];

  const parseCSV = (content: string): { headers: string[]; rows: string[][] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow);

    return { headers, rows };
  };

  const handleSurveySelect = async (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    
    // Load questions for selected survey
    const { data: questions } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('position');
    
    setSurveyQuestions(questions || []);
    
    // Reset mappings
    if (headers.length > 0) {
      autoMapColumns(headers, questions || []);
    }
  };

  const autoMapColumns = (csvHeaders: string[], questions: any[]) => {
    const mappings: ColumnMapping[] = csvHeaders.map(header => {
      const lowerHeader = header.toLowerCase().trim();
      
      // Check for email column
      if (lowerHeader === 'email' || lowerHeader === 'e-mail') {
        return { csvColumn: header, questionId: '__email__' };
      }
      
      // Try to match with question text
      const matchedQuestion = questions.find(q => 
        q.question_text.toLowerCase().includes(lowerHeader) ||
        lowerHeader.includes(q.question_text.toLowerCase().substring(0, 20))
      );
      
      return { 
        csvColumn: header, 
        questionId: matchedQuestion?.id || null 
      };
    });
    
    setColumnMappings(mappings);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData([]);
    setImportResult(null);
    setParseError(null);

    try {
      const content = await selectedFile.text();
      const { headers: csvHeaders, rows } = parseCSV(content);

      if (csvHeaders.length === 0 || rows.length === 0) {
        setParseError('Arquivo CSV vazio ou inválido.');
        return;
      }

      // Check for email column
      const hasEmail = csvHeaders.some(h => 
        h.toLowerCase() === 'email' || h.toLowerCase() === 'e-mail'
      );
      
      if (!hasEmail) {
        setParseError('Coluna "email" é obrigatória no CSV.');
        return;
      }

      setHeaders(csvHeaders);

      // Parse rows
      const parsed: ParsedRow[] = rows
        .filter(row => row.some(cell => cell.trim()))
        .map(row => {
          const obj: ParsedRow = { email: '' };
          csvHeaders.forEach((header, index) => {
            obj[header] = row[index] || '';
            if (header.toLowerCase() === 'email' || header.toLowerCase() === 'e-mail') {
              obj.email = row[index] || '';
            }
          });
          return obj;
        })
        .filter(row => row.email);

      if (parsed.length === 0) {
        setParseError('Nenhuma linha válida encontrada (verifique se há emails).');
        return;
      }

      setParsedData(parsed);
      
      if (surveyQuestions.length > 0) {
        autoMapColumns(csvHeaders, surveyQuestions);
      }

      toast.success(`${parsed.length} respostas encontradas no arquivo`);
    } catch (error: any) {
      console.error('CSV parse error:', error);
      setParseError(`Erro ao processar arquivo: ${error.message}`);
    }
  };

  const updateMapping = (csvColumn: string, questionId: string | null) => {
    setColumnMappings(prev => 
      prev.map(m => m.csvColumn === csvColumn ? { ...m, questionId } : m)
    );
  };

  const handleImport = async () => {
    if (!projectId || !selectedSurveyId || parsedData.length === 0) return;

    setImporting(true);
    setProgress(0);
    setProgressMessage('Iniciando importação...');
    setImportResult(null);

    const result: ImportResult = {
      imported: 0,
      updated: 0,
      errors: [],
    };

    try {
      const batchSize = 25;
      const batches: ParsedRow[][] = [];
      
      for (let i = 0; i < parsedData.length; i += batchSize) {
        batches.push(parsedData.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const progressPercent = Math.round(((batchIndex + 1) / batches.length) * 100);
        setProgress(progressPercent);
        setProgressMessage(`Processando lote ${batchIndex + 1} de ${batches.length}...`);

        for (const row of batch) {
          try {
            // Build answers object
            const answers: Record<string, any> = {};
            columnMappings.forEach(mapping => {
              if (mapping.questionId && mapping.questionId !== '__email__') {
                const question = surveyQuestions.find(q => q.id === mapping.questionId);
                if (question) {
                  answers[mapping.questionId] = {
                    value: row[mapping.csvColumn],
                    question_text: question.question_text,
                    question_type: question.question_type,
                  };
                }
              }
            });

            // Find or create contact
            let contactId: string | null = null;
            const { data: existingContact } = await supabase
              .from('crm_contacts')
              .select('id')
              .eq('project_id', projectId)
              .eq('email', row.email.toLowerCase().trim())
              .maybeSingle();

            if (existingContact) {
              contactId = existingContact.id;
            } else {
              const { data: newContact, error: createError } = await supabase
                .from('crm_contacts')
                .insert({
                  project_id: projectId,
                  email: row.email.toLowerCase().trim(),
                  source: 'survey_csv',
                })
                .select('id')
                .single();

              if (createError) throw createError;
              contactId = newContact.id;
            }

            // Check for existing response
            const { data: existingResponse } = await supabase
              .from('survey_responses')
              .select('id')
              .eq('survey_id', selectedSurveyId)
              .eq('email', row.email.toLowerCase().trim())
              .maybeSingle();

            if (existingResponse) {
              // Update existing response
              await supabase
                .from('survey_responses')
                .update({
                  answers,
                  contact_id: contactId,
                  source: 'csv_import',
                })
                .eq('id', existingResponse.id);
              
              result.updated++;
            } else {
              // Create new response
              await supabase
                .from('survey_responses')
                .insert({
                  survey_id: selectedSurveyId,
                  project_id: projectId,
                  contact_id: contactId,
                  email: row.email.toLowerCase().trim(),
                  answers,
                  source: 'csv_import',
                });
              
              result.imported++;
            }

            // Process identity fields
            const identityQuestions = surveyQuestions.filter(q => 
              q.question_type === 'identity_field' && q.identity_field_target
            );

            for (const question of identityQuestions) {
              const mapping = columnMappings.find(m => m.questionId === question.id);
              if (mapping && row[mapping.csvColumn] && contactId) {
                const fieldValue = row[mapping.csvColumn].trim();
                const fieldName = question.identity_field_target;

                // Update contact field
                const updateData: Record<string, string> = {};
                if (fieldName === 'name') updateData.name = fieldValue;
                if (fieldName === 'phone') updateData.phone = fieldValue;
                if (fieldName === 'instagram') updateData.instagram = fieldValue;

                if (Object.keys(updateData).length > 0) {
                  await supabase
                    .from('crm_contacts')
                    .update(updateData)
                    .eq('id', contactId);
                }

                // Record identity event
                await supabase
                  .from('contact_identity_events')
                  .insert({
                    contact_id: contactId,
                    project_id: projectId,
                    field_name: fieldName,
                    field_value: fieldValue,
                    source_type: 'csv_import',
                    source_id: selectedSurveyId,
                    source_name: 'CSV Import - Pesquisa',
                    confidence_score: question.identity_confidence_weight || 1.0,
                    is_declared: true,
                  });
              }
            }
          } catch (error: any) {
            result.errors.push(`Erro no email ${row.email}: ${error.message}`);
          }
        }
      }

      setImportResult(result);
      
      if (result.errors.length === 0) {
        toast.success(`Importação concluída: ${result.imported} novas, ${result.updated} atualizadas`);
      } else {
        toast.warning(`Importação concluída com ${result.errors.length} erros`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      result.errors.push(`Erro geral: ${error.message}`);
      setImportResult(result);
      toast.error('Erro durante a importação');
    } finally {
      setImporting(false);
      setProgress(100);
      setProgressMessage('Concluído');
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setColumnMappings([]);
    setImportResult(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const mappedCount = columnMappings.filter(m => m.questionId).length;
  const hasEmailMapping = columnMappings.some(m => m.questionId === '__email__');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Respostas via CSV
          </CardTitle>
          <CardDescription>
            Importe respostas de pesquisas a partir de um arquivo CSV. O email é obrigatório para identificar contatos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Survey Selection */}
          <div className="space-y-2">
            <Label>Pesquisa de destino</Label>
            <Select value={selectedSurveyId} onValueChange={handleSurveySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma pesquisa ativa" />
              </SelectTrigger>
              <SelectContent>
                {activeSurveys.map(survey => (
                  <SelectItem key={survey.id} value={survey.id}>
                    {survey.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          {selectedSurveyId && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                
                {!file ? (
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Clique para selecionar ou arraste um arquivo CSV
                    </p>
                    <Button variant="secondary" size="sm" asChild>
                      <span>Selecionar Arquivo</span>
                    </Button>
                  </label>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {parsedData.length} respostas encontradas
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={resetImport}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro no arquivo</AlertTitle>
                  <AlertDescription className="whitespace-pre-line">
                    {parseError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Column Mapping */}
          {parsedData.length > 0 && surveyQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Mapeamento de Colunas</h3>
                <Badge variant="outline">
                  {mappedCount} de {headers.length} mapeadas
                </Badge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coluna do CSV</TableHead>
                      <TableHead>Pergunta da Pesquisa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columnMappings.map((mapping, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {mapping.csvColumn}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.questionId || 'none'}
                            onValueChange={(value) => 
                              updateMapping(mapping.csvColumn, value === 'none' ? null : value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Não mapeada" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Não mapeada</SelectItem>
                              <SelectItem value="__email__">
                                📧 Email (identificação)
                              </SelectItem>
                              {surveyQuestions.map(q => (
                                <SelectItem key={q.id} value={q.id}>
                                  {q.question_type === 'identity_field' && '🆔 '}
                                  {q.question_text.substring(0, 50)}
                                  {q.question_text.length > 50 ? '...' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <h3 className="font-medium">Preview (primeiras 5 linhas)</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.slice(0, 5).map((h, i) => (
                          <TableHead key={i} className="whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {headers.slice(0, 5).map((h, j) => (
                            <TableCell key={j} className="max-w-[200px] truncate">
                              {row[h]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{progressMessage}</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.errors.length > 0 ? 'destructive' : 'default'}>
              {importResult.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>Resultado da Importação</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  <li>✅ {importResult.imported} novas respostas importadas</li>
                  <li>🔄 {importResult.updated} respostas atualizadas</li>
                  {importResult.errors.length > 0 && (
                    <li>❌ {importResult.errors.length} erros</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {parsedData.length > 0 && !importing && (
            <div className="flex gap-3">
              <Button
                onClick={handleImport}
                disabled={!hasEmailMapping || importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar {parsedData.length} Respostas
              </Button>
              <Button variant="outline" onClick={resetImport}>
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Formato do CSV</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• A coluna <strong>email</strong> é obrigatória</li>
            <li>• Use vírgula ou ponto-e-vírgula como separador</li>
            <li>• Perguntas do tipo "Identidade" atualizam automaticamente o contato</li>
            <li>• Contatos existentes serão identificados e atualizados pelo email</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};
