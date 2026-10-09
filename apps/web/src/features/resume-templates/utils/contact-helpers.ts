export function normalizeUrl(url?: string): string | undefined {
  if (!url || !url.trim()) return undefined;
  const trimmed = url.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed))
    return undefined;
  try {
    const parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    return parsed.hostname && !parsed.username && !parsed.password
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function cleanDisplayUrl(url?: string): string {
  if (!url || !url.trim()) return "";
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

export function cleanPhone(phone?: string): string {
  if (!phone || !phone.trim()) return "";
  return phone.trim();
}

export function cleanEmail(email?: string): string {
  if (!email || !email.trim()) return "";
  return email.trim();
}
