import { useEffect, useMemo, useRef } from 'react';
import { usePublicTrackingSettings } from './useTrackingSettings';
import { 
  EventDispatcher, 
  createEventDispatcher, 
  TrackingSettings as DispatcherSettings,
  DispatchRule,
} from '@/lib/eventDispatcher';

/**
 * Hook to manage event dispatcher for public quiz pages
 * Initializes pixels and provides dispatch methods
 */
export function useQuizEventDispatcher(projectId: string | undefined, quizId: string) {
  const { settings, rules, isLoading } = usePublicTrackingSettings(projectId);
  const dispatcherRef = useRef<EventDispatcher | null>(null);

  // Convert database settings to dispatcher format
  const dispatcherSettings = useMemo<DispatcherSettings>(() => ({
    metaPixelId: settings?.meta_pixel_id || undefined,
    gtagId: settings?.gtag_id || undefined,
    tiktokPixelId: settings?.tiktok_pixel_id || undefined,
    enableBrowserEvents: settings?.enable_browser_events ?? true,
    enableServerEvents: settings?.enable_server_events ?? false,
  }), [settings]);

  // Convert database rules to dispatcher format
  const dispatcherRules = useMemo<DispatchRule[]>(() => {
    return rules.map(rule => ({
      id: rule.id,
      systemEvent: rule.system_event,
      provider: rule.provider,
      providerEventName: rule.provider_event_name,
      payloadMapping: rule.payload_mapping || {},
      isEnabled: rule.is_enabled,
    }));
  }, [rules]);

  // Initialize dispatcher when settings/rules change
  useEffect(() => {
    if (isLoading) return;
    
    // Only initialize if we have any tracking configured
    const hasTracking = settings?.meta_pixel_id || settings?.gtag_id || settings?.tiktok_pixel_id;
    if (!hasTracking) {
      dispatcherRef.current = null;
      return;
    }

    // Create or update dispatcher
    if (!dispatcherRef.current) {
      dispatcherRef.current = createEventDispatcher(dispatcherSettings, dispatcherRules);
    } else {
      dispatcherRef.current.updateSettings(dispatcherSettings);
      dispatcherRef.current.updateRules(dispatcherRules);
    }
  }, [dispatcherSettings, dispatcherRules, isLoading, settings]);

  // Event tracking methods
  const trackQuizStarted = (quizName: string, payload: Record<string, any> = {}) => {
    dispatcherRef.current?.trackQuizStarted(quizId, quizName, payload);
  };

  const trackQuestionAnswered = (
    questionId: string,
    questionIndex: number,
    payload: Record<string, any> = {}
  ) => {
    dispatcherRef.current?.trackQuizQuestionAnswered(quizId, questionId, questionIndex, payload);
  };

  const trackQuizCompleted = (sessionId: string, payload: Record<string, any> = {}) => {
    dispatcherRef.current?.trackQuizCompleted(quizId, sessionId, payload);
  };

  const trackLeadIdentified = (contactId: string, payload: Record<string, any> = {}) => {
    dispatcherRef.current?.trackQuizLeadIdentified(quizId, contactId, payload);
  };

  const trackOutcomeSelected = (
    outcomeId: string,
    outcomeName: string,
    payload: Record<string, any> = {}
  ) => {
    dispatcherRef.current?.trackQuizOutcomeSelected(quizId, outcomeId, outcomeName, payload);
  };

  return {
    isReady: !isLoading && !!dispatcherRef.current,
    trackQuizStarted,
    trackQuestionAnswered,
    trackQuizCompleted,
    trackLeadIdentified,
    trackOutcomeSelected,
  };
}
