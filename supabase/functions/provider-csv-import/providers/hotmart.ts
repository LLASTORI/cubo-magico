// supabase/functions/provider-csv-import/providers/hotmart.ts
// Validação server-side dos grupos normalizados vindos do browser

import type { NormalizedOrderGroup } from '../types.ts';

/** Valida e sanitiza um grupo antes de persistir */
export function validateGroup(group: NormalizedOrderGroup): string | null {
  if (!group.provider_order_id) return 'provider_order_id ausente';
  if (!group.status) return 'status ausente';
  if (!group.items || group.items.length === 0) return 'items vazio';
  if (group.customer_paid < 0) return `customer_paid negativo: ${group.customer_paid}`;

  for (const item of group.items) {
    if (!item.provider_product_id) return `item sem provider_product_id`;
    if (!item.item_type) return `item sem item_type`;
  }

  return null; // válido
}
