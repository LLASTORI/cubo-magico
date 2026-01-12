import { AlertTriangle, Database, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LegacyDataWarningProps {
  startDate: string;
  endDate: string;
  financialCoreStartDate: string | null;
  variant?: 'banner' | 'inline' | 'subtle';
  className?: string;
}

/**
 * Component to warn users when viewing data from the Legacy Era (before financial_core_start_date)
 */
export const LegacyDataWarning = ({
  startDate,
  endDate,
  financialCoreStartDate,
  variant = 'banner',
  className = '',
}: LegacyDataWarningProps) => {
  if (!financialCoreStartDate) return null;

  const epochDate = financialCoreStartDate;
  const hasLegacy = startDate < epochDate;
  const hasCore = endDate >= epochDate;
  const isFullyLegacy = endDate < epochDate;
  const isMixed = hasLegacy && hasCore;

  if (!hasLegacy) return null;

  const epochFormatted = format(parseISO(epochDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  if (variant === 'subtle') {
    return (
      <Badge variant="outline" className={`text-amber-600 border-amber-300 bg-amber-50 ${className}`}>
        <Clock className="h-3 w-3 mr-1" />
        {isFullyLegacy ? 'Dados legado' : 'Período misto'}
      </Badge>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm text-amber-600 ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <span>
          {isFullyLegacy 
            ? 'Dados legado — não utilizados para IA ou otimização'
            : `Período inclui dados anteriores a ${epochFormatted}`
          }
        </span>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <Alert variant="default" className={`border-amber-300 bg-amber-50/50 ${className}`}>
      <Database className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">
        {isFullyLegacy ? 'Era Legado' : 'Período Misto'}
      </AlertTitle>
      <AlertDescription className="text-amber-700">
        {isFullyLegacy ? (
          <>
            Os dados exibidos são anteriores ao início do Cubo Financial Core ({epochFormatted}).
            <br />
            <span className="font-medium">Dados legado não são utilizados para IA ou otimização.</span>
          </>
        ) : (
          <>
            Este período inclui dados anteriores a {epochFormatted} (Era Legado).
            <br />
            <span className="font-medium">Apenas dados a partir de {epochFormatted} são utilizados para IA e otimização.</span>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
};

/**
 * Simple badge to indicate data era
 */
export const DataEraBadge = ({
  date,
  financialCoreStartDate,
}: {
  date: string;
  financialCoreStartDate: string | null;
}) => {
  if (!financialCoreStartDate) return null;

  const isCore = date >= financialCoreStartDate;

  return (
    <Badge 
      variant="outline" 
      className={isCore 
        ? "text-emerald-600 border-emerald-300 bg-emerald-50" 
        : "text-amber-600 border-amber-300 bg-amber-50"
      }
    >
      {isCore ? (
        <>
          <Database className="h-3 w-3 mr-1" />
          Core
        </>
      ) : (
        <>
          <Clock className="h-3 w-3 mr-1" />
          Legado
        </>
      )}
    </Badge>
  );
};
