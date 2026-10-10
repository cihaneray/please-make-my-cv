from app.analyzers.analyzer_service import AnalysisService
from app.rules.ats import ATSParseabilityRule
from app.rules.content_quality import ExperienceContentQualityRule
from app.schemas.resume import ExperienceItem, Profile, ResumeDocument


def test_missing_contact_rule():
    doc = ResumeDocument(profile=Profile(firstName="Test"))
    issues = ATSParseabilityRule().evaluate(doc).issues
    rule_ids = [i.id for i in issues]
    assert "ats-email-missing" in rule_ids
    assert "ats-headline-missing" in rule_ids


def test_experience_quality_rule_weak_openings():
    doc = ResumeDocument(
        experience=[
            ExperienceItem(
                company="Acme",
                position="Dev",
                bullets=[
                    "Worked on the user interface and fixed bugs.",
                    "Responsible for database backups.",
                ],
            )
        ]
    )
    issues = ExperienceContentQualityRule().evaluate(doc).issues
    assert len(issues) == 2
    assert {issue.field_id for issue in issues} == {
        "experience-0-bullet-0",
        "experience-0-bullet-1",
    }


def test_full_analysis_report():
    doc = ResumeDocument(
        profile=Profile(
            firstName="Ada",
            lastName="Lovelace",
            headline="First Computer Programmer",
            email="ada@analytics.org",
            phone="+44 20 7946 0912",
            location="London, UK",
        ),
        summary="Pioneering mathematician with foundational contributions to algorithmic design.",
        experience=[
            ExperienceItem(
                company="Analytical Engine Corp",
                position="Algorithm Architect",
                startDate="1842",
                bullets=[
                    "Authored the first computer algorithm computing Bernoulli numbers.",
                    "Synthesized visionary projections on algorithmic machine composition.",
                ],
            )
        ],
    )
    report = AnalysisService.analyze(doc)
    assert report.overallScore > 70
    assert report.atsCompatibilityScore > 75
    assert len(report.strengths) > 0
