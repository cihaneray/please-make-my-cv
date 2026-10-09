from app.analyzers.analyzer_service import AnalysisService
from app.rules.career_timeline import CareerTimelineRule
from app.rules.content_quality import ExperienceContentQualityRule, OutcomeDetailRule
from app.schemas.resume import ExperienceItem, ResumeDocument, ResumeMetadata


def test_content_quality_flags_specific_openings_cliches_and_passive_phrases():
    doc = ResumeDocument(
        experience=[
            ExperienceItem(
                bullets=[
                    "Worked on the billing flow.",
                    "Was responsible for monthly reports.",
                    "I am a team player who thinks outside the box.",
                    "Designed the API and improved reliability.",
                ]
            )
        ]
    )
    issues = ExperienceContentQualityRule().evaluate(doc).issues
    assert len(issues) == 3
    assert {issue.field_id for issue in issues} == {
        "experience-0-bullet-0",
        "experience-0-bullet-1",
        "experience-0-bullet-2",
    }
    assert all(issue.severity.value == "info" for issue in issues)
    assert all(issue.category.value == "relevance" for issue in issues)


def test_content_quality_turkish_phrases_and_no_false_passive_match():
    doc = ResumeDocument(
        metadata=ResumeMetadata(language="tr"),
        experience=[
            ExperienceItem(
                bullets=[
                    "Görev aldım ve raporları hazırladım.",
                    "Takım çalışmasına yatkın bir geliştiriciyim.",
                    "Sistemi geliştirdim ve gecikmeyi azalttım.",
                ]
            )
        ],
    )
    issues = ExperienceContentQualityRule().evaluate(doc).issues
    assert len(issues) == 2
    assert all("Bu madde" in issue.message for issue in issues)


def test_outcome_detail_is_optional_and_does_not_require_numbers():
    doc = ResumeDocument(
        experience=[
            ExperienceItem(
                bullets=[
                    "Designed a resilient billing service.",
                    "Reduced processing time by 25%.",
                    "",
                ]
            )
        ]
    )
    result = OutcomeDetailRule().evaluate(doc)
    assert len(result.issues) == 1
    assert result.issues[0].severity.value == "info"
    assert result.issues[0].requires_user_fact
    assert result.score_impact == 0
    assert "optional" in result.issues[0].reason


def test_informational_experience_advisories_do_not_reduce_analysis_content_score():
    no_number = ResumeDocument(
        experience=[
            ExperienceItem(
                company="Example",
                position="Engineer",
                bullets=["Designed a reliable billing service."],
            )
        ]
    )
    with_number = ResumeDocument(
        experience=[
            ExperienceItem(
                company="Example",
                position="Engineer",
                bullets=["Designed a reliable billing service for 25 clients."],
            )
        ]
    )

    advisory_report = AnalysisService.analyze(no_number)
    numeric_report = AnalysisService.analyze(with_number)

    assert any(issue.ruleId == "outcome-detail-0-0" for issue in advisory_report.issues)
    assert advisory_report.contentQualityScore == numeric_report.contentQualityScore


def test_timeline_detects_certain_overlap_and_transitive_union_gap():
    doc = ResumeDocument(
        experience=[
            ExperienceItem(startDate="2020-01", endDate="2020-09"),
            ExperienceItem(startDate="2020-06", endDate="2021-03"),
            ExperienceItem(startDate="2021-01", endDate="2021-12"),
            ExperienceItem(startDate="2022-07", endDate="2023-01"),
        ]
    )
    result = CareerTimelineRule().evaluate(doc, context={"as_of": "2024-01"})
    assert sum(issue.id.startswith("career-overlap-") for issue in result.issues) == 2
    gaps = [issue for issue in result.issues if issue.id.startswith("career-gap-")]
    assert len(gaps) == 1
    assert "six months" in gaps[0].message
    assert gaps[0].proposed_change is None
    assert "No explanation is required" in gaps[0].reason


def test_timeline_ongoing_role_closes_gap_and_year_only_dates_are_conservative():
    rule = CareerTimelineRule()
    ongoing = ResumeDocument(
        experience=[
            ExperienceItem(startDate="2018-01", endDate="2018-12"),
            ExperienceItem(startDate="2019-01", current=True),
        ]
    )
    assert not [
        i
        for i in rule.evaluate(ongoing, {"as_of": "2020-01"}).issues
        if i.id.startswith("career-gap-")
    ]

    partial = ResumeDocument(
        experience=[
            ExperienceItem(startDate="2010", endDate="2011"),
            ExperienceItem(startDate="2013-01", endDate="2013-06"),
        ]
    )
    assert not [
        i
        for i in rule.evaluate(partial, {"as_of": "2020-01"}).issues
        if i.id.startswith("career-gap-")
    ]


def test_timeline_turkish_copy_and_education_is_not_included():
    doc = ResumeDocument(
        metadata=ResumeMetadata(language="tr"),
        experience=[
            ExperienceItem(startDate="2019-01", endDate="2019-03"),
            ExperienceItem(startDate="2020-01", endDate="2020-03"),
        ],
    )
    result = CareerTimelineRule().evaluate(doc, {"as_of": "2021-01"})
    gaps = [issue for issue in result.issues if issue.id.startswith("career-gap-")]
    assert len(gaps) == 1
    assert "Açıklama zorunlu değildir" in gaps[0].reason
