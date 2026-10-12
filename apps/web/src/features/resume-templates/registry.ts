import { ResumeDocument } from "@/lib/types";
import { ResumeTemplateDefinition, ResumeTemplateId } from "./types";
import { MinimalTemplate } from "./templates/minimal/MinimalTemplate";
import { TechnicalTemplate } from "./templates/technical/TechnicalTemplate";
import { ProfessionalTemplate } from "./templates/professional/ProfessionalTemplate";

export const RESUME_TEMPLATES: ResumeTemplateDefinition[] = [
  {
    id: "minimal",
    name: "Minimal",
    category: "Design Systems & Product",
    description:
      "A clean layout with clear headings, generous spacing, and simple dividers.",
    recommendedFor:
      "Product Designers, UI/UX Specialists, Design Technologists, Generalists",
    defaultAccentColor: "#0F172A",
    defaultFontFamily: "Inter",
    renderer: MinimalTemplate,
  },
  {
    id: "technical",
    name: "Technical",
    category: "Engineering & Cloud",
    description:
      "A compact layout for technical skills, certifications, and project details.",
    recommendedFor:
      "Backend Architects, Staff Engineers, DevOps, Cloud Developers",
    defaultAccentColor: "#131B2E",
    defaultFontFamily: "Inter",
    renderer: TechnicalTemplate,
  },
  {
    id: "professional",
    name: "Professional",
    category: "Leadership & Strategy",
    description:
      "A formal layout with a prominent summary and clear sections for leadership experience.",
    recommendedFor:
      "Engineering Managers, Product Leads, Technical Directors, Consultants",
    defaultAccentColor: "#1E293B",
    defaultFontFamily: "Georgia",
    renderer: ProfessionalTemplate,
  },
];

export function getResumeTemplate(
  templateId?: string,
): ResumeTemplateDefinition {
  const normalized = (templateId || "").toLowerCase().trim();
  const found = RESUME_TEMPLATES.find((t) => t.id === normalized);
  return found || RESUME_TEMPLATES[0];
}

export const SAMPLE_PREVIEW_RESUME: ResumeDocument = {
  metadata: {
    id: "sample-resume",
    schemaVersion: 1,
    title: "Senior Systems Architect",
    targetRole: "Staff Software Engineer / Architect",
    templateId: "minimal",
    language: "en",
    targetMarket: "GLOBAL",
    tags: ["Architecture", "Distributed Systems", "Cloud"],
    revision: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    isArchived: false,
    parentResumeId: null,
    targetJob: null,
  },
  profile: {
    photo: "",
    firstName: "Alex",
    lastName: "Vance",
    headline: "Staff Systems Architect & Tech Lead",
    email: "alex.vance@work.io",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    website: "alexvance.io",
    linkedin: "linkedin.com/in/alexvance",
    github: "github.com/alexvance",
    links: [],
  },
  summary:
    "Systems architect with 10+ years designing high-throughput distributed architectures and cloud infrastructure. Track record of scaling multi-region microservices handling 2M+ RPS with 99.99% availability while reducing cloud spend by 35%.",
  experience: [
    {
      id: "exp-1",
      company: "Datamesh Cloud",
      position: "Staff Distributed Systems Engineer",
      location: "San Francisco, CA",
      startDate: "2022",
      endDate: "Present",
      current: true,
      summary:
        "Leading technical strategy for high-performance distributed streaming engine.",
      bullets: [
        "Designed real-time data replication pipeline using Kafka & Rust, cutting cross-region replication lag by 65%.",
        "Led migration of 40 microservices to Kubernetes service mesh, improving p99 tail latency from 180ms to 42ms.",
        "Mentored 12 staff and senior engineers across distributed systems best practices and zero-downtime deployment pipelines.",
      ],
      technologies: ["Go", "Rust", "Kubernetes", "Apache Kafka", "gRPC", "AWS"],
    },
    {
      id: "exp-2",
      company: "HyperScale Labs",
      position: "Senior Backend Engineer",
      location: "Seattle, WA",
      startDate: "2019",
      endDate: "2022",
      current: false,
      summary: "Developed multi-tenant authorization and edge routing gateway.",
      bullets: [
        "Built edge rate-limiting and authorization proxy handling 850K RPS with sub-millisecond overhead.",
        "Refactored legacy PostgreSQL queries and partitioning schemes, resolving critical deadlocks during peak loads.",
      ],
      technologies: ["TypeScript", "Go", "PostgreSQL", "Redis", "Docker"],
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "University of California, Berkeley",
      degree: "B.S.",
      fieldOfStudy: "Computer Science & Engineering",
      location: "Berkeley, CA",
      startDate: "2014",
      endDate: "2018",
      current: false,
      grade: "3.88 GPA",
      highlights: ["Dean’s Honor List", "Distributed Computing Research Lab"],
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "Chronos Stream Engine",
      role: "Creator & Maintainer",
      url: "https://github.com/alexvance/chronos-engine",
      startDate: "2023",
      endDate: "2024",
      bullets: [
        "High-speed in-memory event stream processing engine in Rust with Raft consensus.",
        "Surpassed 4,500 GitHub stars and adopted by 3 YC companies in production.",
      ],
      technologies: ["Rust", "Raft", "Async IO", "WebAssembly"],
    },
  ],
  skills: [
    {
      id: "sk-1",
      category: "Languages",
      skills: ["Go", "Rust", "TypeScript", "Python", "SQL"],
    },
    {
      id: "sk-2",
      category: "Infrastructure & Cloud",
      skills: ["Kubernetes", "Docker", "AWS (EKS, RDS)", "Terraform", "Kafka"],
    },
    {
      id: "sk-3",
      category: "Architecture",
      skills: [
        "Distributed Systems",
        "Microservices",
        "Event-Driven",
        "High Availability",
      ],
    },
  ],
  certifications: [
    {
      id: "cert-1",
      name: "AWS Certified Solutions Architect - Professional",
      issuer: "Amazon Web Services",
      issueDate: "2023-05",
      expiryDate: "2026-05",
      credentialUrl: "",
      credentialId: "AWS-PSA-99120",
    },
  ],
  languages: [
    {
      id: "lang-1",
      language: "English",
      proficiency: "Native",
    },
    {
      id: "lang-2",
      language: "German",
      proficiency: "Professional Working (B2)",
    },
  ],
  customSections: [],
  design: {
    sectionOrder: [],
    template: "minimal",
    fontFamily: "Inter",
    fontSize: "normal",
    spacing: "normal",
    margins: "normal",
    accentColor: "#0F172A",
  },
  visibility: {
    showPhoto: true,
    showSummary: true,
    showExperience: true,
    showEducation: true,
    showProjects: true,
    showSkills: true,
    showCertifications: true,
    showLanguages: true,
  },
};
