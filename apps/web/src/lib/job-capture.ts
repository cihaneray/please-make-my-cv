export interface CapturedJob {
  company: string;
  position: string;
  description: string;
  sourceUrl: string;
  location?: string;
}

/** Accept only reviewed plain text; the fragment is never an API command. */
export function parseJobCapture(hash: string): CapturedJob | null {
  if (!hash.startsWith("#job-import=") || hash.length > 80012) return null;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(hash.slice(12)));
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const fields = value as Record<string, unknown>;
    const bounds = {
      company: 255,
      position: 255,
      description: 20000,
      sourceUrl: 2048,
    };
    const result: Record<string, string> = {};
    for (const [key, limit] of Object.entries(bounds)) {
      const text = fields[key];
      if (
        typeof text !== "string" ||
        !text.trim() ||
        text.length > limit ||
        text.includes("\u0000")
      )
        return null;
      result[key] = text.trim();
    }
    const source = new URL(result.sourceUrl);
    if (fields.location !== undefined) {
      if (
        typeof fields.location !== "string" ||
        fields.location.length > 255 ||
        fields.location.includes("\u0000")
      )
        return null;
      result.location = fields.location.trim();
    }
    if (
      !["http:", "https:"].includes(source.protocol) ||
      source.username ||
      source.password
    )
      return null;
    return result as unknown as CapturedJob;
  } catch {
    return null;
  }
}
