import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter } from "lucide-react";

interface SalesFiltersProps {
  onFilter: (filters: FilterParams) => void;
}

export interface FilterParams {
  startDate: string;
  endDate: string;
  transactionStatus?: string;
  maxResults: number;
}

const SalesFilters = ({ onFilter }: SalesFiltersProps) => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [transactionStatus, setTransactionStatus] = useState<string>("");
  const [maxResults, setMaxResults] = useState("50");

  const handleApplyFilters = () => {
    onFilter({
      startDate,
      endDate,
      transactionStatus: transactionStatus || undefined,
      maxResults: parseInt(maxResults),
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
          <Label htmlFor="status" className="text-foreground">Status da Transação</Label>
          <Select value={transactionStatus} onValueChange={setTransactionStatus}>
            <SelectTrigger className="border-border">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="complete">Completo</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="chargeback">Chargeback</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
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

      <Button onClick={handleApplyFilters} className="w-full">
        Aplicar Filtros
      </Button>
    </Card>
  );
};

export default SalesFilters;
