import { LaunchPhase } from '@/hooks/useLaunchPhases';

export type EditionStatus = 'planned' | 'active' | 'finished';

export interface LaunchEdition {
  id: string;
  funnel_id: string;
  project_id: string;
  name: string;
  edition_number: number;
  event_datetime: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  status: EditionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaunchEditionInsert {
  funnel_id: string;
  project_id: string;
  name: string;
  edition_number?: number;
  event_datetime?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  status?: EditionStatus;
  notes?: string | null;
}

export interface LaunchEditionWithPhases extends LaunchEdition {
  phases: LaunchPhase[];
}
