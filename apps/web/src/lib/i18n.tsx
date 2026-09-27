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

    // Header & Sidebar
    searchPlaceholder: 'Quick search or jump to section...',
    newResume: 'New Resume',
    newDocument: 'New Document',
    import: 'Import',
    languageLabel: 'Language:',

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
    statusInterview: 'Interview',
    statusInterviewing: 'Interviewing',
    statusOffer: 'Offer',
    statusRejected: 'Rejected',
    statusArchived: 'Archived',
    viewAll: 'View All',
    openStudio: 'Open Studio',
    duplicate: 'Duplicate',
    delete: 'Delete',
    exportPdf: 'Export PDF',
    noResumes: 'No resumes found. Create your first resume!',
    colDocumentName: 'Document Name',
    colTargetRole: 'Target Role',
    colTemplate: 'Template',
    colLastEdited: 'Last Edited',
    colActions: 'Actions',
    colCompany: 'Company',
    colPosition: 'Position',
    colStatus: 'Status',
    colLinkedResume: 'Linked Resume',
    colDetails: 'Details',
    loadingResumes: 'Loading resumes...',
    noResumesCreated: 'No resumes created yet.',
    createFirstResume: 'Create Your First Resume',
    recentJobs: 'Recent Jobs',
    trackedCount: 'tracked',
    manageTracker: 'Manage tracker',
    openAction: 'Open',
    duplicateAction: 'Duplicate',
    deleteAction: 'Delete',
    compareAction: 'Compare',
    statusLinked: 'Linked',
    statusNone: 'None',
    statusGeneralProfile: 'General Profile',

    // Resumes Page
    documents: 'Documents',
    myResumes: 'My Resumes',
    myResumesSubtitle: 'Manage your tailored CV variants, master resumes, and version history.',
    filterResumes: 'Filter resumes...',
    createResume: 'Create Resume',
    noResumesFound: 'No resumes found.',
    editAction: 'Edit',
    pdfAction: 'PDF',
    revLabel: 'rev',

    // Studio Tabs & Actions
    contentTab: 'Content',
    sourceTab: 'Source',
    designTab: 'Design',
    reviewTab: 'Review',
    saveDraft: 'Save Draft',
    saving: 'Saving...',
    exporting: 'Exporting...',
    sections: 'Sections',
    loadingStudio: 'Loading CV Workspace Studio...',

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

    // Preview Controls & A4
    zoomOut: 'Zoom Out',
    zoomIn: 'Zoom In',
    reset: 'Reset',
    print: 'Print',
    pageOf: 'Curriculum Vitae',
    previewSummary: 'Summary',
    previewExperience: 'Experience',
    previewEducation: 'Education',
    previewProjects: 'Projects',
    previewSkills: 'Core Proficiencies',
    previewPresent: 'Present',
    previewTech: 'Tech:',
    previewUntitledRole: 'Untitled Role',
    previewYourName: 'Your Name',

    // Jobs Page
    workspace: 'Workspace',
    careerPipeline: 'Career Pipeline',
    jobsAndMatchTitle: 'Jobs & Match Analysis',
    trackedApplications: 'tracked applications',
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
    loadingJobs: 'Loading jobs...',
    noJobsAdded: 'No jobs added yet.',
    remote: 'Remote',
    cvCompatibilityRating: 'CV Compatibility Rating',
    matchPercent: 'Match',
    calculating: 'Calculating...',
    matchedRequirements: 'Matched Requirements',
    missingCompetencies: 'Missing or Weakly Represented',
    matchInsights: 'Match Insights & Advice',
    noDescription: 'No description provided.',
    selectJobToInspect: 'Select a job from the left panel to inspect match analysis.',
    addNewTargetJob: 'Add New Target Job',
    companyName: 'Company Name',
    positionTitle: 'Position Title',
    jobDescriptionRequirements: 'Job Description / Requirements',
    jobDescPlaceholder: 'Paste the job posting description here for automated keyword and ATS gap analysis...',
    cancel: 'Cancel',
    saveAndAnalyze: 'Save & Analyze',

    // Library Page
    careerLibraryTitle: 'Career Library',
    librarySubheading: 'Global Career Content Repository',
    libraryDescription: 'Store, tag, and reuse battle-tested achievements, projects, and skills across all resumes.',
    searchSnippets: 'Search reusable bullets, metrics, or technologies...',
    addSnippet: 'Add Snippet',
    allTags: 'All Tags',
    newSnippetTitle: 'New Career Achievement Snippet',
    snippetTitleLabel: 'Snippet Title',
    categoryLabel: 'Category',
    tagsLabel: 'Tags (comma separated)',
    saveSnippet: 'Save Snippet',
    noSnippetsFound: 'No snippets matched your criteria.',
    snippetsStored: 'Snippets Stored',
    atsMatchAvg: 'ATS Match Avg',

    // Templates Page
    gallery: 'Gallery',
    resumeTemplates: 'Resume Templates',
    templatesSubtitle: 'ATS-friendly visual presentations configured with tabular spacing, readable typography, and authentic A4 scaling.',
    a4Ready: 'A4 Ready',
    bestFor: 'Best for:',
    useTemplate: 'Use Template',

    // Import Page
    importTitle: 'Import & Normalize Resume',
    confirmAndSave: 'Confirm & Save to Workspace',
    uploadResumeFile: 'Upload Resume File (.json, .yaml, .yml, .md)',
    orPasteRaw: 'OR PASTE RAW CONTENT',
    pasteRawPlaceholder: 'Paste raw YAML, JSON, or Markdown resume text here...',
    parseAndPreview: 'Parse & Generate Preview',
    analyzingContent: 'Analyzing Content...',
    parseErrors: 'Parse Errors:',
    warningsMigrations: 'Warnings / Migrations:',
    formatLabel: 'Format:',

    // Source Editor
    validate: 'Validate',
    validating: 'Validating...',
    validSource: 'Valid',
    syntaxIssues: 'Syntax Issues',
    applyChanges: 'Apply Changes',
    applying: 'Applying...',
    validationErrors: 'Validation Errors:',
    warnings: 'Warnings:',
    sourceLoading: 'Loading source...',

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

    // Header & Sidebar
    searchPlaceholder: 'Hızlı arama yapın veya bölüme atlayın...',
    newResume: 'Yeni Özgeçmiş',
    newDocument: 'Yeni Belge',
    import: 'İçe Aktar',
    languageLabel: 'Dil:',

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
    statusInterview: 'Mülakat',
    statusInterviewing: 'Görüşülüyor',
    statusOffer: 'Teklif Alındı',
    statusRejected: 'Reddedildi',
    statusArchived: 'Arşivlendi',
    viewAll: 'Tümünü Gör',
    openStudio: 'Stüdyoyu Aç',
    duplicate: 'Kopyala',
    delete: 'Sil',
    exportPdf: 'PDF İndir',
    noResumes: 'Henüz özgeçmiş bulunmuyor. İlk özgeçmişinizi oluşturun!',
    colDocumentName: 'Belge Adı',
    colTargetRole: 'Hedef Rol',
    colTemplate: 'Şablon',
    colLastEdited: 'Son Düzenleme',
    colActions: 'İşlemler',
    colCompany: 'Şirket',
    colPosition: 'Pozisyon',
    colStatus: 'Durum',
    colLinkedResume: 'Bağlı CV',
    colDetails: 'Detaylar',
    loadingResumes: 'Özgeçmişler yükleniyor...',
    noResumesCreated: 'Henüz oluşturulmuş özgeçmiş yok.',
    createFirstResume: 'İlk Özgeçmişinizi Oluşturun',
    recentJobs: 'Son İş İlanları',
    trackedCount: 'takip edilen',
    manageTracker: 'Takipçiyi Yönet',
    openAction: 'Aç',
    duplicateAction: 'Kopyala',
    deleteAction: 'Sil',
    compareAction: 'Karşılaştır',
    statusLinked: 'Bağlandı',
    statusNone: 'Yok',
    statusGeneralProfile: 'Genel Profil',

    // Resumes Page
    documents: 'Belgeler',
    myResumes: 'Özgeçmişlerim',
    myResumesSubtitle: 'Özelleştirilmiş CV varyantlarınızı, ana özgeçmişinizi ve sürüm geçmişinizi yönetin.',
    filterResumes: 'Özgeçmişleri filtrele...',
    createResume: 'Özgeçmiş Oluştur',
    noResumesFound: 'Özgeçmiş bulunamadı.',
    editAction: 'Düzenle',
    pdfAction: 'PDF',
    revLabel: 'rev',

    // Studio Tabs & Actions
    contentTab: 'İçerik',
    sourceTab: 'Kaynak',
    designTab: 'Tasarım',
    reviewTab: 'İnceleme',
    saveDraft: 'Taslağı Kaydet',
    saving: 'Kaydediliyor...',
    exporting: 'Dışa aktarılıyor...',
    sections: 'Bölümler',
    loadingStudio: 'CV Workspace Stüdyosu Yükleniyor...',

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

    // Preview Controls & A4
    zoomOut: 'Uzaklaştır',
    zoomIn: 'Yakınlaştır',
    reset: 'Sıfırla',
    print: 'Yazdır',
    pageOf: 'Özgeçmiş',
    previewSummary: 'Özet',
    previewExperience: 'İş Deneyimi',
    previewEducation: 'Eğitim',
    previewProjects: 'Projeler',
    previewSkills: 'Yetkinlikler & Beceriler',
    previewPresent: 'Günümüz',
    previewTech: 'Teknolojiler:',
    previewUntitledRole: 'Pozisyon',
    previewYourName: 'Ad Soyad',

    // Jobs Page
    workspace: 'Çalışma Alanı',
    careerPipeline: 'Kariyer Hattı',
    jobsAndMatchTitle: 'İş İlanları ve Eşleşme Analizi',
    trackedApplications: 'takip edilen başvuru',
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
    loadingJobs: 'İş ilanları yükleniyor...',
    noJobsAdded: 'Henüz eklenen ilan yok.',
    remote: 'Uzaktan',
    cvCompatibilityRating: 'CV Uyumluluk Oranı',
    matchPercent: 'Eşleşme',
    calculating: 'Hesaplanıyor...',
    matchedRequirements: 'Eşleşen Nitelikler',
    missingCompetencies: 'Eksik veya Zayıf Temsil Edilen',
    matchInsights: 'Eşleşme İçgörüleri ve Tavsiyeler',
    noDescription: 'İş tanımı belirtilmedi.',
    selectJobToInspect: 'Eşleşme analizini incelemek için sol panelden bir iş ilanı seçin.',
    addNewTargetJob: 'Yeni Hedef İlan Ekle',
    companyName: 'Şirket Adı',
    positionTitle: 'Pozisyon Ünvanı',
    jobDescriptionRequirements: 'İş Tanımı / Gereksinimler',
    jobDescPlaceholder: 'Otomatik anahtar kelime ve ATS analizi için iş ilanı metnini buraya yapıştırın...',
    cancel: 'İptal',
    saveAndAnalyze: 'Kaydet ve Analiz Et',

    // Library Page
    careerLibraryTitle: 'Kariyer Kütüphanesi',
    librarySubheading: 'Global Kariyer İçerik Deposu',
    libraryDescription: 'Tüm özgeçmişlerinizde başarılarınızı, projelerinizi ve yeteneklerinizi saklayın, etiketleyin ve yeniden kullanın.',
    searchSnippets: 'Kullanıma hazır başarı maddelerini, metrikleri veya teknolojileri arayın...',
    addSnippet: 'Parçacık Ekle',
    allTags: 'Tüm Etiketler',
    newSnippetTitle: 'Yeni Kariyer Başarı Parçacığı',
    snippetTitleLabel: 'Parçacık Başlığı',
    categoryLabel: 'Kategori',
    tagsLabel: 'Etiketler (virgülle ayırın)',
    saveSnippet: 'Parçacığı Kaydet',
    noSnippetsFound: 'Kriterlerinize uygun parçacık bulunamadı.',
    snippetsStored: 'Kayıtlı Parçacık',
    atsMatchAvg: 'Ortalama ATS Uyumu',

    // Templates Page
    gallery: 'Galeri',
    resumeTemplates: 'CV Şablonları',
    templatesSubtitle: 'Tablo aralıkları, okunabilir tipografi ve A4 ölçeklendirmesiyle yapılandırılmış ATS dostu görsel sunumlar.',
    a4Ready: 'A4 Uyumlu',
    bestFor: 'En uygun:',
    useTemplate: 'Şablonu Kullan',

    // Import Page
    importTitle: 'CV İçe Aktar ve Normalize Et',
    confirmAndSave: 'Onayla ve Çalışma Alanına Kaydet',
    uploadResumeFile: 'Özgeçmiş Dosyası Yükleyin (.json, .yaml, .yml, .md)',
    orPasteRaw: 'VEYA HAM İÇERİK YAPIŞTIRIN',
    pasteRawPlaceholder: 'Ham YAML, JSON veya Markdown özgeçmiş metnini buraya yapıştırın...',
    parseAndPreview: 'Ayrıştır ve Önizleme Oluştur',
    analyzingContent: 'İçerik Analiz Ediliyor...',
    parseErrors: 'Ayrıştırma Hataları:',
    warningsMigrations: 'Uyarılar / İyileştirmeler:',
    formatLabel: 'Format:',

    // Source Editor
    validate: 'Doğrula',
    validating: 'Doğrulanıyor...',
    validSource: 'Geçerli',
    syntaxIssues: 'Sözdizimi Sorunları',
    applyChanges: 'Değişiklikleri Uygula',
    applying: 'Uygulanıyor...',
    validationErrors: 'Doğrulama Hataları:',
    warnings: 'Uyarılar:',
    sourceLoading: 'Kaynak kod yükleniyor...',

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

export type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  getJobStatusLabel: (status: string) => string;
}

export function formatJobStatus(status: string, t: (key: TranslationKey) => string): string {
  switch (status?.toLowerCase()) {
    case 'saved':
      return t('statusSaved');
    case 'applied':
      return t('statusApplied');
    case 'interview':
    case 'interviewing':
      return t('statusInterview');
    case 'offer':
      return t('statusOffer');
    case 'rejected':
      return t('statusRejected');
    case 'archived':
      return t('statusArchived');
    default:
      return status;
  }
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => translations.en[key] || key,
  getJobStatusLabel: (status) => status,
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

  function getJobStatusLabel(status: string): string {
    return formatJobStatus(status, t);
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, getJobStatusLabel }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
