/**
 * Shared helpers for converting between ISO datetime strings and
 * HTML `<input type="datetime-local">` values.
 *
 * Datetime-local inputs work with strings like "2026-03-15T14:30"
 * (no timezone suffix). These helpers bridge the gap between that
 * format and full ISO-8601 timestamps stored in the database.
 */

/**
 * Convert an ISO datetime string to a value suitable for
 * `<input type="datetime-local">`. Returns empty string when null.
 *
 * The conversion accounts for the user's local timezone so the
 * input shows the correct wall-clock time (typically São Paulo UTC-3).
 */
export function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

/**
 * Convert a datetime-local input value (e.g. "2026-03-15T14:30")
 * back to a full ISO-8601 string with the local timezone offset.
 */
export function datetimeLocalToIso(value: string): string {
  const d = new Date(value);
  return d.toISOString();
}
