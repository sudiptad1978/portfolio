/** Hand-rolled date formatting — no Intl dependency at the edge. */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** 'YYYY-MM' | 'YYYY-MM-DD' → 'Jun 2021' */
export function formatMonthYear(iso: string): string {
  const [year, month] = iso.split('-');
  const idx = month ? Number(month) - 1 : null;
  return idx !== null && MONTHS[idx] !== undefined ? `${MONTHS[idx]} ${year}` : year;
}

/** '2021-06' + null → 'Jun 2021 — Present' */
export function formatDateRange(start: string, end: string | null): string {
  return end
    ? `${formatMonthYear(start)} — ${formatMonthYear(end)}`
    : `${formatMonthYear(start)} — Present`;
}

/** ISO datetime → '10 Sep 2026' */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
