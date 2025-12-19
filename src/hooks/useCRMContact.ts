import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

export interface CRMContact {
  id: string;
  project_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  phone_country_code: string | null;
  phone_ddd: string | null;
  document: string | null;
  instagram: string | null;
  avatar_url: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  cep: string | null;
  source: string;
  status: string;
  tags: string[] | null;
  notes: string | null;
  pipeline_stage_id: string | null;
  first_utm_source: string | null;
  first_utm_campaign: string | null;
  first_utm_medium: string | null;
  first_utm_content: string | null;
  first_utm_term: string | null;
  first_utm_adset: string | null;
  first_utm_ad: string | null;
  first_utm_creative: string | null;
  first_utm_placement: string | null;
  first_page_name: string | null;
  total_purchases: number | null;
  total_revenue: number | null;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  first_seen_at: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export function useCRMContact(contactId?: string) {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['crm-contact', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) throw error;
      return data as CRMContact;
    },
    enabled: !!contactId,
  });

  const updateContact = useMutation({
    mutationFn: async (updates: Partial<CRMContact>) => {
      if (!contactId) throw new Error('No contact ID');

      const { data, error } = await supabase
        .from('crm_contacts')
        .update(updates)
        .eq('id', contactId)
        .select('*')
        .single();

      if (error) throw error;
      return data as CRMContact;
    },
    onSuccess: async (updatedContact) => {
      queryClient.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-journey'] });
      // Ensure WhatsApp UI (conversations list/chat panels) stays in sync after contact edits
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

      // If there is an existing WhatsApp conversation for this contact, keep remote_jid aligned
      // so sending messages doesn't break when the phone/DDI/DDD changes.
      try {
        if (updatedContact.phone) {
          const digits = `${updatedContact.phone_country_code || '55'}${updatedContact.phone_ddd || ''}${updatedContact.phone}`
            .replace(/\D/g, '');

          if (digits.length >= 10) {
            const remoteJid = `${digits}@s.whatsapp.net`;
            await supabase
              .from('whatsapp_conversations')
              .update({ remote_jid: remoteJid })
              .eq('project_id', updatedContact.project_id)
              .eq('contact_id', updatedContact.id);
          }
        }
      } catch (e) {
        console.warn('Could not sync WhatsApp remote_jid for contact update', e);
      }

      toast.success('Contato atualizado');
    },
    onError: (error) => {
      console.error('Error updating contact:', error);
      toast.error('Erro ao atualizar contato');
    },
  });

  const updatePipelineStage = useMutation({
    mutationFn: async (stageId: string | null) => {
      if (!contactId) throw new Error('No contact ID');

      const { error } = await supabase
        .from('crm_contacts')
        .update({ pipeline_stage_id: stageId })
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-journey'] });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      if (!contactId) throw new Error('No contact ID');

      const { error } = await supabase
        .from('crm_contacts')
        .update({ notes })
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      toast.success('Notas salvas');
    },
    onError: () => {
      toast.error('Erro ao salvar notas');
    },
  });

  const addTag = useMutation({
    mutationFn: async (tag: string) => {
      if (!contactId || !contact) throw new Error('No contact');
      
      const currentTags = contact.tags || [];
      if (currentTags.includes(tag)) return;

      const { error } = await supabase
        .from('crm_contacts')
        .update({ tags: [...currentTags, tag] })
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      toast.success('Tag adicionada');
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tag: string) => {
      if (!contactId || !contact) throw new Error('No contact');

      const currentTags = contact.tags || [];
      const { error } = await supabase
        .from('crm_contacts')
        .update({ tags: currentTags.filter(t => t !== tag) })
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contact', contactId] });
      toast.success('Tag removida');
    },
  });

  const deleteContact = useMutation({
    mutationFn: async () => {
      if (!contactId) throw new Error('No contact ID');

      const { error } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all contact-related queries to ensure counts are accurate
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-journey'] });
      queryClient.invalidateQueries({ queryKey: ['crm-all-contacts-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['crm-all-transactions-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['crm-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Contato excluído');
    },
    onError: (error) => {
      console.error('Error deleting contact:', error);
      toast.error('Erro ao excluir contato');
    },
  });

  return {
    contact,
    isLoading,
    error,
    updateContact,
    updatePipelineStage,
    updateNotes,
    addTag,
    removeTag,
    deleteContact,
  };
}
