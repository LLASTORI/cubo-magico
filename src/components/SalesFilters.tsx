import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";

interface SalesFiltersProps {
  onFilter: (filters: FilterParams) => void;
  availableProducts?: string[];
  availableOffers?: { code: string; name: string }[];
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

const SalesFilters = ({ onFilter, availableProducts = [], availableOffers = [] }: SalesFiltersProps) => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [transactionStatus, setTransactionStatus] = useState<string[]>([]);
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
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('id_funil, nome_produto, codigo_oferta, nome_oferta')
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
  }, []);

  // Combine mapped data with API data, preferring API data when available
  const displayProducts = availableProducts.length > 0 ? availableProducts : mappedProducts;
  const displayOffers = availableOffers.length > 0 ? availableOffers : mappedOffers;

  // Convert to MultiSelect options
  const statusOptions: MultiSelectOption[] = [
    { value: "approved", label: "Aprovado" },
    { value: "complete", label: "Completo" },
    { value: "pending", label: "Pendente" },
    { value: "refunded", label: "Reembolsado" },
    { value: "cancelled", label: "Cancelado" },
    { value: "chargeback", label: "Chargeback" },
    { value: "blocked", label: "Bloqueado" },
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

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
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
              placeholder="Ex: 00_ADVANTAGE_..."
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              className="border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="utmAdset" className="text-foreground">Conjunto de Anúncios</Label>
            <Input
              id="utmAdset"
              placeholder="Ex: PERPETUO_MAKEPRATICA..."
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
