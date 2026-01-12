/**
 * Financial Time Model
 * 
 * Core principle: Financial Core = Historical Truth, Live Layer = Real-time Observation
 * 
 * This module provides the global helper for time-aware financial data governance.
 * - Never mix Core and Live data in calculations
 * - Never use Live data for AI analysis
 * - Always mark data source clearly
 */

import { format, isToday, parseISO, isBefore, startOfDay } from 'date-fns';

// ============================================
// Types
// ============================================

export type FinancialDataMode = 'core' | 'live' | 'mixed';
export type TrustLevel = 'core' | 'live';

export interface FinancialDataContext {
  mode: FinancialDataMode;
  trustLevel: TrustLevel;
  sources: string[];
  hasLiveData: boolean;
  hasCoreData: boolean;
  liveDataDays: string[];
  coreDataDays: string[];
  isAISafe: boolean;
  warningMessage: string | null;
}

export interface DateRangeAnalysis {
  startDate: string;
  endDate: string;
  includesLive: boolean;
  liveDate: string | null;
  coreStartDate: string;
  coreEndDate: string | null;
  mode: FinancialDataMode;
}

export interface FinancialQueryLogEntry {
  project_id: string;
  query_context: string;
  date_range_start: string | null;
  date_range_end: string | null;
  mode: FinancialDataMode;
  sources: string[];
  used_for_ai: boolean;
  trust_level: TrustLevel;
  metadata?: Record<string, unknown>;
}

// ============================================
// Core Functions
// ============================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Check if a date string represents today
 */
export function isDateToday(dateStr: string): boolean {
  try {
    return isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

/**
 * Check if a date is in the past (before today)
 */
export function isDateInPast(dateStr: string): boolean {
  try {
    const date = parseISO(dateStr);
    const today = startOfDay(new Date());
    return isBefore(date, today);
  } catch {
    return false;
  }
}

/**
 * Analyze a date range to determine data mode
 */
export function analyzeDateRange(
  startDate: string,
  endDate: string,
  financialCoreStartDate?: string
): DateRangeAnalysis {
  const today = getTodayString();
  const coreStart = financialCoreStartDate || today;
  
  const includesLive = endDate >= today;
  const liveDate = includesLive ? today : null;
  
  // Core data is from coreStartDate to yesterday (not including today)
  const coreEndDate = includesLive 
    ? format(new Date(new Date().setDate(new Date().getDate() - 1)), 'yyyy-MM-dd')
    : endDate;
  
  // Determine mode
  let mode: FinancialDataMode;
  if (startDate >= today) {
    mode = 'live';
  } else if (!includesLive) {
    mode = 'core';
  } else {
    mode = 'mixed';
  }
  
  return {
    startDate,
    endDate,
    includesLive,
    liveDate,
    coreStartDate: startDate < coreStart ? coreStart : startDate,
    coreEndDate,
    mode,
  };
}

/**
 * Get financial data context for a given date range
 */
export function getFinancialDataContext(
  startDate: string,
  endDate: string,
  financialCoreStartDate?: string
): FinancialDataContext {
  const analysis = analyzeDateRange(startDate, endDate, financialCoreStartDate);
  const today = getTodayString();
  
  const liveDataDays: string[] = [];
  const coreDataDays: string[] = [];
  const sources: string[] = [];
  
  if (analysis.includesLive) {
    liveDataDays.push(today);
    sources.push('live_financial_today', 'meta_insights', 'hotmart_sales');
  }
  
  if (analysis.coreEndDate && analysis.coreEndDate >= analysis.coreStartDate) {
    sources.push('funnel_financials', 'sales_core_events', 'spend_core_events');
  }
  
  const hasLiveData = liveDataDays.length > 0;
  const hasCoreData = analysis.coreEndDate !== null && analysis.coreEndDate >= analysis.coreStartDate;
  
  // Trust level: only 'core' if no live data
  const trustLevel: TrustLevel = hasLiveData ? 'live' : 'core';
  
  // AI is only safe with core data
  const isAISafe = !hasLiveData;
  
  // Warning message
  let warningMessage: string | null = null;
  if (analysis.mode === 'live') {
    warningMessage = 'Dados em tempo real — sujeitos a ajuste';
  } else if (analysis.mode === 'mixed') {
    warningMessage = 'Período inclui dados de hoje (tempo real)';
  }
  
  return {
    mode: analysis.mode,
    trustLevel,
    sources,
    hasLiveData,
    hasCoreData,
    liveDataDays,
    coreDataDays,
    isAISafe,
    warningMessage,
  };
}

/**
 * Determine if data should be fetched from Core or Live
 */
export function getDataSourceForDate(
  dateStr: string,
  financialCoreStartDate?: string
): 'core' | 'live' | 'none' {
  const today = getTodayString();
  const coreStart = financialCoreStartDate || today;
  
  if (dateStr === today) {
    return 'live';
  }
  
  if (dateStr >= coreStart && dateStr < today) {
    return 'core';
  }
  
  return 'none';
}

/**
 * Create a query log entry
 */
export function createQueryLogEntry(
  projectId: string,
  context: string,
  dateRange: { start: string; end: string } | null,
  mode: FinancialDataMode,
  sources: string[],
  usedForAI: boolean,
  metadata?: Record<string, unknown>
): FinancialQueryLogEntry {
  return {
    project_id: projectId,
    query_context: context,
    date_range_start: dateRange?.start || null,
    date_range_end: dateRange?.end || null,
    mode,
    sources,
    used_for_ai: usedForAI,
    trust_level: usedForAI ? 'core' : (mode === 'core' ? 'core' : 'live'),
    metadata,
  };
}

/**
 * Validate that data is AI-safe
 * Throws an error if live data is attempted to be used for AI
 */
export function validateAISafety(context: FinancialDataContext): void {
  if (!context.isAISafe) {
    throw new Error(
      'AI Safety Violation: Cannot use live data for AI analysis. ' +
      'Only consolidated Core data is allowed for AI consumption.'
    );
  }
}

/**
 * Get badge info for UI display
 */
export function getBadgeInfo(mode: FinancialDataMode): {
  icon: '🔵' | '🟢' | '🟡';
  label: string;
  tooltip: string;
  variant: 'live' | 'core' | 'mixed';
} {
  switch (mode) {
    case 'live':
      return {
        icon: '🔵',
        label: 'Live',
        tooltip: 'Dados do dia atual vêm direto das plataformas e podem mudar',
        variant: 'live',
      };
    case 'core':
      return {
        icon: '🟢',
        label: 'Consolidado',
        tooltip: 'Dados históricos já estão consolidados e são usados pela IA',
        variant: 'core',
      };
    case 'mixed':
      return {
        icon: '🟡',
        label: 'Misto',
        tooltip: 'Período inclui dados consolidados e tempo real de hoje',
        variant: 'mixed',
      };
  }
}
