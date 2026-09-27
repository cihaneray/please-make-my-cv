export function normalizeUrl(url?: string): string {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function cleanDisplayUrl(url?: string): string {
  if (!url || !url.trim()) return '';
  return url.trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

export function cleanPhone(phone?: string): string {
  if (!phone || !phone.trim()) return '';
  return phone.trim();
}

export function cleanEmail(email?: string): string {
  if (!email || !email.trim()) return '';
  return email.trim();
}
