import type { ResumeDocument } from "./types";

export type ShareFinding = {
  id: string;
  kind: "link" | "placeholder" | "privacy";
  level: "warning" | "info";
  location: string;
  detail: string;
  action: string;
};

/** Local advisory for the current export content. Never contacts link destinations. */
export function checkResumeSharing(
  document: ResumeDocument,
  language: "en" | "tr" = "en",
): ShareFinding[] {
  const tr = language === "tr";
  const findings: ShareFinding[] = [];
  const label = (en: string, turkish: string) => (tr ? turkish : en);
  const text = (location: string, value: string) => {
    if (!value?.trim()) return;
    if (
      /(?:\b(?:TODO|TBD|FIXME)\b|lorem ipsum|\[(?:your name|company name|insert[^\]]*|adınız|şirket adı|buraya[^\]]*)\]|^(?:insert (?:text|summary|description) here|metni buraya yazın)$)/iu.test(
        value,
      )
    ) {
      findings.push({
        id: `placeholder-${location}`,
        kind: "placeholder",
        level: "warning",
        location,
        detail: value.trim().slice(0, 200),
        action: label(
          "Review this possible draft placeholder before sharing.",
          "Paylaşmadan önce bu olası taslak metnini gözden geçirin.",
        ),
      });
    }
  };
  const link = (location: string, value: string) => {
    if (!value?.trim()) return;
    const raw = value.trim();
    let reason = "";
    if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw))
      reason = label("Unsupported URL scheme", "Desteklenmeyen bağlantı türü");
    else {
      try {
        const parsed = new URL(
          /^https?:\/\//i.test(raw) ? raw : `https://${raw}`,
        );
        if (
          /\s/.test(raw) ||
          /[\u0000-\u001f]/.test(raw) ||
          !parsed.hostname ||
          (!parsed.hostname.includes(".") &&
            parsed.hostname !== "localhost" &&
            !parsed.hostname.startsWith("["))
        )
          reason = label(
            "Malformed or incomplete URL",
            "Bozuk veya eksik bağlantı",
          );
        else if (parsed.username || parsed.password)
          reason = label(
            "URL contains embedded credentials",
            "Bağlantıda kullanıcı adı veya parola var",
          );
        else if (isLocalHost(parsed.hostname))
          reason = label(
            "Private or local address; recipients may not be able to open it",
            "Özel veya yerel adres; alıcı bu bağlantıyı açamayabilir",
          );
        else if (parsed.protocol === "http:")
          reason = label(
            "Unencrypted HTTP link",
            "Şifrelenmemiş HTTP bağlantısı",
          );
      } catch {
        reason = label(
          "Malformed or incomplete URL",
          "Bozuk veya eksik bağlantı",
        );
      }
    }
    if (reason)
      findings.push({
        id: `link-${location}`,
        kind: "link",
        level: "warning",
        location,
        detail: reason,
        action: label(
          "Check and correct the address in the editor. Link availability is not tested.",
          "Adresi düzenleme panelinde kontrol edip düzeltin. Bağlantının erişilebilirliği test edilmez.",
        ),
      });
  };
  const profile = label("Profile", "Profil");
  for (const [key, value] of Object.entries(document.profile))
    if (typeof value === "string" && key !== "photo")
      text(`${profile} · ${key}`, value);
  for (const key of ["website", "linkedin", "github"] as const)
    link(`${profile} · ${key}`, document.profile[key]);
  document.profile.links.forEach((item, index) => {
    const location = `${profile} · ${item.label || label("Link", "Bağlantı")} ${index + 1}`;
    link(location, item.url);
    text(location, item.label);
  });
  const fields = [
    document.profile.email && label("email", "e-posta"),
    document.profile.phone && label("phone", "telefon"),
    document.profile.location && label("location", "konum"),
  ].filter(Boolean);
  if (fields.length)
    findings.push({
      id: "privacy-contact",
      kind: "privacy",
      level: "info",
      location: profile,
      detail: `${label("Included in the shared CV", "Paylaşılan CV'de yer alır")}: ${fields.join(", ")}.`,
      action: label(
        "Confirm you want to share these contact details. Use anonymous export or edit the profile for a less personal copy.",
        "Bu iletişim bilgilerini paylaşmak istediğinizi doğrulayın. Daha az kişisel bir kopya için anonim dışa aktarımı kullanın veya profili düzenleyin.",
      ),
    });
  if (document.profile.photo && document.visibility.showPhoto)
    findings.push({
      id: "privacy-photo",
      kind: "privacy",
      level: "info",
      location: profile,
      detail: label(
        "Your profile photo is visible.",
        "Profil fotoğrafınız görünür.",
      ),
      action: label(
        "Keep it if appropriate for this application, or hide it in the profile settings.",
        "Bu başvuru için uygunsa koruyun veya profil ayarlarında gizleyin.",
      ),
    });
  if (document.visibility.showSummary)
    text(label("Summary", "Özet"), document.summary);
  const scanEntries = (section: string, entries: Array<object>) =>
    entries.forEach((entry, index) =>
      Object.entries(entry).forEach(([key, value]) => {
        if (["id", "url", "credentialUrl"].includes(key)) return;
        const location = `${section} ${index + 1} · ${key}`;
        if (typeof value === "string") text(location, value);
        else if (Array.isArray(value))
          value.forEach((item, n) => {
            if (typeof item === "string") text(`${location} ${n + 1}`, item);
          });
      }),
    );
  if (document.visibility.showExperience)
    scanEntries(label("Experience", "İş deneyimi"), document.experience);
  if (document.visibility.showEducation)
    scanEntries(label("Education", "Eğitim"), document.education);
  if (document.visibility.showProjects) {
    scanEntries(label("Projects", "Projeler"), document.projects);
    document.projects.forEach((item, index) =>
      link(`${label("Project", "Proje")} ${index + 1}`, item.url),
    );
  }
  if (document.visibility.showSkills)
    scanEntries(label("Skills", "Yetenekler"), document.skills);
  if (document.visibility.showLanguages)
    scanEntries(label("Languages", "Diller"), document.languages);
  if (document.visibility.showCertifications) {
    scanEntries(
      label("Certifications", "Sertifikalar"),
      document.certifications,
    );
    document.certifications.forEach((item, index) =>
      link(
        `${label("Certification", "Sertifika")} ${index + 1}`,
        item.credentialUrl,
      ),
    );
  }
  document.customSections.forEach((section) => {
    text(label("Custom section", "Özel bölüm"), section.title);
    scanEntries(
      section.title || label("Custom section", "Özel bölüm"),
      section.items,
    );
  });
  return findings;
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (!host.includes(".") && !host.includes(":"))
  )
    return true;
  if (host.includes(":"))
    return (
      host === "::" ||
      host === "::1" ||
      /^(?:fc|fd|fe[89ab])/i.test(host) ||
      host.startsWith("::ffff:")
    );
  const octets = host.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  )
    return false;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}
