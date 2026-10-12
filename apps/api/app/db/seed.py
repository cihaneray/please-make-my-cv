import json

from sqlalchemy.orm import Session

from app.db.models import JobModel, LibraryItemModel, ResumeModel
from app.schemas.job import JobStatus
from app.schemas.library import BulletVariant, LibraryItemType
from app.schemas.resume import (
    DesignSettings,
    EducationItem,
    ExperienceItem,
    Profile,
    ProfileLink,
    ProjectItem,
    ResumeDocument,
    ResumeMetadata,
    SkillGroup,
    VisibilitySettings,
)


def seed_database(db: Session) -> None:
    # If resumes already exist, do not re-seed
    if db.query(ResumeModel).first():
        return

    # Seed Master Resume: Alex Vance (from the UI mock designs in Docs/stitch_minimalist_resume_workspace)
    master_resume = ResumeDocument(
        metadata=ResumeMetadata(
            id="resume-alex-vance",
            title="Senior Product Designer - 2025",
            targetRole="Staff Product Designer",
            templateId="minimal",
            revision=1,
            tags=["Master", "Product Design", "Design Systems"],
        ),
        profile=Profile(
            firstName="Alex",
            lastName="Vance",
            headline="Staff Product Designer",
            email="alex.vance@work.io",
            phone="+1 (555) 234-5678",
            location="San Francisco, CA",
            website="alexvance.design",
            linkedin="linkedin.com/in/alexvance",
            github="github.com/avance",
            links=[
                ProfileLink(label="Portfolio", url="https://alexvance.design"),
                ProfileLink(label="LinkedIn", url="https://linkedin.com/in/alexvance"),
            ],
        ),
        summary="Product Designer with 8+ years leading design systems and core workflow architectures at high-velocity tech companies. Dedicated to Swiss modernist clarity, rigorous typography, and reducing cognitive friction in enterprise tools. Experienced in coordinating cross-functional engineering pods and defining multi-platform interaction models.",
        experience=[
            ExperienceItem(
                id="exp-1",
                company="Linear",
                position="Staff Product Designer",
                location="San Francisco, CA",
                startDate="2022",
                endDate="Present",
                current=True,
                bullets=[
                    "Architected keyboard-first project triage interface, driving a 24% reduction in daily navigation latency across 400K active teams.",
                    "Established design token pipeline bridging Figma variants with React component library, eliminating 80% of repetitive handoff tickets.",
                    "Spearheaded accessibility audit to achieve WCAG AAA compliance across high-contrast themes and responsive data views.",
                ],
                technologies=["Figma", "React", "Design Systems", "TypeScript", "Accessibility"],
            ),
            ExperienceItem(
                id="exp-2",
                company="Figma",
                position="Senior UX Designer",
                location="San Francisco, CA",
                startDate="2019",
                endDate="2022",
                current=False,
                bullets=[
                    "Authored layout constraints engine UX, supporting nested responsive frames for complex enterprise web applications.",
                    "Conducted regular qualitative research sessions with over 60 design leaders to align product roadmap with large enterprise needs.",
                ],
                technologies=["Figma Variables", "Component Architecture", "Design Research"],
            ),
            ExperienceItem(
                id="exp-3",
                company="Stripe",
                position="Interaction Designer",
                location="Seattle, WA",
                startDate="2017",
                endDate="2019",
                current=False,
                bullets=[
                    "Designed developer onboarding flow for Payment Intents API, improving first-transaction completion rates by 18%.",
                    "Contributed foundational grid components and elevation tokens to the global dashboard design system.",
                ],
                technologies=["Interaction Design", "API Documentation UX", "Design Systems"],
            ),
        ],
        education=[
            EducationItem(
                id="edu-1",
                institution="University of Washington",
                degree="Bachelor of Science",
                fieldOfStudy="Human-Computer Interaction",
                startDate="2013",
                endDate="2017",
                grade="3.8 GPA",
                highlights=[
                    "Dean's List 2015-2017",
                    "President of Interaction Design Student Association",
                ],
            )
        ],
        projects=[
            ProjectItem(
                id="proj-1",
                name="Tokens Studio Core",
                role="Creator & Maintainer",
                url="github.com/avance/tokens-core",
                startDate="2023",
                bullets=[
                    "Open-source multi-platform design token compiler transforming W3C DTCG specs into CSS variables and iOS Swift tokens.",
                    "Adopted by 50+ enterprise engineering organizations with 2,500+ GitHub stars.",
                ],
                technologies=["TypeScript", "AST Parsing", "CSS Variables"],
            )
        ],
        skills=[
            SkillGroup(
                id="skill-1",
                category="Design & Architecture",
                skills=[
                    "Design Systems",
                    "Figma Variables",
                    "Information Architecture",
                    "Prototyping",
                    "WCAG AAA",
                ],
            ),
            SkillGroup(
                id="skill-2",
                category="Frontend Technologies",
                skills=["React", "TypeScript", "Next.js", "Tailwind CSS", "CSS Architecture"],
            ),
        ],
        design=DesignSettings(template="minimal", accentColor="#0F172A", fontFamily="Inter"),
        visibility=VisibilitySettings(),
    )

    resume_model = ResumeModel(
        id=master_resume.metadata.id,
        title=master_resume.metadata.title,
        target_role=master_resume.metadata.targetRole,
        template_id=master_resume.metadata.templateId,
        revision=1,
        is_archived=False,
        document_json=json.dumps(master_resume.model_dump(), ensure_ascii=False),
    )
    db.add(resume_model)

    # Seed Sample Jobs
    sample_jobs = [
        JobModel(
            id="job-stripe",
            company="Stripe",
            position="Principal UI Engineer",
            location="San Francisco, CA",
            url="https://stripe.com/jobs",
            status=JobStatus.INTERVIEW.value,
            description="We are seeking a Principal UI Engineer with deep expertise in design systems, TypeScript, React, accessibility (WCAG), and developer ergonomics. You will architect the next generation of financial web applications, bridging design tokens with production code.",
            notes="Completed first technical round. Onsite presentation scheduled next week.",
            linked_resume_id="resume-alex-vance",
        ),
        JobModel(
            id="job-figma",
            company="Figma",
            position="Staff Product Designer",
            location="San Francisco, CA (Hybrid)",
            url="https://figma.com/careers",
            status=JobStatus.APPLIED.value,
            description="Looking for a Staff Product Designer to lead design system workflows and canvas interaction paradigms. Requires 6+ years experience, mastery of Figma variables, component libraries, and cross-functional leadership.",
            notes="Application submitted with custom portfolio case study.",
            linked_resume_id="resume-alex-vance",
        ),
        JobModel(
            id="job-linear",
            company="Linear",
            position="Product Lead",
            location="Remote",
            url="https://linear.app/careers",
            status=JobStatus.SAVED.value,
            description="Leading project triage and issue workflows. Passion for keyboard shortcuts, ultra-fast UI latency, and minimalism.",
            notes="Interesting role, need to customize CV variant emphasizing product strategy.",
            linked_resume_id="resume-alex-vance",
        ),
    ]
    for j in sample_jobs:
        db.add(j)

    # Seed Sample Career Content Library Items
    sample_snippets = [
        LibraryItemModel(
            id="lib-1",
            type=LibraryItemType.BULLET.value,
            title="Design Token Pipeline Integration",
            content="Established design token pipeline bridging Figma design tokens with React component library, eliminating 80% of repetitive handoff tickets.",
            category="Design Systems",
            tags_json=json.dumps(["Design Systems", "Architecture", "Metrics (+20%)"]),
            variants_json=json.dumps(
                [
                    BulletVariant(
                        type="technical",
                        text="Built automated CI pipeline converting Figma DTCG tokens into TypeScript definitions, reducing handoff sync time by 80%.",
                    ).model_dump(),
                    BulletVariant(
                        type="concise",
                        text="Created automated Figma-to-code token compiler, eliminating 80% of design handoff discrepancies.",
                    ).model_dump(),
                    BulletVariant(
                        type="business",
                        text="Streamlined designer-developer workflows across 15 engineering squads, cutting front-end rework costs substantially.",
                    ).model_dump(),
                ]
            ),
            target_roles_json=json.dumps(["Staff Product Designer", "Design Technologist"]),
            metrics="80% handoff tickets eliminated",
        ),
        LibraryItemModel(
            id="lib-2",
            type=LibraryItemType.BULLET.value,
            title="Keyboard-First Navigation Acceleration",
            content="Architected keyboard-first project triage interface, driving a 24% reduction in daily navigation latency across 400K active teams.",
            category="Interaction Design",
            tags_json=json.dumps(["Architecture", "Metrics (+20%)", "Management"]),
            variants_json=json.dumps(
                [
                    BulletVariant(
                        type="technical",
                        text="Implemented optimized keyboard triage state machine in TypeScript, shaving 24% off document navigation latencies.",
                    ).model_dump(),
                    BulletVariant(
                        type="concise",
                        text="Reduced triage latency by 24% via keyboard-first interaction models.",
                    ).model_dump(),
                ]
            ),
            target_roles_json=json.dumps(["Staff Product Designer", "Principal Engineer"]),
            metrics="24% latency reduction across 400K teams",
        ),
    ]
    for s in sample_snippets:
        db.add(s)

    db.commit()
