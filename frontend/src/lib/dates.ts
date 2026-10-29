/**
 * Shared date display format across the app: "11 Aug 2026", not "2026-11-08".
 * Accepts either a date-only ISO string ("2026-11-08") or a SQLite
 * datetime string ("2026-10-25 01:20:27") - both are treated as UTC so the
 * displayed day never shifts with the viewer's timezone.
 */
export function formatDate(value: string): string {
  const iso = value.includes(" ") ? value.replace(" ", "T") + "Z" : `${value}T00:00:00Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
