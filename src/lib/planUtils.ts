// Utility functions for plan formatting

const TYPE_LABELS: Record<string, string> = {
  monthly: 'mensal',
  yearly: 'anual',
  lifetime: 'vitalício',
  trial: 'trial',
};

/**
 * Formats a plan name with its periodicity
 * Example: "Pro" + "monthly" -> "Pro (mensal)"
 */
export const formatPlanName = (name: string | undefined | null, type: string | undefined | null): string => {
  if (!name) return 'Plano não encontrado';
  const typeLabel = type ? TYPE_LABELS[type] || type : '';
  return typeLabel ? `${name} (${typeLabel})` : name;
};

/**
 * Gets the periodicity label for a plan type
 */
export const getPlanTypeLabel = (type: string): string => {
  return TYPE_LABELS[type] || type;
};
