/**
 * Campaign pattern matcher utilities.
 *
 * Goals:
 * - Preserve support for special chars, numbers, uppercase/lowercase.
 * - Be resilient to unicode composition differences and extra spaces.
 * - Optionally support wildcard patterns: `*` and `%`.
 */

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const removeDiacritics = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeCaseWhitespace = (value: string): string =>
  collapseWhitespace(value).toLocaleLowerCase('pt-BR');

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasWildcards = (pattern: string): boolean => /[*%]/.test(pattern);

const wildcardToRegex = (pattern: string): RegExp => {
  // Escape everything first, then re-enable wildcard tokens.
  const escaped = escapeRegex(pattern)
    .replace(/\\\*/g, '.*')
    .replace(/%/g, '.*');
  return new RegExp(escaped, 'i');
};

export const normalizeCampaignMatchValue = (value: string | null | undefined): string =>
  normalizeCaseWhitespace(value || '');

export const normalizeCampaignMatchValueNoDiacritics = (value: string | null | undefined): string =>
  normalizeCaseWhitespace(removeDiacritics(value || ''));

/**
 * Canonical matcher used by Funnel and Launch screens.
 *
 * Matching strategy:
 * 1) Case-insensitive + whitespace-normalized direct includes (keeps special chars).
 * 2) Diacritics-insensitive includes fallback.
 * 3) If pattern contains `*` or `%`, treat it as wildcard (regex) on both normalized modes.
 */
export const matchesCampaignPattern = (
  campaignName: string | null | undefined,
  pattern: string | null | undefined
): boolean => {
  const normalizedCampaign = normalizeCampaignMatchValue(campaignName);
  const normalizedPattern = normalizeCampaignMatchValue(pattern);

  if (!normalizedCampaign || !normalizedPattern) return false;

  if (hasWildcards(normalizedPattern)) {
    const regex = wildcardToRegex(normalizedPattern);
    if (regex.test(normalizedCampaign)) return true;

    const normalizedCampaignNoDiacritics = normalizeCampaignMatchValueNoDiacritics(campaignName);
    const normalizedPatternNoDiacritics = normalizeCampaignMatchValueNoDiacritics(pattern);
    return wildcardToRegex(normalizedPatternNoDiacritics).test(normalizedCampaignNoDiacritics);
  }

  if (normalizedCampaign.includes(normalizedPattern)) return true;

  const normalizedCampaignNoDiacritics = normalizeCampaignMatchValueNoDiacritics(campaignName);
  const normalizedPatternNoDiacritics = normalizeCampaignMatchValueNoDiacritics(pattern);
  return normalizedCampaignNoDiacritics.includes(normalizedPatternNoDiacritics);
};
