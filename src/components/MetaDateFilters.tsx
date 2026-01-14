import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { toZonedTime, format } from "date-fns-tz";

/**
 * ============================================================================
 * TIMEZONE CONTRACT FOR META ADS FILTERS
 * ============================================================================
 * 
 * All date filters MUST be calculated in São Paulo timezone (America/Sao_Paulo),
 * regardless of the user's local timezone, to maintain consistency with
 * the economic_day field in the database.
 * 
 * Format: YYYY-MM-DD (ISO date string)
 * ============================================================================
 */

const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

/**
 * Get today's date in São Paulo timezone as YYYY-MM-DD string.
 */
const getBrazilToday = (): string => {
  const now = new Date();
  const zonedDate = toZonedTime(now, SAO_PAULO_TIMEZONE);
  return format(zonedDate, "yyyy-MM-dd", { timeZone: SAO_PAULO_TIMEZONE });
};

/**
 * Get a date N days ago in São Paulo timezone as YYYY-MM-DD string.
 */
const getBrazilDateDaysAgo = (days: number): string => {
  const now = new Date();
  const zonedDate = toZonedTime(now, SAO_PAULO_TIMEZONE);
  zonedDate.setDate(zonedDate.getDate() - days);
  return format(zonedDate, "yyyy-MM-dd", { timeZone: SAO_PAULO_TIMEZONE });
};

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
    if (endDate && date > endDate) {
      onEndDateChange(date);
    }
    setTimeout(() => {
      endDateRef.current?.focus();
      endDateRef.current?.showPicker?.();
    }, 100);
  };

  const handleEndDateChange = (date: string) => {
    if (startDate && date < startDate) {
      return;
    }
    onEndDateChange(date);
  };

  const handleQuickFilter = (days: number) => {
    const endDate = getBrazilToday();
    const startDate = getBrazilDateDaysAgo(days - 1);
    onStartDateChange(startDate);
    onEndDateChange(endDate);
  };

  const handleTodayFilter = () => {
    const today = getBrazilToday();
    onStartDateChange(today);
    onEndDateChange(today);
  };

  const handleYesterdayFilter = () => {
    const yesterday = getBrazilDateDaysAgo(1);
    onStartDateChange(yesterday);
    onEndDateChange(yesterday);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const zonedNow = toZonedTime(now, SAO_PAULO_TIMEZONE);
    const start = new Date(zonedNow.getFullYear(), zonedNow.getMonth(), 1);
    onStartDateChange(format(start, "yyyy-MM-dd", { timeZone: SAO_PAULO_TIMEZONE }));
    onEndDateChange(getBrazilToday());
  };

  const handleLastMonth = () => {
    const now = new Date();
    const zonedNow = toZonedTime(now, SAO_PAULO_TIMEZONE);
    const start = new Date(zonedNow.getFullYear(), zonedNow.getMonth() - 1, 1);
    const end = new Date(zonedNow.getFullYear(), zonedNow.getMonth(), 0);
    onStartDateChange(format(start, "yyyy-MM-dd", { timeZone: SAO_PAULO_TIMEZONE }));
    onEndDateChange(format(end, "yyyy-MM-dd", { timeZone: SAO_PAULO_TIMEZONE }));
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
