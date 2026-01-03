import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Play, Copy, ArrowRight, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Field aliases - same as in the edge function
const FIELD_ALIASES: Record<string, string> = {
  // Name variations
  'nome': 'name',
  'nome_completo': 'name',
  'full_name': 'name',
  'fullname': 'name',
  'first_name': 'first_name',
  'firstname': 'first_name',
  'primeiro_nome': 'first_name',
  'last_name': 'last_name',
  'lastname': 'last_name',
  'sobrenome': 'last_name',
  'surname': 'last_name',
  'segundo_nome': 'last_name',
  
  // Email variations
  'e-mail': 'email',
  'e_mail': 'email',
  'mail': 'email',
  'email_address': 'email',
  
  // Phone variations
  'telefone': 'phone',
  'celular': 'phone',
  'whatsapp': 'phone',
  'mobile': 'phone',
  'phone_number': 'phone',
  'tel': 'phone',
  'fone': 'phone',
  'ddd': 'phone_ddd',
  'area_code': 'phone_ddd',
  
  // Document variations
  'cpf': 'document',
  'cnpj': 'document',
  'cpf_cnpj': 'document',
  'documento': 'document',
  
  // Instagram variations
  'insta': 'instagram',
  'ig': 'instagram',
  
  // UTM variations (standard)
  'source': 'utm_source',
  'origem': 'utm_source',
  'campaign': 'utm_campaign',
  'campanha': 'utm_campaign',
  'medium': 'utm_medium',
  'midia': 'utm_medium',
  'content': 'utm_content',
  'conteudo': 'utm_content',
  'term': 'utm_term',
  'termo': 'utm_term',
  'adset': 'utm_adset',
  'conjunto': 'utm_adset',
  'ad': 'utm_ad',
  'anuncio': 'utm_ad',
  'creative': 'utm_creative',
  'criativo': 'utm_creative',
  'placement': 'utm_placement',
  
  // SCK variations (Hotmart format)
  'sck': 'utm_source',
  'sck_source': 'utm_source',
  'sck_src': 'utm_source',
  'src': 'utm_source',
  'sck_campaign': 'utm_campaign',
  'sck_campaign_id': 'utm_campaign',
  'sck_medium': 'utm_medium',
  'sck_content': 'utm_content',
  'sck_term': 'utm_term',
  'sck_adset': 'utm_adset',
  'sck_adset_name': 'utm_adset',
  'sck_ad': 'utm_ad',
  'sck_creative': 'utm_creative',
  'sck_placement': 'utm_placement',
  
  // Page name variations
  'pagina': 'page_name',
  'page': 'page_name',
  'landing_page': 'page_name',
  'lp': 'page_name',
  'form_name': 'page_name',
  'formulario': 'page_name',
  'page_url': 'page_url',
  'url': 'page_url',
  
  // Launch tag variations
  'launch_tag': 'launch_tag',
  'tag_lancamento': 'launch_tag',
  'lancamento': 'launch_tag',
};

const STANDARD_FIELDS = [
  'email', 'name', 'first_name', 'last_name', 'phone', 'phone_ddd', 'document', 'instagram',
  'address', 'address_number', 'address_complement', 'neighborhood',
  'city', 'state', 'country', 'cep', 'tags', 'custom_fields',
  'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term',
  'utm_adset', 'utm_ad', 'utm_creative', 'utm_placement',
  'page_name', 'page_url', 'launch_tag', 'interaction_type'
];

interface MappingResult {
  original: string;
  mapped: string;
  value: unknown;
  status: 'mapped' | 'standard' | 'custom';
}

interface WebhookTestDashboardProps {
  apiKey: string;
  webhookUrl: string | null;
}

const EXAMPLE_PAYLOADS = {
  basic: {
    email: "teste@email.com",
    primeiro_nome: "João",
    sobrenome: "Silva",
    telefone: "11999999999"
  },
  hotmart: {
    email: "cliente@hotmart.com",
    first_name: "Maria",
    last_name: "Santos",
    celular: "21988887777",
    cpf: "12345678900",
    sck: "facebook",
    sck_campaign: "lancamento_2024",
    sck_adset_name: "interesse_produto",
    sck_creative: "video_1",
    sck_placement: "feed"
  },
  leadlovers: {
    "e-mail": "lead@leadlovers.com",
    first_name: "Carlos",
    last_name: "Oliveira",
    whatsapp: "31977776666",
    utm_source: "google",
    utm_campaign: "pesquisa_marca",
    utm_medium: "cpc",
    pagina: "pagina-de-captura",
    tag_lancamento: "LANCAMENTO_JAN25"
  },
  activecampaign: {
    email_address: "contato@active.com",
    primeiro_nome: "Ana",
    sobrenome: "Costa",
    mobile: "41966665555",
    source: "instagram",
    campaign: "stories_anuncio",
    tags: ["lead", "interessado", "quente"]
  },
  custom: {
    email: "custom@test.com",
    meu_campo_nome: "Teste Custom",
    telefone_principal: "51955554444",
    origem_lead: "meu_site",
    campanha_ativa: "promo_verao"
  }
};

export function WebhookTestDashboard({ apiKey, webhookUrl }: WebhookTestDashboardProps) {
  const [payload, setPayload] = useState(JSON.stringify(EXAMPLE_PAYLOADS.basic, null, 2));
  const [mappingResult, setMappingResult] = useState<MappingResult[]>([]);
  const [testResult, setTestResult] = useState<{success: boolean; message: string; data?: unknown} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeMapping = () => {
    try {
      const parsed = JSON.parse(payload);
      const results: MappingResult[] = [];

      for (const [key, value] of Object.entries(parsed)) {
        if (value === null || value === undefined || value === '') continue;
        
        const lowerKey = key.toLowerCase().trim();
        let targetField: string | undefined;
        let status: 'mapped' | 'standard' | 'custom' = 'custom';
        
        // Check built-in aliases
        if (FIELD_ALIASES[lowerKey]) {
          targetField = FIELD_ALIASES[lowerKey];
          status = 'mapped';
        }
        
        // Check if it's a standard field
        if (!targetField && STANDARD_FIELDS.includes(lowerKey)) {
          targetField = lowerKey;
          status = 'standard';
        }
        
        results.push({
          original: key,
          mapped: targetField || 'custom_fields',
          value,
          status: targetField ? status : 'custom'
        });
      }

      setMappingResult(results);
      toast.success("Análise de mapeamento concluída");
    } catch (e) {
      toast.error("JSON inválido. Verifique a sintaxe.");
    }
  };

  const sendTestRequest = async () => {
    if (!apiKey || !webhookUrl) {
      toast.error("API key ou URL não configurada");
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const parsed = JSON.parse(payload);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(parsed)
      });

      const data = await response.json();
      
      setTestResult({
        success: response.ok,
        message: response.ok ? 'Webhook executado com sucesso!' : `Erro: ${data.error || 'Falha na requisição'}`,
        data
      });

      if (response.ok) {
        toast.success("Teste executado com sucesso!");
      } else {
        toast.error(`Erro: ${data.error || 'Falha na requisição'}`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      setTestResult({
        success: false,
        message: errorMessage
      });
      toast.error("Erro ao enviar requisição");
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = (key: keyof typeof EXAMPLE_PAYLOADS) => {
    setPayload(JSON.stringify(EXAMPLE_PAYLOADS[key], null, 2));
    setMappingResult([]);
    setTestResult(null);
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(payload);
    toast.success("Payload copiado!");
  };

  const getStatusBadge = (status: 'mapped' | 'standard' | 'custom') => {
    switch (status) {
      case 'mapped':
        return <Badge variant="default" className="bg-green-600">Mapeado</Badge>;
      case 'standard':
        return <Badge variant="secondary">Padrão</Badge>;
      case 'custom':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Custom Fields</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Teste de Webhook
        </CardTitle>
        <CardDescription>
          Teste como os campos são mapeados e envie requisições de teste para o webhook
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Exemplos de Payload</Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => loadExample('basic')}>
              Básico
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadExample('hotmart')}>
              Hotmart (SCK)
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadExample('leadlovers')}>
              LeadLovers
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadExample('activecampaign')}>
              ActiveCampaign
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadExample('custom')}>
              Campos Custom
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Payload JSON</Label>
              <Button variant="ghost" size="sm" onClick={copyPayload}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            </div>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="font-mono text-sm h-[300px]"
              placeholder='{"email": "teste@email.com", ...}'
            />
          </div>

          <div className="space-y-2">
            <Label>Resultado do Mapeamento</Label>
            <ScrollArea className="h-[300px] border rounded-md p-3">
              {mappingResult.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                  Clique em "Analisar Mapeamento" para ver como os campos serão mapeados
                </div>
              ) : (
                <div className="space-y-2">
                  {mappingResult.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                      <code className="text-primary">{result.original}</code>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <code className="text-green-600 dark:text-green-400">{result.mapped}</code>
                      {getStatusBadge(result.status)}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={analyzeMapping}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Analisar Mapeamento
          </Button>
          <Button onClick={sendTestRequest} disabled={isLoading || !apiKey}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Enviar Teste Real
          </Button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {testResult.message}
              </span>
            </div>
            {testResult.data && (
              <pre className="text-xs mt-2 p-2 bg-background rounded overflow-auto max-h-[200px]">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> O webhook aceita campos em diversos formatos:
          </p>
          <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
            <li><code className="text-xs">first_name + last_name</code> - Recomendado (serão salvos separadamente)</li>
            <li><code className="text-xs">primeiro_nome + sobrenome</code> - Aliases em português</li>
            <li><code className="text-xs">utm_*</code> - Formato padrão de UTM</li>
            <li><code className="text-xs">sck_*</code> - Formato Hotmart</li>
            <li><code className="text-xs">source, campaign, medium</code> - Aliases sem prefixo</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}