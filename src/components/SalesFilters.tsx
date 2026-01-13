import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";

/**
 * Get today's date in Brazil timezone (UTC-3) as YYYY-MM-DD string
 * This is critical for Financial Core which uses economic_day in Brazil timezone
 */
const getBrazilToday = (): string => {
  const now = new Date();
  // Convert to Brazil timezone (UTC-3)
  const brazilOffset = -3 * 60; // -3 hours in minutes
  const localOffset = now.getTimezoneOffset(); // Local offset in minutes
  const brazilTime = new Date(now.getTime() + (localOffset + brazilOffset) * 60 * 1000);
  return brazilTime.toISOString().split('T')[0];
};

/**
 * Get a date N days ago in Brazil timezone as YYYY-MM-DD string
 */
const getBrazilDateDaysAgo = (days: number): string => {
  const now = new Date();
  // Convert to Brazil timezone (UTC-3)
  const brazilOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const brazilTime = new Date(now.getTime() + (localOffset + brazilOffset) * 60 * 1000);
  brazilTime.setDate(brazilTime.getDate() - days);
  return brazilTime.toISOString().split('T')[0];
};

interface SalesFiltersProps {
  onFilter: (filters: FilterParams) => void;
  availableProducts?: string[];
  availableOffers?: { code: string; name: string }[];
  projectId?: string;
}

export interface FilterParams {
  startDate: string;
  endDate: string;
  transactionStatus?: string[];
  maxResults: number;
  utmSource?: string;
  utmCampaign?: string;
  utmAdset?: string;
  utmPlacement?: string;
  utmCreative?: string;
  idFunil?: string[];
  productName?: string[];
  offerCode?: string[];
}

const SalesFilters = ({ onFilter, availableProducts = [], availableOffers = [], projectId }: SalesFiltersProps) => {
  // Use Brazil timezone for economic_day consistency with Financial Core
  const today = getBrazilToday();
  const thirtyDaysAgo = getBrazilDateDaysAgo(30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [transactionStatus, setTransactionStatus] = useState<string[]>(["approved", "complete"]);
  const [maxResults, setMaxResults] = useState("50");
  const [idFunil, setIdFunil] = useState<string[]>([]);
  const [productName, setProductName] = useState<string[]>([]);
  const [offerCode, setOfferCode] = useState<string[]>([]);
  const [funis, setFunis] = useState<string[]>([]);
  const [mappedProducts, setMappedProducts] = useState<string[]>([]);
  const [mappedOffers, setMappedOffers] = useState<{ code: string; name: string }[]>([]);
  
  // UTM Filters
  const [utmSource, setUtmSource] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmAdset, setUtmAdset] = useState("");
  const [utmPlacement, setUtmPlacement] = useState("");
  const [utmCreative, setUtmCreative] = useState("");

  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!projectId) {
        setFunis([]);
        setMappedProducts([]);
        setMappedOffers([]);
        return;
      }

      const { data, error } = await supabase
        .from('offer_mappings')
        .select('id_funil, nome_produto, codigo_oferta, nome_oferta')
        .eq('project_id', projectId)
        .order('id_funil');
      
      if (data && !error) {
        const uniqueFunis = Array.from(new Set(data.map(item => item.id_funil)));
        const uniqueProducts = Array.from(new Set(data.map(item => item.nome_produto)));
        const uniqueOffers = data
          .filter(item => item.codigo_oferta)
          .map(item => ({ code: item.codigo_oferta!, name: item.nome_oferta || item.codigo_oferta! }))
          .filter((offer, index, self) => self.findIndex(o => o.code === offer.code) === index);
        
        setFunis(uniqueFunis);
        setMappedProducts(uniqueProducts);
        setMappedOffers(uniqueOffers);
      }
    };
    
    fetchFilterOptions();
  }, [projectId]);

  // Combine mapped data with API data, preferring API data when available
  const displayProducts = availableProducts.length > 0 ? availableProducts : mappedProducts;
  const displayOffers = availableOffers.length > 0 ? availableOffers : mappedOffers;

  // Convert to MultiSelect options - all statuses from Hotmart
  const statusOptions: MultiSelectOption[] = [
    { value: "approved", label: "Aprovada", description: "Pagamento aprovado pela operadora. O cliente já tem acesso ao produto e você receberá o valor." },
    { value: "complete", label: "Completa", description: "Transação 100% finalizada. Pagamento liquidado, produto entregue e prazo de garantia encerrado." },
    { value: "pending", label: "Pendente", description: "Pagamento iniciado mas ainda não processado. Comum em cartões aguardando autorização da bandeira." },
    { value: "waiting_payment", label: "Aguardando Pagamento", description: "Boleto ou PIX gerado pelo cliente. O pagamento ainda não foi identificado no sistema bancário." },
    { value: "billet_printed", label: "Boleto Gerado", description: "Boleto bancário emitido e disponível. Cliente tem até o vencimento para realizar o pagamento." },
    { value: "started", label: "Iniciada", description: "Cliente acessou o checkout e iniciou o processo de compra, mas ainda não finalizou o pagamento." },
    { value: "under_analysis", label: "Em Análise", description: "Transação em análise antifraude. Verificação de dados do cartão e comportamento de compra em andamento." },
    { value: "refunded", label: "Reembolsada", description: "Valor devolvido integralmente ao cliente. Pode ter sido solicitado dentro do prazo de garantia." },
    { value: "cancelled", label: "Cancelada", description: "Transação cancelada antes da conclusão. Cliente desistiu ou houve falha no processamento." },
    { value: "chargeback", label: "Chargeback", description: "Cliente contestou a cobrança junto ao banco/cartão. Disputa aberta que pode resultar em estorno forçado." },
    { value: "expired", label: "Expirada", description: "Prazo para pagamento do boleto/PIX venceu sem que o cliente realizasse o pagamento." },
    { value: "overdue", label: "Vencida", description: "Parcela de assinatura ou pagamento recorrente não foi paga no vencimento. Cliente em inadimplência." },
    { value: "dispute", label: "Reclamada", description: "Cliente registrou reclamação formal sobre a compra. Pode evoluir para chargeback se não resolvida." },
    { value: "blocked", label: "Bloqueada", description: "Transação bloqueada por suspeita de fraude ou violação de políticas. Requer análise manual." },
  ];

  const funilOptions: MultiSelectOption[] = funis.map(funil => ({
    value: funil,
    label: funil,
  }));

  const productOptions: MultiSelectOption[] = displayProducts.map(product => ({
    value: product,
    label: product,
  }));

  const offerOptions: MultiSelectOption[] = displayOffers.map(offer => ({
    value: offer.code,
    label: offer.name,
  }));

  const handleApplyFilters = () => {
    onFilter({
      startDate,
      endDate,
      transactionStatus: transactionStatus.length > 0 ? transactionStatus : undefined,
      maxResults: parseInt(maxResults),
      utmSource: utmSource || undefined,
      utmCampaign: utmCampaign || undefined,
      utmAdset: utmAdset || undefined,
      utmPlacement: utmPlacement || undefined,
      utmCreative: utmCreative || undefined,
      idFunil: idFunil.length > 0 ? idFunil : undefined,
      productName: productName.length > 0 ? productName : undefined,
      offerCode: offerCode.length > 0 ? offerCode : undefined,
    });
  };

  // Quick filter buttons use Brazil timezone for economic_day consistency
  const handleQuickFilter = (days: number) => {
    // "Últimos X dias" means today + (days-1) days before = X days total
    const endDate = getBrazilToday();
    const startDate = getBrazilDateDaysAgo(days - 1);
    
    setStartDate(startDate);
    setEndDate(endDate);
  };

  const handleTodayFilter = () => {
    const todayBrazil = getBrazilToday();
    setStartDate(todayBrazil);
    setEndDate(todayBrazil);
  };

  const handleYesterdayFilter = () => {
    const yesterdayBrazil = getBrazilDateDaysAgo(1);
    setStartDate(yesterdayBrazil);
    setEndDate(yesterdayBrazil);
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Filtros de Busca</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-foreground">Data Inicial</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-foreground">Data Final</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-border"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Status da Transação</Label>
          <MultiSelect
            options={statusOptions}
            selected={transactionStatus}
            onChange={setTransactionStatus}
            placeholder="Todos"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxResults" className="text-foreground">Resultados (máx)</Label>
          <Input
            id="maxResults"
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(e.target.value)}
            min="1"
            max="500"
            className="border-border"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Funil</Label>
          <MultiSelect
            options={funilOptions}
            selected={idFunil}
            onChange={setIdFunil}
            placeholder="Todos os Funis"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Produto</Label>
          <MultiSelect
            options={productOptions}
            selected={productName}
            onChange={setProductName}
            placeholder="Todos os Produtos"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Oferta</Label>
          <MultiSelect
            options={offerOptions}
            selected={offerCode}
            onChange={setOfferCode}
            placeholder="Todas as Ofertas"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTodayFilter}
          className="border-border"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Hoje
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleYesterdayFilter}
          className="border-border"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Ontem
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(7)}
          className="border-border"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Últimos 7 dias
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(30)}
          className="border-border"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Últimos 30 dias
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(90)}
          className="border-border"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Últimos 90 dias
        </Button>
      </div>

      {/* UTM Filters Section */}
      <div className="border-t border-border pt-4 mt-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Filtros de UTM</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="utmSource" className="text-foreground">UTM Source</Label>
            <Input
              id="utmSource"
              placeholder="Ex: Meta-Ads"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              className="border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="utmCampaign" className="text-foreground">Campanha</Label>
            <Input
              id="utmCampaign"
              placeholder="Ex: PERPETUO_MAKEPRATICA..."
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              className="border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="utmAdset" className="text-foreground">Conjunto de Anúncios</Label>
            <Input
              id="utmAdset"
              placeholder="Ex: 00_ADVANTAGE_..."
              value={utmAdset}
              onChange={(e) => setUtmAdset(e.target.value)}
              className="border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="utmPlacement" className="text-foreground">Posicionamento</Label>
            <Input
              id="utmPlacement"
              placeholder="Ex: Instagram_Stories"
              value={utmPlacement}
              onChange={(e) => setUtmPlacement(e.target.value)}
              className="border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="utmCreative" className="text-foreground">Criativo</Label>
            <Input
              id="utmCreative"
              placeholder="Ex: VENDA_VIDEO_02..."
              value={utmCreative}
              onChange={(e) => setUtmCreative(e.target.value)}
              className="border-border"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleApplyFilters} className="w-full">
        Aplicar Filtros
      </Button>
    </Card>
  );
};

export default SalesFilters;
