/**
 * Format a Date to a YYYY-MM-DD string using LOCAL time (not UTC).
 *
 * Using `date.toISOString().split("T")[0]` converts to UTC first,
 * which shifts the date backward in positive-UTC-offset timezones
 * (e.g. midnight Feb 1 in UTC+2 becomes Jan 31 in UTC).
 */
export function toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
