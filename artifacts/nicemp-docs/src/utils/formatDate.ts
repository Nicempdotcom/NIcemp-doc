import { PreferencesRepository } from '@/services/storage/PreferencesRepository';

/**
 * Formats an ISO timestamp according to the user's Regionalização preferences
 * (date format + timezone), set in Configurações. Falls back to the browser's
 * local timezone if the stored one is invalid/unsupported.
 */
export function formatDate(iso: string, options: { withTime?: boolean } = {}): string {
  const { dateFormat, timezone } = PreferencesRepository.get();
  const date = new Date(iso);

  const baseOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(options.withTime ? { hour: '2-digit' as const, minute: '2-digit' as const, hour12: false } : {}),
  };

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { ...baseOptions, timeZone: timezone }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', baseOptions).formatToParts(date);
  }

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = get('day');
  const month = get('month');
  const year = get('year');
  const datePart = dateFormat === 'MM/dd/yyyy' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;

  if (!options.withTime) return datePart;
  return `${datePart} ${get('hour')}:${get('minute')}`;
}
