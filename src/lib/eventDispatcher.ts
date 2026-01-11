/**
 * Event Dispatcher - Client-side pixel dispatch system
 * Handles dispatching events to Meta Pixel, Google Ads, TikTok Pixel
 */

// System event types
export type SystemEventSource = 'quiz' | 'survey' | 'crm' | 'social' | 'checkout';

export type QuizEventName = 
  | 'quiz_started'
  | 'quiz_question_answered'
  | 'quiz_completed'
  | 'quiz_abandoned'
  | 'quiz_outcome_selected'
  | 'quiz_profile_updated'
  | 'quiz_lead_identified';

export type SurveyEventName =
  | 'survey_started'
  | 'survey_completed'
  | 'survey_abandoned';

export type CRMEventName =
  | 'contact_created'
  | 'contact_updated'
  | 'deal_created'
  | 'deal_won';

export type SystemEventName = QuizEventName | SurveyEventName | CRMEventName | string;

export interface SystemEvent {
  source: SystemEventSource;
  eventName: SystemEventName;
  payload: Record<string, any>;
  sessionId?: string;
  contactId?: string;
}

export interface DispatchRule {
  id: string;
  systemEvent: string;
  provider: 'meta' | 'google' | 'tiktok';
  providerEventName: string;
  payloadMapping: Record<string, any>;
  isEnabled: boolean;
}

export interface TrackingSettings {
  metaPixelId?: string;
  gtagId?: string;
  tiktokPixelId?: string;
  enableBrowserEvents: boolean;
  enableServerEvents: boolean;
}

export interface DispatchResult {
  provider: string;
  success: boolean;
  eventName: string;
  error?: string;
}

// Declare global window types for pixels
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    ttq?: {
      track: (...args: any[]) => void;
      identify: (...args: any[]) => void;
    };
    _fbq?: any;
  }
}

/**
 * Check if Meta Pixel is loaded
 */
export function isMetaPixelLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/**
 * Check if Google Tag is loaded
 */
export function isGtagLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Check if TikTok Pixel is loaded
 */
export function isTikTokPixelLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.ttq?.track === 'function';
}

/**
 * Initialize Meta Pixel
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;
  
  // Check if already initialized
  if (window.fbq) {
    console.log('[EventDispatcher] Meta Pixel already loaded');
    return;
  }

  // Load Meta Pixel script
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
  
  console.log('[EventDispatcher] Meta Pixel initialized:', pixelId);
}

/**
 * Initialize Google Tag
 */
export function initGtag(gtagId: string): void {
  if (typeof window === 'undefined') return;
  
  // Check if already initialized
  if (window.gtag) {
    console.log('[EventDispatcher] Gtag already loaded');
    return;
  }

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
  document.head.appendChild(script);

  const inlineScript = document.createElement('script');
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gtagId}');
  `;
  document.head.appendChild(inlineScript);
  
  console.log('[EventDispatcher] Gtag initialized:', gtagId);
}

/**
 * Initialize TikTok Pixel
 */
export function initTikTokPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;
  
  // Check if already initialized
  if (window.ttq) {
    console.log('[EventDispatcher] TikTok Pixel already loaded');
    return;
  }

  // Load TikTok Pixel script
  const script = document.createElement('script');
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  `;
  document.head.appendChild(script);
  
  console.log('[EventDispatcher] TikTok Pixel initialized:', pixelId);
}

/**
 * Map payload using mapping rules
 */
function mapPayload(
  payload: Record<string, any>,
  mapping: Record<string, any>
): Record<string, any> {
  if (!mapping || Object.keys(mapping).length === 0) {
    return payload;
  }

  const result: Record<string, any> = {};
  
  for (const [targetKey, sourceConfig] of Object.entries(mapping)) {
    if (typeof sourceConfig === 'string') {
      // Simple field mapping: { "value": "quiz_score" }
      if (sourceConfig.startsWith('$.')) {
        // JSON path-like syntax: $.payload.score
        const path = sourceConfig.slice(2).split('.');
        let value: any = payload;
        for (const key of path) {
          value = value?.[key];
        }
        if (value !== undefined) {
          result[targetKey] = value;
        }
      } else if (payload[sourceConfig] !== undefined) {
        result[targetKey] = payload[sourceConfig];
      }
    } else if (typeof sourceConfig === 'object' && sourceConfig !== null) {
      // Complex mapping with transform
      const { source, transform, default: defaultValue } = sourceConfig;
      let value = payload[source] ?? defaultValue;
      
      if (transform === 'string') {
        value = String(value);
      } else if (transform === 'number') {
        value = Number(value);
      } else if (transform === 'boolean') {
        value = Boolean(value);
      }
      
      if (value !== undefined) {
        result[targetKey] = value;
      }
    }
  }
  
  return result;
}

/**
 * Dispatch to Meta Pixel
 */
export function dispatchToMeta(
  eventName: string,
  payload: Record<string, any>
): DispatchResult {
  if (!isMetaPixelLoaded()) {
    return {
      provider: 'meta',
      success: false,
      eventName,
      error: 'Meta Pixel not loaded',
    };
  }

  try {
    // Standard events vs custom events
    const standardEvents = [
      'Lead', 'CompleteRegistration', 'ViewContent', 'Purchase',
      'AddToCart', 'InitiateCheckout', 'Subscribe', 'Contact',
      'Search', 'AddPaymentInfo', 'AddToWishlist', 'StartTrial',
    ];

    if (standardEvents.includes(eventName)) {
      window.fbq?.('track', eventName, payload);
    } else {
      window.fbq?.('trackCustom', eventName, payload);
    }

    console.log('[EventDispatcher] Meta event dispatched:', eventName, payload);
    
    return {
      provider: 'meta',
      success: true,
      eventName,
    };
  } catch (error: any) {
    return {
      provider: 'meta',
      success: false,
      eventName,
      error: error.message,
    };
  }
}

/**
 * Dispatch to Google Tag
 */
export function dispatchToGoogle(
  eventName: string,
  payload: Record<string, any>
): DispatchResult {
  if (!isGtagLoaded()) {
    return {
      provider: 'google',
      success: false,
      eventName,
      error: 'Gtag not loaded',
    };
  }

  try {
    window.gtag?.('event', eventName, payload);
    console.log('[EventDispatcher] Google event dispatched:', eventName, payload);
    
    return {
      provider: 'google',
      success: true,
      eventName,
    };
  } catch (error: any) {
    return {
      provider: 'google',
      success: false,
      eventName,
      error: error.message,
    };
  }
}

/**
 * Dispatch to TikTok Pixel
 */
export function dispatchToTikTok(
  eventName: string,
  payload: Record<string, any>
): DispatchResult {
  if (!isTikTokPixelLoaded()) {
    return {
      provider: 'tiktok',
      success: false,
      eventName,
      error: 'TikTok Pixel not loaded',
    };
  }

  try {
    window.ttq?.track(eventName, payload);
    console.log('[EventDispatcher] TikTok event dispatched:', eventName, payload);
    
    return {
      provider: 'tiktok',
      success: true,
      eventName,
    };
  } catch (error: any) {
    return {
      provider: 'tiktok',
      success: false,
      eventName,
      error: error.message,
    };
  }
}

/**
 * Main event dispatcher class
 */
export class EventDispatcher {
  private settings: TrackingSettings;
  private rules: DispatchRule[];
  private initialized: boolean = false;

  constructor(settings: TrackingSettings, rules: DispatchRule[] = []) {
    this.settings = settings;
    this.rules = rules;
  }

  /**
   * Initialize all configured pixels
   */
  initialize(): void {
    if (this.initialized) return;

    if (this.settings.metaPixelId) {
      initMetaPixel(this.settings.metaPixelId);
    }

    if (this.settings.gtagId) {
      initGtag(this.settings.gtagId);
    }

    if (this.settings.tiktokPixelId) {
      initTikTokPixel(this.settings.tiktokPixelId);
    }

    this.initialized = true;
    console.log('[EventDispatcher] Initialized with settings:', this.settings);
  }

  /**
   * Update settings dynamically
   */
  updateSettings(settings: TrackingSettings): void {
    this.settings = settings;
    // Re-initialize if needed
    this.initialized = false;
    this.initialize();
  }

  /**
   * Update dispatch rules
   */
  updateRules(rules: DispatchRule[]): void {
    this.rules = rules;
  }

  /**
   * Dispatch a system event
   */
  dispatch(event: SystemEvent): DispatchResult[] {
    if (!this.settings.enableBrowserEvents) {
      console.log('[EventDispatcher] Browser events disabled');
      return [];
    }

    const results: DispatchResult[] = [];
    
    // Find matching rules
    const matchingRules = this.rules.filter(
      rule => rule.systemEvent === event.eventName && rule.isEnabled
    );

    if (matchingRules.length === 0) {
      console.log('[EventDispatcher] No matching rules for event:', event.eventName);
      return results;
    }

    for (const rule of matchingRules) {
      // Map payload according to rule
      const mappedPayload = mapPayload(event.payload, rule.payloadMapping);
      
      // Add common fields
      const enrichedPayload = {
        ...mappedPayload,
        event_source: event.source,
        event_time: Math.floor(Date.now() / 1000),
      };

      // Dispatch to appropriate provider
      let result: DispatchResult;
      
      switch (rule.provider) {
        case 'meta':
          if (this.settings.metaPixelId) {
            result = dispatchToMeta(rule.providerEventName, enrichedPayload);
          } else {
            result = {
              provider: 'meta',
              success: false,
              eventName: rule.providerEventName,
              error: 'Meta Pixel not configured',
            };
          }
          break;
          
        case 'google':
          if (this.settings.gtagId) {
            result = dispatchToGoogle(rule.providerEventName, enrichedPayload);
          } else {
            result = {
              provider: 'google',
              success: false,
              eventName: rule.providerEventName,
              error: 'Gtag not configured',
            };
          }
          break;
          
        case 'tiktok':
          if (this.settings.tiktokPixelId) {
            result = dispatchToTikTok(rule.providerEventName, enrichedPayload);
          } else {
            result = {
              provider: 'tiktok',
              success: false,
              eventName: rule.providerEventName,
              error: 'TikTok Pixel not configured',
            };
          }
          break;
          
        default:
          result = {
            provider: rule.provider,
            success: false,
            eventName: rule.providerEventName,
            error: `Unknown provider: ${rule.provider}`,
          };
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Convenience methods for common quiz events
   */
  trackQuizStarted(quizId: string, quizName: string, payload: Record<string, any> = {}): DispatchResult[] {
    return this.dispatch({
      source: 'quiz',
      eventName: 'quiz_started',
      payload: { quiz_id: quizId, quiz_name: quizName, ...payload },
    });
  }

  trackQuizQuestionAnswered(
    quizId: string,
    questionId: string,
    questionIndex: number,
    payload: Record<string, any> = {}
  ): DispatchResult[] {
    return this.dispatch({
      source: 'quiz',
      eventName: 'quiz_question_answered',
      payload: { quiz_id: quizId, question_id: questionId, question_index: questionIndex, ...payload },
    });
  }

  trackQuizCompleted(
    quizId: string,
    sessionId: string,
    payload: Record<string, any> = {}
  ): DispatchResult[] {
    return this.dispatch({
      source: 'quiz',
      eventName: 'quiz_completed',
      sessionId,
      payload: { quiz_id: quizId, session_id: sessionId, ...payload },
    });
  }

  trackQuizLeadIdentified(
    quizId: string,
    contactId: string,
    payload: Record<string, any> = {}
  ): DispatchResult[] {
    return this.dispatch({
      source: 'quiz',
      eventName: 'quiz_lead_identified',
      contactId,
      payload: { quiz_id: quizId, contact_id: contactId, ...payload },
    });
  }

  trackQuizOutcomeSelected(
    quizId: string,
    outcomeId: string,
    outcomeName: string,
    payload: Record<string, any> = {}
  ): DispatchResult[] {
    return this.dispatch({
      source: 'quiz',
      eventName: 'quiz_outcome_selected',
      payload: { quiz_id: quizId, outcome_id: outcomeId, outcome_name: outcomeName, ...payload },
    });
  }
}

// Singleton instance for global use
let globalDispatcher: EventDispatcher | null = null;

export function getEventDispatcher(): EventDispatcher | null {
  return globalDispatcher;
}

export function setEventDispatcher(dispatcher: EventDispatcher): void {
  globalDispatcher = dispatcher;
}

export function createEventDispatcher(
  settings: TrackingSettings,
  rules: DispatchRule[] = []
): EventDispatcher {
  const dispatcher = new EventDispatcher(settings, rules);
  dispatcher.initialize();
  setEventDispatcher(dispatcher);
  return dispatcher;
}
