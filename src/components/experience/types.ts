/**
 * Experience Engine Base Types
 * 
 * Shared types for Quiz and Survey modules.
 * This creates a unified data model for both features.
 */

export interface ExperienceTheme {
  primary_color: string;
  text_color: string;
  secondary_text_color: string;
  input_text_color: string;
  background_color: string;
  background_image?: string;
  logo_url?: string;
  show_progress: boolean;
  one_question_per_page: boolean;

  /** Start screen benefits list colors (Quiz) */
  benefits_text_color?: string;
  benefits_icon_color?: string;

  /** Option button colors */
  option_background_color?: string;
  option_hover_color?: string;
  option_text_color?: string;
  option_border_color?: string;
}

export interface CTAButton {
  id: string;
  label: string;
  url: string;
  style: 'primary' | 'secondary' | 'outline';
  open_in_new_tab: boolean;
}

export interface ExperienceCompletionConfig {
  enable_auto_redirect: boolean;
  redirect_url?: string;
  redirect_delay_seconds: number;
  cta_buttons: CTAButton[];
  reward_message?: string;
  reward_highlight?: string;
}

export interface ExperienceStartScreen {
  headline?: string;
  subheadline?: string;
  description?: string;
  image_url?: string;
  cta_text?: string;
  estimated_time?: string;
  benefits?: string[];
}

export interface ExperienceEndScreen {
  headline?: string;
  subheadline?: string;
  image_url?: string;
  cta_text?: string;
  cta_url?: string;
  show_results?: boolean;
  show_share?: boolean;
}

export interface ExperienceMessages {
  welcome_message?: string;
  thank_you_message?: string;
}

export interface ExperienceConfig {
  theme: ExperienceTheme;
  completion: ExperienceCompletionConfig;
  start_screen: ExperienceStartScreen;
  end_screen: ExperienceEndScreen;
  messages: ExperienceMessages;
}

export const DEFAULT_THEME: ExperienceTheme = {
  primary_color: '#6366f1',
  text_color: '#1e293b',
  secondary_text_color: '#64748b',
  input_text_color: '#1e293b',
  background_color: '#f8fafc',
  show_progress: true,
  one_question_per_page: true,

  benefits_text_color: '#64748b',
  benefits_icon_color: '#6366f1',

  // Option colors with good contrast
  option_background_color: '#1e293b',
  option_hover_color: '#334155',
  option_text_color: '#ffffff',
  option_border_color: '#334155',
};

/** Professional color palettes for templates */
export const TEMPLATE_PALETTES = {
  // Modern Dark - sleek dark options on light bg
  modern_dark: {
    option_background_color: '#1e293b',
    option_hover_color: '#334155',
    option_text_color: '#ffffff',
    option_border_color: '#334155',
  },
  // Ocean Blue - professional blue tones
  ocean: {
    option_background_color: '#0f172a',
    option_hover_color: '#1e3a5f',
    option_text_color: '#ffffff',
    option_border_color: '#1e3a5f',
  },
  // Emerald - fresh green
  emerald: {
    option_background_color: '#064e3b',
    option_hover_color: '#047857',
    option_text_color: '#ffffff',
    option_border_color: '#047857',
  },
  // Minimal Light - subtle light theme
  minimal_light: {
    option_background_color: '#ffffff',
    option_hover_color: '#f1f5f9',
    option_text_color: '#1e293b',
    option_border_color: '#e2e8f0',
  },
  // Warm - warm coral tones
  warm: {
    option_background_color: '#7c2d12',
    option_hover_color: '#9a3412',
    option_text_color: '#ffffff',
    option_border_color: '#9a3412',
  },
};

export const DEFAULT_COMPLETION_CONFIG: ExperienceCompletionConfig = {
  enable_auto_redirect: false,
  redirect_delay_seconds: 5,
  cta_buttons: [],
};

export const DEFAULT_START_SCREEN: ExperienceStartScreen = {
  headline: '',
  subheadline: '',
  cta_text: 'Começar',
  estimated_time: '2 minutos',
  benefits: [],
};

export const DEFAULT_END_SCREEN: ExperienceEndScreen = {
  headline: 'Obrigado!',
  subheadline: 'Sua participação é muito importante.',
  show_results: false,
  show_share: true,
};
