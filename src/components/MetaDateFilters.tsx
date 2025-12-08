import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

interface MetaDateFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const MetaDateFilters = ({ startDate, endDate, onStartDateChange, onEndDateChange }: MetaDateFiltersProps) => {
  const endDateRef = useRef<HTMLInputElement>(null);

  const handleStartDateChange = (date: string) => {
    onStartDateChange(date);
    // Se a data inicial for maior que a final, ajusta a final
    if (endDate && date > endDate) {
      onEndDateChange(date);
    }
    // Foca no campo de data final após selecionar a inicial
    setTimeout(() => {
      endDateRef.current?.focus();
      endDateRef.current?.showPicker?.();
    }, 100);
  };

  const handleEndDateChange = (date: string) => {
    // Impede que a data final seja menor que a inicial
    if (startDate && date < startDate) {
      return;
    }
    onEndDateChange(date);
  };
  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(end.toISOString().split('T')[0]);
  };

  const handleTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    onStartDateChange(today);
    onEndDateChange(today);
  };

  const handleYesterdayFilter = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    onStartDateChange(yesterdayStr);
    onEndDateChange(yesterdayStr);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(now.toISOString().split('T')[0]);
  };

  const handleLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(end.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-foreground text-sm">Data Inicial</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-foreground text-sm">Data Final</Label>
          <Input
            ref={endDateRef}
            id="endDate"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="border-border"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTodayFilter}
          className="border-border text-xs"
        >
          <Calendar className="w-3 h-3 mr-1" />
          Hoje
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleYesterdayFilter}
          className="border-border text-xs"
        >
          Ontem
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(7)}
          className="border-border text-xs"
        >
          7 dias
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(14)}
          className="border-border text-xs"
        >
          14 dias
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(30)}
          className="border-border text-xs"
        >
          30 dias
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleThisMonth}
          className="border-border text-xs"
        >
          Este mês
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLastMonth}
          className="border-border text-xs"
        >
          Mês anterior
        </Button>
      </div>
    </div>
  );
};

export default MetaDateFilters;
