# Canonical Resume Schema Reference

Version: `schemaVersion: 1`

## Schema Structure

```yaml
schemaVersion: 1
metadata:
  id: string (UUID)
  title: string
  targetRole: string
  templateId: 'minimal' | 'technical' | 'professional'
  language: string (default 'en')
  tags: string[]
  revision: integer
  createdAt: ISO 8601 string
  updatedAt: ISO 8601 string
  parentResumeId: string | null
  isArchived: boolean

profile:
  firstName: string
  lastName: string
  headline: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  github: string
  links:
    - id: string
      label: string
      url: string

summary: string (markdown / text)

experience:
  - id: string
    company: string
    position: string
    location: string
    startDate: string
    endDate: string
    current: boolean
    summary: string
    bullets: string[]
    technologies: string[]

education:
  - id: string
    institution: string
    degree: string
    fieldOfStudy: string
    location: string
    startDate: string
    endDate: string
    current: boolean
    grade: string
    highlights: string[]

projects:
  - id: string
    name: string
    role: string
    url: string
    startDate: string
    endDate: string
    bullets: string[]
    technologies: string[]

skills:
  - id: string
    category: string
    skills: string[]

certifications:
  - id: string
    name: string
    issuer: string
    issueDate: string
    expiryDate: string
    credentialUrl: string
    credentialId: string

languages:
  - id: string
    language: string
    proficiency: string

customSections:
  - id: string
    title: string
    items:
      - id: string
        title: string
        subtitle: string
        date: string
        description: string
        bullets: string[]

design:
  template: 'minimal' | 'technical' | 'professional'
  fontFamily: string
  fontSize: string
  spacing: 'compact' | 'normal' | 'relaxed'
  margins: 'compact' | 'normal' | 'spacious'
  accentColor: string (hex)

visibility:
  showSummary: boolean
  showExperience: boolean
  showEducation: boolean
  showProjects: boolean
  showSkills: boolean
  showCertifications: boolean
  showLanguages: boolean
```
