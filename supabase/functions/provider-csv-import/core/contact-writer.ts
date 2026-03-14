// supabase/functions/provider-csv-import/core/contact-writer.ts

import type { NormalizedOrderGroup } from '../types.ts';

export interface ContactWriteResult {
  contact_id: string | null;
  action: 'created' | 'updated' | 'found' | 'skipped_no_email';
}

export async function writeContact(
  supabase: any,
  projectId: string,
  group: NormalizedOrderGroup,
): Promise<ContactWriteResult> {
  const email = group.buyer_email;

  // Sem email: importar pedido sem vínculo CRM (nunca descartar)
  if (!email) {
    return { contact_id: null, action: 'skipped_no_email' };
  }

  // Buscar contato existente por email
  const { data: existing } = await supabase
    .from('crm_contacts')
    .select('id, name, phone, document, instagram, country')
    .eq('project_id', projectId)
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    // Complementar apenas campos NULL (nunca sobrescrever)
    const updates: Record<string, string> = {};
    if (!existing.name && group.buyer_name) updates.name = group.buyer_name;
    if (!existing.phone && group.buyer_phone) updates.phone = group.buyer_phone;
    if (!existing.document && group.buyer_document) updates.document = group.buyer_document;
    if (!existing.instagram && group.buyer_instagram) updates.instagram = group.buyer_instagram;
    if (!existing.country && group.buyer_country) updates.country = group.buyer_country;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('crm_contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return { contact_id: existing.id, action: 'updated' };
    }

    return { contact_id: existing.id, action: 'found' };
  }

  // Criar novo contato
  const { data: newContact, error } = await supabase
    .from('crm_contacts')
    .insert({
      project_id: projectId,
      email,
      name: group.buyer_name,
      phone: group.buyer_phone,
      document: group.buyer_document,
      instagram: group.buyer_instagram,
      country: group.buyer_country,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ContactWriter] Error creating contact:', error.message);
    return { contact_id: null, action: 'skipped_no_email' };
  }

  return { contact_id: newContact.id, action: 'created' };
}
