import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactIdentityEvent {
  id: string;
  contact_id: string;
  project_id: string;
  field_name: string;
  field_value: string;
  previous_value: string | null;
  source_type: string;
  source_id: string | null;
  source_name: string | null;
  confidence_score: number;
  is_declared: boolean;
  metadata: Record<string, any>;
  recorded_at: string;
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  survey: 'Pesquisa Inteligente',
  webhook: 'Webhook',
  csv_import: 'Importação CSV',
  manual: 'Edição Manual',
  social_listening: 'Social Listening',
  hotmart: 'Hotmart',
};

export const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  name: 'Nome',
  first_name: 'Primeiro Nome',
  last_name: 'Sobrenome',
  phone: 'Telefone',
  instagram: 'Instagram',
  document: 'CPF/Documento',
  city: 'Cidade',
  state: 'Estado',
  country: 'País',
};

export function useContactIdentityEvents(contactId: string | undefined) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['contact-identity-events', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('contact_identity_events')
        .select('*')
        .eq('contact_id', contactId)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data as ContactIdentityEvent[];
    },
    enabled: !!contactId,
  });

  // Group events by field to show latest value per field
  const latestByField = events?.reduce((acc, event) => {
    if (!acc[event.field_name] || new Date(event.recorded_at) > new Date(acc[event.field_name].recorded_at)) {
      acc[event.field_name] = event;
    }
    return acc;
  }, {} as Record<string, ContactIdentityEvent>);

  return {
    events,
    latestByField,
    isLoading,
  };
}
