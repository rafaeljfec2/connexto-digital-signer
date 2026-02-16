export function formatMediumDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export function formatRelativeDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale.startsWith('pt')) {
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${String(diffMin)} min`;
    if (diffHours < 24) return `há ${String(diffHours)}h`;
    if (diffDays === 1) return 'ontem';
    return `há ${String(diffDays)} dias`;
  }

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${String(diffDays)}d ago`;
}
