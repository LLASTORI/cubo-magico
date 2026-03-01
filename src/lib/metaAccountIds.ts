/**
 * Meta account ID helpers.
 *
 * Meta data may be persisted with account IDs in different formats across sync generations:
 * - "act_1234567890"
 * - "1234567890"
 *
 * To avoid empty dashboards due to format mismatch, we always query with both variants.
 */

export const normalizeMetaAccountId = (accountId: string | null | undefined): string => {
  const raw = (accountId || '').trim();
  if (!raw) return '';
  return raw.toLowerCase().startsWith('act_') ? raw.slice(4) : raw;
};

export const getMetaAccountIdVariants = (accountId: string | null | undefined): string[] => {
  const normalized = normalizeMetaAccountId(accountId);
  if (!normalized) return [];
  return [normalized, `act_${normalized}`];
};

export const expandMetaAccountIds = (accountIds: Array<string | null | undefined>): string[] => {
  const variants = accountIds.flatMap(getMetaAccountIdVariants);
  return Array.from(new Set(variants)).sort();
};
