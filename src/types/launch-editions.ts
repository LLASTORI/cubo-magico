import { LaunchPhase } from '@/hooks/useLaunchPhases';

export type EditionStatus = 'planned' | 'active' | 'finished';

export interface LaunchEdition {
  id: string;
  funnel_id: string;
  project_id: string;
  name: string;
  edition_number: number;
  event_date: string | null;
  start_date: string | null;
  end_date: string | null;
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
  event_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: EditionStatus;
  notes?: string | null;
}

export interface LaunchEditionWithPhases extends LaunchEdition {
  phases: LaunchPhase[];
}
