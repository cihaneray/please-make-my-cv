const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

const EN_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAME_MAP: Record<string, number> = {
  // English
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
  // Turkish
  oca: 0,
  ocak: 0,
  sub: 1,
  şub: 1,
  subat: 1,
  şubat: 1,
  mart: 2,
  nis: 3,
  nisan: 3,
  mayis: 4,
  mayıs: 4,
  haz: 5,
  haziran: 5,
  tem: 6,
  temmuz: 6,
  agu: 7,
  ağu: 7,
  agustos: 7,
  ağustos: 7,
  eyl: 8,
  eylül: 8,
  eylul: 8,
  eki: 9,
  ekim: 9,
  kas: 10,
  kasım: 10,
  kasim: 10,
  ara: 11,
  aralık: 11,
  aralik: 11,
};

export function formatResumeDate(
  dateStr?: string,
  language: string = "en",
): string {
  if (!dateStr || !dateStr.trim()) return "";
  const trimmed = dateStr.trim();
  const lower = trimmed.toLowerCase();
  const isTr = language === "tr";

  if (
    lower === "present" ||
    lower === "current" ||
    lower === "now" ||
    lower === "devam ediyor" ||
    lower === "günümüz" ||
    lower === "gunumuz" ||
    lower === "halen" ||
    lower === "şimdi"
  ) {
    return isTr ? "Devam Ediyor" : "Present";
  }

  // Check YYYY-MM or YYYY-M format
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      const monthLabel = isTr
        ? TR_MONTHS_SHORT[monthIdx]
        : EN_MONTHS_SHORT[monthIdx];
      return `${monthLabel} ${year}`;
    }
    return year;
  }

  // Check MM/YYYY format
  const slashMatch = trimmed.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (slashMatch) {
    const monthIdx = parseInt(slashMatch[1], 10) - 1;
    const year = slashMatch[2];
    if (monthIdx >= 0 && monthIdx < 12) {
      const monthLabel = isTr
        ? TR_MONTHS_SHORT[monthIdx]
        : EN_MONTHS_SHORT[monthIdx];
      return `${monthLabel} ${year}`;
    }
    return year;
  }

  // Check "Month YYYY" or "YYYY Month"
  const textParts = trimmed.split(/[\s,]+/);
  if (textParts.length === 2) {
    const p1 = textParts[0].toLowerCase();
    const p2 = textParts[1].toLowerCase();

    if (MONTH_NAME_MAP[p1] !== undefined && /^\d{4}$/.test(p2)) {
      const monthIdx = MONTH_NAME_MAP[p1];
      const monthLabel = isTr
        ? TR_MONTHS_SHORT[monthIdx]
        : EN_MONTHS_SHORT[monthIdx];
      return `${monthLabel} ${textParts[1]}`;
    }

    if (/^\d{4}$/.test(p1) && MONTH_NAME_MAP[p2] !== undefined) {
      const monthIdx = MONTH_NAME_MAP[p2];
      const monthLabel = isTr
        ? TR_MONTHS_SHORT[monthIdx]
        : EN_MONTHS_SHORT[monthIdx];
      return `${monthLabel} ${textParts[0]}`;
    }
  }

  // Fallback: if it's just a 4-digit year or any other string, return as is
  return trimmed;
}

export function formatDateRange(
  startDate?: string,
  endDate?: string,
  current?: boolean,
  language: string = "en",
): string {
  const isTr = language === "tr";
  const start = formatResumeDate(startDate, language);

  let end = "";
  if (current) {
    end = isTr ? "Devam Ediyor" : "Present";
  } else if (endDate) {
    end = formatResumeDate(endDate, language);
  }

  if (start && end) {
    return `${start} — ${end}`;
  }
  if (start) {
    return start;
  }
  if (end) {
    return end;
  }
  return "";
}
