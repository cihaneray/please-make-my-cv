export interface SectionTitles {
  summary: string;
  experience: string;
  education: string;
  projects: string;
  skills: string;
  certifications: string;
  languages: string;
  present: string;
  technologies: string;
}

export function getSectionTitles(
  language: string = "en",
  templateId: string = "minimal",
): SectionTitles {
  const isTr = language === "tr";

  if (isTr) {
    return {
      summary: templateId === "technical" ? "ÖZET & ODAK ALANLARI" : "ÖZET",
      experience:
        templateId === "professional"
          ? "İŞ DENEYİMİ & KARİYER GEÇMİŞİ"
          : "İŞ DENEYİMİ",
      education: "EĞİTİM",
      projects:
        templateId === "technical"
          ? "TEKNİK PROJELER & AÇIK KAYNAK"
          : "PROJELER",
      skills:
        templateId === "technical" ? "TEKNİK YETKİNLİKLER" : "YETKİNLİKLER",
      certifications: "SERTİFİKALAR & LİSANSLAR",
      languages: "YABANCI DİLLER",
      present: "Devam Ediyor",
      technologies: "Teknolojiler",
    };
  }

  return {
    summary: templateId === "technical" ? "TECHNICAL SUMMARY" : "SUMMARY",
    experience:
      templateId === "professional" ? "PROFESSIONAL EXPERIENCE" : "EXPERIENCE",
    education: "EDUCATION",
    projects: templateId === "technical" ? "TECHNICAL PROJECTS" : "PROJECTS",
    skills:
      templateId === "technical" ? "TECHNICAL SKILLS" : "SKILLS & COMPETENCIES",
    certifications: "CERTIFICATIONS",
    languages: "LANGUAGES",
    present: "Present",
    technologies: "Technologies",
  };
}
