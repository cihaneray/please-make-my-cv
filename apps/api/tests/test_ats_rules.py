from app.analyzers.analyzer_service import AnalysisService
from app.analyzers.rules import ExperienceQualityRule, MissingContactRule
from app.schemas.resume import ExperienceItem, Profile, ResumeDocument


def test_missing_contact_rule():
    doc = ResumeDocument(profile=Profile(firstName="Test"))
    issues = MissingContactRule().analyze(doc)
    rule_ids = [i.ruleId for i in issues]
    assert "missing-email" in rule_ids
    assert "missing-phone" in rule_ids
    assert "missing-headline" in rule_ids


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
    issues = ExperienceQualityRule().analyze(doc)
    rule_ids = [i.ruleId for i in issues]
    assert "weak-action-verb" in rule_ids


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
