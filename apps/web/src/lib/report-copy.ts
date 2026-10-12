import type { AnalysisIssue } from "./types";

// Only application-authored diagnostics are localized. Captured CV text remains intact.
export const reportTranslations: Record<string, string> = {
  "Primary contact email is missing.": "Birincil iletişim e-postası eksik.",
  "ATS parsers and recruiters require a direct email address to initiate correspondence.":
    "ATS sistemleri ve işe alım uzmanları iletişim kurmak için doğrudan bir e-posta adresine ihtiyaç duyar.",
  "Contact email format appears invalid.":
    "İletişim e-postasının biçimi geçersiz görünüyor.",
  "Phone number format is non-standard.":
    "Telefon numarasının biçimi standart değil.",
  "Use standard international or national format (e.g. +90 555 123 4567).":
    "Standart uluslararası veya ulusal biçimi kullanın (örn. +90 555 123 4567).",
  "Professional headline / title is missing.": "Mesleki başlık / unvan eksik.",
  "A targeted headline helps ATS index your profile against job titles.":
    "Hedefe uygun bir başlık, ATS sisteminin profilinizi iş unvanlarıyla eşleştirmesine yardımcı olur.",
  "Duplicate bullet text detected across experience records.":
    "Deneyim kayıtlarında aynı başarı maddesi tekrar ediyor.",
  "Paragraph-length bullets reduce ATS scanning accuracy and recruiter readability. Split into 2 concise bullets.":
    "Paragraf uzunluğundaki maddeler ATS taramasını ve okunabilirliği zorlaştırır. İki kısa maddeye ayırın.",
  "Experience entries appear out of reverse-chronological order.":
    "Deneyim kayıtları en yeniden en eskiye sıralanmamış görünüyor.",
  "Standard ATS parsers and human reviewers expect the most recent positions first.":
    "ATS sistemleri ve inceleyen kişiler en yeni pozisyonları önce görmeyi bekler.",
  "Company / employer name is missing.": "Şirket / işveren adı eksik.",
  "Every experience record must identify the employing entity.":
    "Her deneyim kaydında işverenin adı belirtilmelidir.",
  "Job position / title is missing.": "Pozisyon / iş unvanı eksik.",
  "ATS and recruiters require an explicit professional title.":
    "ATS sistemleri ve işe alım uzmanları açık bir mesleki unvana ihtiyaç duyar.",
  "Empty bullet point detected.": "Boş bir başarı maddesi bulundu.",
  "Blank bullet points create formatting artifacts.":
    "Boş başarı maddeleri biçim sorunlarına yol açar.",
  "Varying your action verbs highlights multiple facets of your accomplishments.":
    "Farklı eylem fiilleri kullanmak başarılarınızın farklı yönlerini öne çıkarır.",
  "Replace passive participation phrasing with concrete active verbs (e.g. Developed, Designed, Automated).":
    "Pasif katılım ifadeleri yerine somut eylem fiilleri kullanın (örn. geliştirdim, tasarladım, otomatikleştirdim).",
  "Educational institution name is missing.": "Eğitim kurumunun adı eksik.",
  "ATS parsers require an institution name to credit educational credentials.":
    "ATS sistemleri eğitim bilgilerini tanımak için kurum adına ihtiyaç duyar.",
  "This bullet may read more clearly with a specific action and contribution.":
    "Bu madde, belirli bir eylem ve katkı belirtilerek daha açık yazılabilir.",
  "If you know the outcome, consider adding it to this bullet.":
    "Sonucu biliyorsanız bu maddeye eklemeyi düşünebilirsiniz.",
  "A concrete outcome can add useful context; a number is optional and should only be included if accurate.":
    "Somut bir sonuç yararlı bağlam sağlayabilir; sayı kullanmak isteğe bağlıdır ve yalnızca doğruysa eklenmelidir.",
  "These experience dates overlap; concurrent roles can be valid.":
    "Bu deneyimlerin tarihleri çakışıyor; eş zamanlı roller geçerli olabilir.",
  "Review the dates if they were not concurrent.":
    "Eş zamanlı değilse tarihleri gözden geçirin.",
  "There is a gap of at least six months between dated roles.":
    "Tarihli roller arasında en az altı aylık bir boşluk görünüyor.",
  "If you want to, you can add any relevant activity for this period. No explanation is required.":
    "İsterseniz bu döneme ait ilgili bir etkinlik ekleyebilirsiniz. Açıklama zorunlu değildir.",
  "Target role or posting mentions this requirement, but no supporting bullet or skill was found.":
    "Hedef rol veya ilanda bu gereksinim geçiyor ancak destekleyen bir başarı maddesi ya da beceri bulunamadı.",
  "Complete contact profile with clear professional headline.":
    "İletişim bilgileri eksiksiz ve mesleki başlık açık.",
  "Well-categorized and indexed technical competencies.":
    "Teknik yetkinlikler iyi sınıflandırılmış ve düzenlenmiş.",
  "Documented academic and credential background.":
    "Eğitim ve yeterlilik geçmişi belgelenmiş.",
};

export function localizeReportText(text: string): string {
  if (reportTranslations[text]) return reportTranslations[text];
  const patterns: [RegExp, (match: RegExpMatchArray) => string][] = [
    [
      /^Bullet is excessively long \((\d+) words\)\.$/,
      (m) => `Başarı maddesi çok uzun (${m[1]} kelime).`,
    ],
    [
      /^Documented experience \((\d+) accomplishment bullets\)\.$/,
      (m) => `Deneyim belgelenmiş (${m[1]} başarı maddesi).`,
    ],
    [
      /^Consecutive bullets start with the identical verb \('(.+)'\)\.$/,
      (m) => `Ardışık maddeler aynı fiille başlıyor ('${m[1]}').`,
    ],
    [
      /^Vague opening detected: '(.+)'$/,
      (m) => `Belirsiz başlangıç tespit edildi: '${m[1]}'`,
    ],
    [
      /^'(.+)' does not match standard email syntax\.$/,
      (m) => `'${m[1]}' standart e-posta biçimine uymuyor.`,
    ],
    [
      /^This bullet is identical to the one in (experience-\d+-bullet-\d+)\.$/,
      (m) => `Bu madde ${m[1]} alanındaki maddeyle aynı.`,
    ],
    [
      /^Missing evidence for job keyword: '(.+)'\.$/,
      (m) => `İlan anahtar kelimesini destekleyen kanıt eksik: '${m[1]}'.`,
    ],
    [
      /^The phrase “(.+)” can sound vague or indirect\. Describe what you personally did, if useful\.$/,
      (m) =>
        `“${m[1]}” ifadesi belirsiz veya dolaylı kalabilir. Uygunsa, yaptığınız işi doğrudan belirtin.`,
    ],
    [
      /^Job description emphasizes (\d+) requirements not explicitly mentioned in your CV: (.+)\.$/,
      (m) =>
        `İlan açıklamasındaki ${m[1]} gereksinim özgeçmişinizde açıkça geçmiyor: ${m[2]}.`,
    ],
    [
      /^Strong alignment on (\d+) core competencies: (.+)\.$/,
      (m) => `${m[1]} temel yetkinlikte güçlü eşleşme: ${m[2]}.`,
    ],
    [
      /^Unrecognized heading '(.+)' preserved as Custom Section\.$/,
      (m) => `Tanınmayan '${m[1]}' başlığı özel bölüm olarak korundu.`,
    ],
    [
      /^(.+): unknown field; preserve it in a custom section\.$/,
      (m) => `${m[1]}: tanınmayan alan; özel bir bölümde koruyun.`,
    ],
    [
      /^Revision (\d+) loaded into draft\. Review and save\.$/,
      (m) => `${m[1]}. sürüm taslağa yüklendi. İnceleyip kaydedin.`,
    ],
    [
      /^Compatibility rating is (\d+)%\. Found (\d+) matching requirements and (\d+) missing keywords\.$/,
      (m) =>
        `Uyumluluk oranı %${m[1]}. ${m[2]} eşleşen gereksinim ve ${m[3]} eksik anahtar kelime bulundu.`,
    ],
  ];
  for (const [pattern, format] of patterns) {
    const match = text.match(pattern);
    if (match) return format(match);
  }
  return text;
}

export function localizeRuleIssue(
  issue: AnalysisIssue,
  language: string,
): AnalysisIssue {
  if (
    language !== "tr" ||
    !/^(ats-|fact-|content-|outcome-detail-|career-|job-match-)/.test(
      issue.ruleId,
    )
  )
    return issue;
  return {
    ...issue,
    message: localizeReportText(issue.message),
    suggestion: issue.suggestion
      ? localizeReportText(issue.suggestion)
      : issue.suggestion,
  };
}
