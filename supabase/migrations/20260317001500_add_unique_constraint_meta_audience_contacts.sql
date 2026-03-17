-- Adiciona constraint UNIQUE em (audience_id, contact_id) para permitir upsert correto
-- Sem isso, o PostgREST rejeita o onConflict silenciosamente e nenhum contato é gravado

ALTER TABLE public.meta_audience_contacts
  ADD CONSTRAINT meta_audience_contacts_audience_contact_unique
  UNIQUE (audience_id, contact_id);
