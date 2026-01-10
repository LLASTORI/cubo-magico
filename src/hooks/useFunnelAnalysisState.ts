import { useState, useCallback, useRef, useEffect } from "react";
import { subDays } from "date-fns";

/**
 * State shape persisted in memory across navigations.
 * Stored globally (module-level) so it survives component unmount/remount.
 */
interface FunnelAnalysisPersistedState {
  startDate: Date;
  endDate: Date;
  appliedStartDate: Date;
  appliedEndDate: Date;
  selectedPeriod: string | null;
  activeTab: string;
  metaSyncInProgress: boolean;
  cachedAIAnalysis: Record<string, any>;
  lastProjectId: string | null;
}

const DEFAULT_STATE: FunnelAnalysisPersistedState = {
  startDate: subDays(new Date(), 7),
  endDate: new Date(),
  appliedStartDate: subDays(new Date(), 7),
  appliedEndDate: new Date(),
  selectedPeriod: "7d",
  activeTab: "overview",
  metaSyncInProgress: false,
  cachedAIAnalysis: {},
  lastProjectId: null,
};

// Global in-memory store (survives component unmount, lost on page reload)
let globalState: FunnelAnalysisPersistedState = { ...DEFAULT_STATE };

/**
 * Hook to persist FunnelAnalysis state across navigations.
 * When the component mounts it restores the previous state.
 * When state changes, it saves to the global store.
 */
export function useFunnelAnalysisState(projectId: string | undefined) {
  // Reset state if project changed
  const shouldReset = projectId && globalState.lastProjectId && globalState.lastProjectId !== projectId;
  if (shouldReset) {
    globalState = { ...DEFAULT_STATE, lastProjectId: projectId };
  } else if (projectId && !globalState.lastProjectId) {
    globalState.lastProjectId = projectId;
  }

  const [startDate, setStartDateLocal] = useState<Date>(globalState.startDate);
  const [endDate, setEndDateLocal] = useState<Date>(globalState.endDate);
  const [appliedStartDate, setAppliedStartDateLocal] = useState<Date>(globalState.appliedStartDate);
  const [appliedEndDate, setAppliedEndDateLocal] = useState<Date>(globalState.appliedEndDate);
  const [selectedPeriod, setSelectedPeriodLocal] = useState<string | null>(globalState.selectedPeriod);
  const [activeTab, setActiveTabLocal] = useState<string>(globalState.activeTab);
  const [metaSyncInProgress, setMetaSyncInProgressLocal] = useState<boolean>(globalState.metaSyncInProgress);
  const [cachedAIAnalysis, setCachedAIAnalysisLocal] = useState<Record<string, any>>(globalState.cachedAIAnalysis);

  // Sync changes back to global state
  useEffect(() => { globalState.startDate = startDate; }, [startDate]);
  useEffect(() => { globalState.endDate = endDate; }, [endDate]);
  useEffect(() => { globalState.appliedStartDate = appliedStartDate; }, [appliedStartDate]);
  useEffect(() => { globalState.appliedEndDate = appliedEndDate; }, [appliedEndDate]);
  useEffect(() => { globalState.selectedPeriod = selectedPeriod; }, [selectedPeriod]);
  useEffect(() => { globalState.activeTab = activeTab; }, [activeTab]);
  useEffect(() => { globalState.metaSyncInProgress = metaSyncInProgress; }, [metaSyncInProgress]);
  useEffect(() => { globalState.cachedAIAnalysis = cachedAIAnalysis; }, [cachedAIAnalysis]);

  // Wrapped setters that also persist
  const setStartDate = useCallback((d: Date) => {
    setStartDateLocal(d);
  }, []);
  const setEndDate = useCallback((d: Date) => {
    setEndDateLocal(d);
  }, []);
  const setAppliedStartDate = useCallback((d: Date) => {
    setAppliedStartDateLocal(d);
  }, []);
  const setAppliedEndDate = useCallback((d: Date) => {
    setAppliedEndDateLocal(d);
  }, []);
  const setSelectedPeriod = useCallback((p: string | null) => {
    setSelectedPeriodLocal(p);
  }, []);
  const setActiveTab = useCallback((t: string) => {
    setActiveTabLocal(t);
  }, []);
  const setMetaSyncInProgress = useCallback((v: boolean) => {
    setMetaSyncInProgressLocal(v);
  }, []);
  const setCachedAIAnalysis = useCallback((v: React.SetStateAction<Record<string, any>>) => {
    setCachedAIAnalysisLocal(v);
  }, []);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    appliedStartDate,
    setAppliedStartDate,
    appliedEndDate,
    setAppliedEndDate,
    selectedPeriod,
    setSelectedPeriod,
    activeTab,
    setActiveTab,
    metaSyncInProgress,
    setMetaSyncInProgress,
    cachedAIAnalysis,
    setCachedAIAnalysis,
  };
}
