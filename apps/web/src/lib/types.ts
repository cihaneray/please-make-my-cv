export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export interface Profile {
  firstName: string;
  lastName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  links: ProfileLink[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  summary: string;
  bullets: string[];
  technologies: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  grade: string;
  highlights: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  url: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  technologies: string[];
}

export interface SkillGroup {
  id: string;
  category: string;
  skills: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  credentialUrl: string;
  credentialId: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  description: string;
  bullets: string[];
}

export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
}

export interface DesignSettings {
  template: 'minimal' | 'technical' | 'professional' | string;
  fontFamily: string;
  fontSize: string;
  spacing: 'compact' | 'normal' | 'relaxed';
  margins: 'compact' | 'normal' | 'spacious';
  accentColor: string;
}

export interface VisibilitySettings {
  showSummary: boolean;
  showExperience: boolean;
  showEducation: boolean;
  showProjects: boolean;
  showSkills: boolean;
  showCertifications: boolean;
  showLanguages: boolean;
}

export type TargetMarket = 'TR' | 'US' | 'UK' | 'EU' | 'GLOBAL' | 'OTHER';

export interface ResumeMetadata {
  id: string;
  schemaVersion: number;
  title: string;
  targetRole: string;
  templateId: string;
  language: string;
  targetMarket?: TargetMarket;
  tags: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
  parentResumeId?: string | null;
  isArchived: boolean;
}

export interface ResumeDocument {
  metadata: ResumeMetadata;
  profile: Profile;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: SkillGroup[];
  certifications: CertificationItem[];
  languages: LanguageItem[];
  customSections: CustomSection[];
  design: DesignSettings;
  visibility: VisibilitySettings;
}

export interface ResumeSummary {
  id: string;
  title: string;
  targetRole: string;
  templateId: string;
  language?: string;
  targetMarket?: TargetMarket;
  revision: number;
  updatedAt: string;
  createdAt: string;
  parentResumeId?: string | null;
  isArchived: boolean;
  stats?: {
    experienceCount?: number;
    skillsCount?: number;
  };
}

export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'archived';

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  location: string;
  url: string;
  description: string;
  notes: string;
  status: JobStatus;
  linkedResumeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulletVariant {
  id: string;
  type: 'technical' | 'concise' | 'business' | 'general' | string;
  text: string;
}

export type LibraryItemType = 'bullet' | 'experience' | 'project' | 'skill';
export const LibraryItemType = {
  BULLET: 'bullet' as const,
  EXPERIENCE: 'experience' as const,
  PROJECT: 'project' as const,
  SKILL: 'skill' as const,
};

export interface LibrarySnippet {
  id: string;
  type: LibraryItemType;
  title: string;
  content: string;
  category: string;
  tags: string[];
  variants: BulletVariant[];
  targetRoles: string[];
  metrics: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisIssue {
  ruleId: string;
  severity: 'info' | 'warning' | 'important' | 'critical';
  section: string;
  message: string;
  suggestion?: string | null;
  targetId?: string | null;
}

export interface ResumeAnalysisReport {
  resumeId: string;
  overallScore: number;
  atsCompatibilityScore: number;
  contentQualityScore: number;
  issues: AnalysisIssue[];
  wordCount: number;
  bulletCount: number;
  strengths: string[];
  atsBreakdown?: {
    structure: number;
    readability: number;
    contact: number;
    consistency: number;
    job_relevance: number;
    parseability: number;
  };
  heuristicNotice?: string;
  calculatedAt: string;
}

export interface JobMatchAnalysis {
  jobId: string;
  resumeId: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendedKeywords: string[];
  sectionFeedback: Array<{
    section: string;
    message: string;
    recommendation: string;
  }>;
  summary: string;
}
