'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'tr';

export const translations = {
  en: {
    // Navigation
    home: 'Home',
    resumes: 'Resumes',
    jobs: 'Target Jobs',
    library: 'Career Library',
    templates: 'Templates',
    settings: 'Settings',
    importCv: 'Import CV',
    personalTeam: 'Personal Team',

    // Header
    searchPlaceholder: 'Quick search or jump to section...',
    newResume: 'New Resume',
    newDocument: 'New Document',
    import: 'Import',

    // Dashboard
    dashboard: 'Dashboard',
    dashboardTitle: 'CV Workspace',
    dashboardSubtitle: 'Simple, focused career and resume management',
    recentResumes: 'Recent Resumes',
    targetPositions: 'Target Positions',
    librarySnippets: 'Library Snippets',
    lastEdited: 'Last edited',
    statusSaved: 'Saved',
    statusApplied: 'Applied',
    statusInterviewing: 'Interviewing',
    viewAll: 'View All',
    openStudio: 'Open Studio',
    duplicate: 'Duplicate',
    delete: 'Delete',
    exportPdf: 'Export PDF',
    noResumes: 'No resumes found. Create your first resume!',

    // Studio Tabs & Actions
    contentTab: 'Content',
    sourceTab: 'Source',
    designTab: 'Design',
    reviewTab: 'Review',
    saveDraft: 'Save Draft',
    saving: 'Saving...',
    exporting: 'Exporting...',
    sections: 'Sections',

    // Profile & Sections
    personalProfile: 'Personal Profile',
    core: 'Core',
    firstName: 'First Name',
    lastName: 'Last Name',
    professionalTitle: 'Professional Title',
    email: 'Email Address',
    phone: 'Phone',
    location: 'Location',
    website: 'Website / Portfolio',
    linkedin: 'LinkedIn',
    github: 'GitHub',

    summary: 'Professional Summary',
    summaryPlaceholder: 'Write a clear, impactful overview of your career and accomplishments...',
    improveWithAi: 'Improve',

    experience: 'Work Experience',
    addRole: 'Add Role',
    jobTitle: 'Job Title',
    company: 'Company',
    dates: 'Dates (e.g. 2022 — Present)',
    achievements: 'Achievements:',
    addBullet: 'Add Bullet',
    aiPolish: 'AI Polish Bullet',

    education: 'Education',
    addEducation: 'Add Education',
    degree: 'Degree',
    fieldOfStudy: 'Field of Study',
    institution: 'Institution / University',

    projects: 'Projects',
    addProject: 'Add Project',
    projectName: 'Project Name',
    projectRole: 'Role',
    projectUrl: 'Project URL',

    skills: 'Skill Groups',
    addCategory: 'Add Category',
    skillsListPlaceholder: 'Comma-separated skills (e.g. Python, Docker, React)',

    // Design tab
    designAndTypography: 'Design & Typography',
    visualTemplate: 'Visual Template',
    accentColor: 'Accent Color',
    fontFamily: 'Font Family',
    saveDesign: 'Save Design Changes',
    localizationTitle: 'Localization & Target Market',
    cvLanguageLabel: 'CV Content Language',
    targetMarketLabel: 'Target Market',
    marketNotice: 'CV language and target market are fully independent. An English CV for Türkiye (Language: EN, Market: TR) follows Turkish market norms without US resume restrictions.',
    marketTR: 'Türkiye (TR) — Local norms, optional photo',
    marketUS: 'United States (US) — Strict anti-bias, no photo',
    marketUK: 'United Kingdom (UK) — UK conventions',
    marketEU: 'European Union (EU) — Europass / EU norms',
    marketGlobal: 'Global / Remote — International conventions',
    marketOther: 'Other Market',

    // Review tab
    atsReview: 'ATS Compatibility & Quality Review',
    evaluatingRules: 'Evaluating ATS heuristic rules...',
    atsCompatibility: 'ATS Compatibility',
    contentQuality: 'Content Quality',
    strengths: 'Strengths',
    suggestionsAndIssues: 'Suggestions & Issues',
    scoreBreakdownTitle: 'Transparent ATS Heuristic Breakdown',
    breakdownStructure: 'Structure',
    breakdownReadability: 'Readability',
    breakdownContact: 'Contact',
    breakdownConsistency: 'Consistency',
    breakdownJobRelevance: 'Job Relevance',
    breakdownParseability: 'Parseability',

    // Preview Controls
    zoomOut: 'Zoom Out',
    zoomIn: 'Zoom In',
    reset: 'Reset',
    print: 'Print',
    pageOf: 'Curriculum Vitae',

    // Jobs Page
    jobMatches: 'Target Job Matches',
    addNewJob: 'Add Target Job',
    targetJobsList: 'Target Positions',
    jobDescription: 'Job Description',
    pasteJobDescription: 'Paste target job description to analyze ATS match...',
    runAtsMatch: 'Run ATS Match',
    matchingInProgress: 'Analyzing match...',
    matchScore: 'Keyword Match Score',
    targetRoleLabel: 'Target Role',
    matchedKeywords: 'Matched Keywords',
    missingKeywords: 'Missing Keywords / Skills Gap',
    actionPlan: 'Optimization Action Plan',

    // Library Page
    careerLibraryTitle: 'Career Library',
    searchSnippets: 'Search reusable bullets, metrics, or technologies...',
    addSnippet: 'Add Snippet',
    allTags: 'All Tags',
    newSnippetTitle: 'New Career Achievement Snippet',
    snippetTitleLabel: 'Snippet Title',
    categoryLabel: 'Category',
    tagsLabel: 'Tags (comma separated)',
    saveSnippet: 'Save Snippet',
    noSnippetsFound: 'No snippets matched your criteria.',

    // Settings Page
    settingsTitle: 'Workspace Settings',
    settingsSubtitle: 'Manage application language, workspace defaults, and privacy preferences.',
    languageSectionTitle: 'Language & Localization',
    languageSectionDesc: 'Select your preferred interface language. The workspace will update immediately.',
    englishLang: 'English (US)',
    turkishLang: 'Türkçe (TR)',
    activeLanguage: 'Active Language',
    privacySectionTitle: 'Local-First Privacy Architecture',
    privacySectionDesc: 'All resume documents, career snippets, and job applications are processed and stored locally on your machine.',
    privacyStatus: 'Active & Secure',
    localDataPromiseTitle: '100% Local & Private Processing',
    privacyDetails: 'Your resume source code (YAML, JSON, Markdown), target job analyses, and achievements reside strictly in your local database; they never leave this device unless you explicitly configure an external AI endpoint.',
    themeSectionTitle: 'Interface Aesthetic',
    themeSectionDesc: 'Calm Editorial Workspace — designed for clarity, high typographical legibility, and distraction-free editing.',
    currentTheme: 'Calm Editorial Light',
    paletteLabel: 'Minimalist Swiss editorial palette',
    saveSettings: 'Preferences are saved automatically',
    navGeneral: 'Language & Region',
    navPrivacy: 'Privacy & Security',
    navAesthetic: 'Theme & Aesthetic',
    systemStatus: 'Local System Healthy',
  },
  tr: {
    // Navigation
    home: 'Ana Sayfa',
    resumes: 'Özgeçmişler',
    jobs: 'Hedef İlanlar',
    library: 'Kariyer Kütüphanesi',
    templates: 'Şablonlar',
    settings: 'Ayarlar',
    importCv: 'CV İçe Aktar',
    personalTeam: 'Kişisel Çalışma Alanı',

    // Header
    searchPlaceholder: 'Hızlı arama yapın veya bölüme atlayın...',
    newResume: 'Yeni Özgeçmiş',
    newDocument: 'Yeni Belge',
    import: 'İçe Aktar',

    // Dashboard
    dashboard: 'Kontrol Paneli',
    dashboardTitle: 'CV Çalışma Alanı',
    dashboardSubtitle: 'Sade, odaklı ve profesyonel özgeçmiş yönetimi',
    recentResumes: 'Son Özgeçmişler',
    targetPositions: 'Hedef Pozisyonlar',
    librarySnippets: 'Kayıtlı Parçacıklar',
    lastEdited: 'Son düzenleme',
    statusSaved: 'Kaydedildi',
    statusApplied: 'Başvuruldu',
    statusInterviewing: 'Görüşülüyor',
    viewAll: 'Tümünü Gör',
    openStudio: 'Stüdyoyu Aç',
    duplicate: 'Kopyala',
    delete: 'Sil',
    exportPdf: 'PDF İndir',
    noResumes: 'Henüz özgeçmiş bulunmuyor. İlk özgeçmişinizi oluşturun!',

    // Studio Tabs & Actions
    contentTab: 'İçerik',
    sourceTab: 'Kaynak',
    designTab: 'Tasarım',
    reviewTab: 'İnceleme',
    saveDraft: 'Taslağı Kaydet',
    saving: 'Kaydediliyor...',
    exporting: 'Dışa aktarılıyor...',
    sections: 'Bölümler',

    // Profile & Sections
    personalProfile: 'Kişisel Profil',
    core: 'Temel',
    firstName: 'Ad',
    lastName: 'Soyad',
    professionalTitle: 'Mesleki Ünvan',
    email: 'E-posta Adresi',
    phone: 'Telefon',
    location: 'Konum',
    website: 'Web Sitesi / Portfolyo',
    linkedin: 'LinkedIn',
    github: 'GitHub',

    summary: 'Profesyonel Özet',
    summaryPlaceholder: 'Kariyeriniz, başarılarınız ve hedefleriniz hakkında net ve etkili bir özet yazın...',
    improveWithAi: 'Geliştir',

    experience: 'İş Deneyimi',
    addRole: 'Rol Ekle',
    jobTitle: 'Pozisyon Ünvanı',
    company: 'Şirket',
    dates: 'Tarihler (örn. 2022 — Günümüz)',
    achievements: 'Başarılar & Katkılar:',
    addBullet: 'Madde Ekle',
    aiPolish: 'Yapay Zeka ile Parlat',

    education: 'Eğitim',
    addEducation: 'Eğitim Ekle',
    degree: 'Derece / Mezuniyet',
    fieldOfStudy: 'Bölüm / Alan',
    institution: 'Okul / Üniversite',

    projects: 'Projeler',
    addProject: 'Proje Ekle',
    projectName: 'Proje Adı',
    projectRole: 'Rol',
    projectUrl: 'Proje Bağlantısı',

    skills: 'Yetenek Grupları',
    addCategory: 'Kategori Ekle',
    skillsListPlaceholder: 'Virgülle ayrılmış yetenekler (örn. Python, Docker, React)',

    // Design tab
    designAndTypography: 'Tasarım ve Tipografi',
    visualTemplate: 'Görsel Şablon',
    accentColor: 'Vurgu Rengi',
    fontFamily: 'Yazı Tipi',
    saveDesign: 'Tasarım Değişikliklerini Kaydet',
    localizationTitle: 'Lokalizasyon ve Hedef Pazar',
    cvLanguageLabel: 'CV İçerik Dili',
    targetMarketLabel: 'Hedef Pazar',
    marketNotice: 'CV dili ve hedef pazar birbirinden tamamen bağımsızdır. Türkiye için yazılan İngilizce bir CV (Dil: EN, Pazar: TR), ABD kurallarını dayatmadan Türkiye pazar standartlarını gözetir.',
    marketTR: 'Türkiye (TR) — Yerel standartlar, opsiyonel fotoğraf',
    marketUS: 'Amerika Birleşik Devletleri (US) — Katı önyargısızlık, fotoğrafsız',
    marketUK: 'Birleşik Krallık (UK) — UK standartları',
    marketEU: 'Avrupa Birliği (EU) — Europass / AB normları',
    marketGlobal: 'Global / Uzaktan — Uluslararası standartlar',
    marketOther: 'Diğer Pazar',

    // Review tab
    atsReview: 'ATS Uyumluluğu ve Kalite İncelemesi',
    evaluatingRules: 'ATS kuralları değerlendiriliyor...',
    atsCompatibility: 'ATS Uyumluluğu',
    contentQuality: 'İçerik Kalitesi',
    strengths: 'Güçlü Yönler',
    suggestionsAndIssues: 'Öneriler ve Düzeltmeler',
    scoreBreakdownTitle: 'Şeffaf ATS Sezgisel Puan Dağılımı',
    breakdownStructure: 'Yapı',
    breakdownReadability: 'Okunabilirlik',
    breakdownContact: 'İletişim',
    breakdownConsistency: 'Tutarlılık',
    breakdownJobRelevance: 'İş Uyumu',
    breakdownParseability: 'Ayrıştırılabilirlik',

    // Preview Controls
    zoomOut: 'Uzaklaştır',
    zoomIn: 'Yakınlaştır',
    reset: 'Sıfırla',
    print: 'Yazdır',
    pageOf: 'Özgeçmiş',

    // Jobs Page
    jobMatches: 'Hedef İlan Eşleşmeleri',
    addNewJob: 'Hedef İlan Ekle',
    targetJobsList: 'Hedef Pozisyonlar',
    jobDescription: 'İş Tanımı',
    pasteJobDescription: 'ATS eşleşmesini analiz etmek için iş tanımını buraya yapıştırın...',
    runAtsMatch: 'ATS Eşleştirmesini Çalıştır',
    matchingInProgress: 'Eşleşme analiz ediliyor...',
    matchScore: 'Anahtar Kelime Eşleşme Skoru',
    targetRoleLabel: 'Hedef Rol',
    matchedKeywords: 'Eşleşen Anahtar Kelimeler',
    missingKeywords: 'Eksik Beceriler ve Gelişim Alanları',
    actionPlan: 'Optimizasyon Eylem Planı',

    // Library Page
    careerLibraryTitle: 'Kariyer Kütüphanesi',
    searchSnippets: 'Kullanıma hazır başarı maddelerini, metrikleri veya teknolojileri arayın...',
    addSnippet: 'Parçacık Ekle',
    allTags: 'Tüm Etiketler',
    newSnippetTitle: 'Yeni Kariyer Başarı Parçacığı',
    snippetTitleLabel: 'Parçacık Başlığı',
    categoryLabel: 'Kategori',
    tagsLabel: 'Etiketler (virgülle ayırın)',
    saveSnippet: 'Parçacığı Kaydet',
    noSnippetsFound: 'Kriterlerinize uygun parçacık bulunamadı.',

    // Settings Page
    settingsTitle: 'Çalışma Alanı Ayarları',
    settingsSubtitle: 'Uygulama dilini, sistem varsayılanlarını ve gizlilik tercihlerini yönetin.',
    languageSectionTitle: 'Dil ve Yerelleştirme',
    languageSectionDesc: 'Tercih ettiğiniz arayüz dilini seçin. Çalışma alanı anında güncellenecektir.',
    englishLang: 'English (US)',
    turkishLang: 'Türkçe (TR)',
    activeLanguage: 'Aktif Dil',
    privacySectionTitle: 'Yerel Öncelikli Gizlilik Mimarisi',
    privacySectionDesc: 'Tüm özgeçmiş belgeleri, kariyer parçacıkları ve iş başvuruları yalnızca kendi cihazınızda saklanır ve işlenir.',
    privacyStatus: 'Aktif ve Güvenli',
    localDataPromiseTitle: '%100 Yerel ve Güvenli Veri İşleme',
    privacyDetails: 'Özgeçmiş kaynak kodlarınız (YAML, JSON, Markdown), hedef iş analizleriniz ve başarı maddeleriniz yerel SQLite veritabanınızda tutulur; harici bir yapay zeka uç noktası bağlamadığınız sürece bu cihazdan asla dışarı aktarılmaz.',
    themeSectionTitle: 'Arayüz Estetiği',
    themeSectionDesc: 'Calm Editorial Workspace — berraklık, yüksek tipografik okunabilirlik ve dikkat dağıtmayan düzen için tasarlandı.',
    currentTheme: 'Calm Editorial Açık Tema',
    paletteLabel: 'Minimalist İsviçre editoryal renk paleti',
    saveSettings: 'Tercihler otomatik olarak kaydedilmektedir',
    navGeneral: 'Dil ve Bölge',
    navPrivacy: 'Gizlilik ve Güvenlik',
    navAesthetic: 'Arayüz ve Tema',
    systemStatus: 'Yerel Sistem Aktif',
  },
};

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => translations.en[key] || key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cv_workspace_language') as Language;
      if (saved === 'en' || saved === 'tr') {
        setLanguageState(saved);
      }
    } catch {
      // LocalStorage access fails in isolated contexts
    }
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    try {
      localStorage.setItem('cv_workspace_language', lang);
    } catch {
      // ignore
    }
  }

  function t(key: TranslationKey): string {
    return translations[language]?.[key] || translations.en[key] || key;
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
