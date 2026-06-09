export const APP_TIME_ZONE = 'America/Manaus';

const recordDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const weightFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatRecordDateTime(value: string): string {
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = hasTimeZone ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? value : recordDateTimeFormatter.format(date);
}

export function formatWeight(value: number): string {
  return weightFormatter.format(value);
}

export function formatDateInAppTimeZone(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}
