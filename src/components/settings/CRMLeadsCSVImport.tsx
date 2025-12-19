import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, X, Plus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ParsedLead {
  email: string;
  name?: string;
  phone?: string;
  phone_ddd?: string;
  document?: string;
  instagram?: string;
  tags?: string[];
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  cep?: string;
  custom_fields?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: number;
  errorDetails: string[];
}

export function CRMLeadsCSVImport() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Default tags
  const [defaultTags, setDefaultTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Default funnel
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  
  // Fetch funnels for selection
  const { data: funnels } = useQuery({
    queryKey: ['funnels', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('project_id', currentProject.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo CSV.',
        variant: 'destructive',
      });
      return;
    }
    
    setFile(selectedFile);
    setImportResult(null);
    await parseCSV(selectedFile);
  };

  const parseCSV = async (csvFile: File) => {
    setIsParsingFile(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: 'Arquivo vazio',
          description: 'O CSV precisa ter pelo menos um cabeçalho e uma linha de dados.',
          variant: 'destructive',
        });
        return;
      }
      
      // Parse header
      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
      
      // Find email column
      const emailIndex = headers.findIndex(h => 
        ['email', 'e-mail', 'e_mail', 'mail'].includes(h)
      );
      
      if (emailIndex === -1) {
        toast({
          title: 'Coluna de email não encontrada',
          description: 'O CSV precisa ter uma coluna "email".',
          variant: 'destructive',
        });
        return;
      }
      
      // Parse data rows
      const leads: ParsedLead[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;
        
        const lead: ParsedLead = { email: '' };
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          if (!value) return;
          
          // Map common field names
          const fieldMap: Record<string, string> = {
            'email': 'email', 'e-mail': 'email', 'e_mail': 'email', 'mail': 'email',
            'nome': 'name', 'name': 'name', 'nome_completo': 'name', 'full_name': 'name', 'firstname': 'name', 'first_name': 'name',
            'telefone': 'phone', 'phone': 'phone', 'celular': 'phone', 'whatsapp': 'phone',
            'ddd': 'phone_ddd', 'phone_ddd': 'phone_ddd',
            'cpf': 'document', 'cnpj': 'document', 'documento': 'document', 'document': 'document',
            'instagram': 'instagram', 'insta': 'instagram',
            'tags': 'tags', 'tag': 'tags',
            'utm_source': 'utm_source', 'utmsource': 'utm_source', 'source': 'utm_source',
            'utm_campaign': 'utm_campaign', 'utmcampaign': 'utm_campaign', 'campaign': 'utm_campaign',
            'utm_medium': 'utm_medium', 'utmmedium': 'utm_medium', 'medium': 'utm_medium',
            'utm_content': 'utm_content', 'utmcontent': 'utm_content',
            'utm_term': 'utm_term', 'utmterm': 'utm_term',
            'endereco': 'address', 'address': 'address',
            'cidade': 'city', 'city': 'city',
            'estado': 'state', 'state': 'state', 'uf': 'state',
            'pais': 'country', 'country': 'country',
            'cep': 'cep', 'zip': 'cep',
          };
          
          const mappedField = fieldMap[header] || header;
          
          if (mappedField === 'tags') {
            lead.tags = value.split(',').map(t => t.trim()).filter(Boolean);
          } else if (Object.values(fieldMap).includes(mappedField)) {
            (lead as any)[mappedField] = value;
          } else {
            // Store unmapped fields in custom_fields
            if (!lead.custom_fields) lead.custom_fields = {};
            lead.custom_fields[header] = value;
          }
        });
        
        // Validate email
        if (lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
          leads.push(lead);
        }
      }
      
      setParsedLeads(leads);
      
      if (leads.length === 0) {
        toast({
          title: 'Nenhum lead válido',
          description: 'Não foram encontrados leads com email válido no CSV.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: 'Erro ao processar CSV',
        description: 'Não foi possível ler o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (defaultTags.includes(newTag.trim())) return;
    setDefaultTags([...defaultTags, newTag.trim()]);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setDefaultTags(defaultTags.filter(t => t !== tag));
  };

  const handleImport = async () => {
    if (!currentProject?.id || parsedLeads.length === 0) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    const result: ImportResult = {
      total: parsedLeads.length,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: [],
    };
    
    // Get funnel name for tag if selected
    let funnelTag: string | null = null;
    if (selectedFunnelId) {
      const funnel = funnels?.find(f => f.id === selectedFunnelId);
      if (funnel) {
        funnelTag = `funil:${funnel.name}`;
      }
    }
    
    const batchSize = 50;
    const batches = Math.ceil(parsedLeads.length / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, parsedLeads.length);
      const batchLeads = parsedLeads.slice(start, end);
      
      for (const lead of batchLeads) {
        try {
          const email = lead.email.toLowerCase().trim();
          
          // Merge tags
          const leadTags = [
            ...defaultTags,
            ...(lead.tags || []),
            ...(funnelTag ? [funnelTag] : []),
          ].filter((tag, i, arr) => arr.indexOf(tag) === i);
          
          // Check if contact exists
          const { data: existing } = await supabase
            .from('crm_contacts')
            .select('id, tags')
            .eq('project_id', currentProject.id)
            .eq('email', email)
            .single();
          
          if (existing) {
            // Update existing contact
            const existingTags = existing.tags || [];
            const mergedTags = [...existingTags, ...leadTags]
              .filter((tag, i, arr) => arr.indexOf(tag) === i);
            
            const { error } = await supabase
              .from('crm_contacts')
              .update({
                name: lead.name || undefined,
                phone: lead.phone || undefined,
                phone_ddd: lead.phone_ddd || undefined,
                document: lead.document || undefined,
                instagram: lead.instagram || undefined,
                address: lead.address || undefined,
                city: lead.city || undefined,
                state: lead.state || undefined,
                country: lead.country || undefined,
                cep: lead.cep || undefined,
                tags: mergedTags.length > 0 ? mergedTags : undefined,
                custom_fields: lead.custom_fields ? JSON.parse(JSON.stringify(lead.custom_fields)) : undefined,
                last_activity_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
            
            if (error) throw error;
            result.updated++;
          } else {
            // Create new contact
            const { error } = await supabase
              .from('crm_contacts')
              .insert([{
                project_id: currentProject.id,
                email,
                name: lead.name || null,
                phone: lead.phone || null,
                phone_ddd: lead.phone_ddd || null,
                document: lead.document || null,
                instagram: lead.instagram || null,
                address: lead.address || null,
                city: lead.city || null,
                state: lead.state || null,
                country: lead.country || null,
                cep: lead.cep || null,
                source: 'csv_import',
                status: 'lead',
                tags: leadTags.length > 0 ? leadTags : null,
                first_utm_source: lead.utm_source || null,
                first_utm_campaign: lead.utm_campaign || null,
                first_utm_medium: lead.utm_medium || null,
                first_utm_content: lead.utm_content || null,
                first_utm_term: lead.utm_term || null,
                custom_fields: lead.custom_fields ? JSON.parse(JSON.stringify(lead.custom_fields)) : {},
              }]);
            
            if (error) throw error;
            result.created++;
          }
        } catch (error: any) {
          result.errors++;
          result.errorDetails.push(`${lead.email}: ${error.message}`);
        }
      }
      
      setImportProgress(Math.round((end / parsedLeads.length) * 100));
    }
    
    setImportResult(result);
    setIsImporting(false);
    
    toast({
      title: 'Importação concluída',
      description: `${result.created} criados, ${result.updated} atualizados, ${result.errors} erros.`,
    });
  };

  const handleReset = () => {
    setFile(null);
    setParsedLeads([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Leads via CSV
        </CardTitle>
        <CardDescription>
          Importe uma base de leads existente de uma vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File upload */}
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
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {file ? file.name : 'Clique para selecionar um arquivo CSV'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O arquivo deve ter uma coluna "email" obrigatória
              </p>
            </label>
          </div>
          
          {isParsingFile && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando arquivo...
            </div>
          )}
        </div>
        
        {/* Preview */}
        {parsedLeads.length > 0 && !importResult && (
          <>
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Preview: {parsedLeads.length} leads encontrados
              </h4>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
            
            <div className="border rounded-lg max-h-48 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedLeads.slice(0, 10).map((lead, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{lead.email}</TableCell>
                      <TableCell className="text-xs">{lead.name || '-'}</TableCell>
                      <TableCell className="text-xs">{lead.phone || '-'}</TableCell>
                      <TableCell className="text-xs">{lead.tags?.join(', ') || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedLeads.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ...e mais {parsedLeads.length - 10} leads
                </p>
              )}
            </div>
            
            {/* Default tags */}
            <div className="space-y-2">
              <Label>Tags Padrão (opcional)</Label>
              <p className="text-xs text-muted-foreground">
                Serão adicionadas a todos os leads importados
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {defaultTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Default funnel */}
            <div className="space-y-2">
              <Label>Funil Padrão (opcional)</Label>
              <p className="text-xs text-muted-foreground">
                Uma tag "funil:nome" será adicionada a todos os leads
              </p>
              <Select value={selectedFunnelId || "__none__"} onValueChange={(val) => setSelectedFunnelId(val === "__none__" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funil..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {funnels?.map(funnel => (
                    <SelectItem key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Import button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {parsedLeads.length} Leads
                  </>
                )}
              </Button>
            </div>
            
            {/* Progress */}
            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-xs text-muted-foreground text-center">
                  {importProgress}% concluído
                </p>
              </div>
            )}
          </>
        )}
        
        {/* Result */}
        {importResult && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Importação Concluída
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                  <p className="text-xs text-muted-foreground">Criados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            </div>
            
            {importResult.errors > 0 && (
              <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10">
                <h5 className="font-medium text-sm flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Erros ({importResult.errors})
                </h5>
                <div className="mt-2 max-h-32 overflow-auto">
                  {importResult.errorDetails.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{err}</p>
                  ))}
                  {importResult.errorDetails.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ...e mais {importResult.errorDetails.length - 10} erros
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <Button variant="outline" onClick={handleReset} className="w-full">
              Importar Outro Arquivo
            </Button>
          </div>
        )}
        
        {/* Help */}
        {!file && (
          <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
            <h5 className="font-medium text-sm">Formato do CSV</h5>
            <p className="text-xs text-muted-foreground">
              Coluna obrigatória: <code className="bg-background px-1 rounded">email</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Colunas opcionais: nome, telefone, ddd, documento, instagram, tags, utm_source, utm_campaign, cidade, estado, etc.
            </p>
            <p className="text-xs text-muted-foreground">
              Colunas não reconhecidas serão salvas em "campos personalizados".
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
