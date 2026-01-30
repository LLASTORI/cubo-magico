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
  cachedAIAnalysis: {},
  lastProjectId: null,
};

// Global in-memory store (survives component unmount, lost on page reload)
let globalState: FunnelAnalysisPersistedState = { ...DEFAULT_STATE };

/**
 * Returns the initial state for the hook, handling project reset logic.
 * This is a pure function that computes state without side effects during render.
 */
function getInitialState(projectId: string | undefined): FunnelAnalysisPersistedState {
  const shouldReset = projectId && globalState.lastProjectId && globalState.lastProjectId !== projectId;
  if (shouldReset) {
    return { ...DEFAULT_STATE, lastProjectId: projectId };
  }
  if (projectId && !globalState.lastProjectId) {
    return { ...globalState, lastProjectId: projectId };
  }
  return globalState;
}

/**
 * Hook to persist FunnelAnalysis state across navigations.
 * When the component mounts it restores the previous state.
 * When state changes, it saves to the global store.
 */
export function useFunnelAnalysisState(projectId: string | undefined) {
  // Compute initial state once using lazy initializer (safe for React)
  const [startDate, setStartDateLocal] = useState<Date>(() => getInitialState(projectId).startDate);
  const [endDate, setEndDateLocal] = useState<Date>(() => getInitialState(projectId).endDate);
  const [appliedStartDate, setAppliedStartDateLocal] = useState<Date>(() => getInitialState(projectId).appliedStartDate);
  const [appliedEndDate, setAppliedEndDateLocal] = useState<Date>(() => getInitialState(projectId).appliedEndDate);
  const [selectedPeriod, setSelectedPeriodLocal] = useState<string | null>(() => getInitialState(projectId).selectedPeriod);
  const [activeTab, setActiveTabLocal] = useState<string>(() => getInitialState(projectId).activeTab);
  const [cachedAIAnalysis, setCachedAIAnalysisLocal] = useState<Record<string, any>>(() => getInitialState(projectId).cachedAIAnalysis);

  // Handle project change - reset all state via effect (not during render)
  const prevProjectIdRef = useRef<string | undefined>(projectId);
  useEffect(() => {
    if (projectId && prevProjectIdRef.current && prevProjectIdRef.current !== projectId) {
      // Project changed - reset to defaults
      const defaults = { ...DEFAULT_STATE, lastProjectId: projectId };
      setStartDateLocal(defaults.startDate);
      setEndDateLocal(defaults.endDate);
      setAppliedStartDateLocal(defaults.appliedStartDate);
      setAppliedEndDateLocal(defaults.appliedEndDate);
      setSelectedPeriodLocal(defaults.selectedPeriod);
      setActiveTabLocal(defaults.activeTab);
      setCachedAIAnalysisLocal(defaults.cachedAIAnalysis);
      globalState = defaults;
    } else if (projectId) {
      globalState.lastProjectId = projectId;
    }
    prevProjectIdRef.current = projectId;
  }, [projectId]);

  // Sync changes back to global state
  useEffect(() => { globalState.startDate = startDate; }, [startDate]);
  useEffect(() => { globalState.endDate = endDate; }, [endDate]);
  useEffect(() => { globalState.appliedStartDate = appliedStartDate; }, [appliedStartDate]);
  useEffect(() => { globalState.appliedEndDate = appliedEndDate; }, [appliedEndDate]);
  useEffect(() => { globalState.selectedPeriod = selectedPeriod; }, [selectedPeriod]);
  useEffect(() => { globalState.activeTab = activeTab; }, [activeTab]);
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
    cachedAIAnalysis,
    setCachedAIAnalysis,
  };
}
