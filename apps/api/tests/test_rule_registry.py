from app.rules.ats import ATSParseabilityRule
from app.rules.base import RuleCategory
from app.rules.facts import FactIntegrityRule
from app.rules.job_match import JobKeywordMatchRule
from app.rules.privacy import KVKKDataMinimizer, KVKKPrivacyRule, is_valid_tckn
from app.rules.registry import default_rule_registry
from app.rules.turkish import TurkishLanguageRule
from app.schemas.resume import (
    ExperienceItem,
    Profile,
    ResumeDocument,
    ResumeMetadata,
    SkillGroup,
)


def test_rule_registry_initialization():
    rules = default_rule_registry.list_rules()
    rule_ids = [r.id for r in rules]
    assert "turkish-language-tdk" in rule_ids
    assert "ats-parseability" in rule_ids
    assert "kvkk-gdpr-privacy" in rule_ids
    assert "fact-integrity" in rule_ids
    assert "job-keyword-match" in rule_ids


def test_turkish_language_rule_tdk_percentage():
    rule = TurkishLanguageRule()
    doc = ResumeDocument(
        metadata=ResumeMetadata(language="tr", targetMarket="TR"),
        summary="Sistem performansını 25% oranında artırdım.",
        experience=[
            ExperienceItem(
                company="Tech A.Ş.",
                position="Yazılım Mühendisi",
                bullets=[
                    "Bellek tüketimini 30 % azalttım.",
                    "Ben FastAPI ile mikroservis geliştirdim.",
                ],
            )
        ],
    )
    result = rule.evaluate(doc)
    assert not result.passed
    issue_msgs = [i.message for i in result.issues]
    assert any("TDK 2026 kuralı" in m for m in issue_msgs)
    # Check 'ben' pronoun detection
    assert any("Ben" in m for m in issue_msgs)


def test_turkish_language_rule_skipped_for_english():
    rule = TurkishLanguageRule()
    doc = ResumeDocument(
        metadata=ResumeMetadata(language="en", targetMarket="TR"),
        summary="Increased throughput by 25% across distributed systems.",
    )
    result = rule.evaluate(doc)
    assert result.passed
    assert result.metadata.get("skipped") is True


def test_ats_parseability_rule_email_and_duplicates():
    rule = ATSParseabilityRule()
    # Resume with invalid email and duplicate bullets
    doc = ResumeDocument(
        profile=Profile(email="invalid-email-address", phone="12345", headline="Engineer"),
        experience=[
            ExperienceItem(
                company="Company A",
                position="Dev",
                bullets=[
                    "Engineered scalable microservices handling massive request volume daily."
                ],
            ),
            ExperienceItem(
                company="Company B",
                position="Dev",
                bullets=[
                    "Engineered scalable microservices handling massive request volume daily."
                ],
            ),
        ],
    )
    result = rule.evaluate(doc)
    assert not result.passed
    rule_ids = [i.id for i in result.issues]
    assert "ats-email-invalid" in rule_ids
    assert any("ats-dup-bullet" in rid for rid in rule_ids)


def test_kvkk_privacy_tckn_and_iban():
    # Valid TCKN example (11 digits passing checksum: e.g. 10000000146)
    assert is_valid_tckn("10000000146") is True
    assert is_valid_tckn("12345678901") is False

    rule = KVKKPrivacyRule()
    doc = ResumeDocument(
        profile=Profile(
            email="test@example.com",
            phone="+905551234567",
            location="Atatürk Mah. Karanfil Sok. No: 12 Daire: 4 Ankara",
        ),
        summary="TC Kimlik numaram 10000000146 ve IBAN numaram TR330006100519786457841326.",
    )
    result = rule.evaluate(doc)
    assert not result.passed
    categories = [i.category for i in result.issues]
    assert RuleCategory.PRIVACY in categories

    # Verify redaction function
    raw_text = "Call me at +90 555 123 4567 or email john@acme.com with TCKN 10000000146"
    sanitized = KVKKDataMinimizer.redact_personal_data(raw_text)
    assert "john@acme.com" not in sanitized
    assert "[EMAIL_REDACTED]" in sanitized
    assert "10000000146" not in sanitized
    assert "[TCKN_REDACTED]" in sanitized


def test_fact_integrity_repeated_verbs():
    rule = FactIntegrityRule()
    doc = ResumeDocument(
        experience=[
            ExperienceItem(
                company="Alpha Corp",
                position="Backend Engineer",
                bullets=[
                    "Developed authentication service.",
                    "Developed payment integration.",
                    "Developed caching layer.",
                ],
            )
        ]
    )
    result = rule.evaluate(doc)
    issue_ids = [i.id for i in result.issues]
    assert any("fact-repeated-verb" in i for i in issue_ids)


def test_job_keyword_matching_synonyms():
    rule = JobKeywordMatchRule()
    doc = ResumeDocument(
        skills=[SkillGroup(category="Databases", skills=["PostgreSQL", "Redis"])],
        experience=[
            ExperienceItem(
                company="Beta Tech",
                position="Platform Engineer",
                bullets=["Built high throughput pipelines on Google Cloud Platform."],
            )
        ],
    )
    # Target requires 'postgres' and 'gcp'
    result = rule.evaluate(doc, context={"keywords": ["postgres", "gcp", "docker"]})
    assert "postgres" in result.metadata["evidence"]
    assert "gcp" in result.metadata["evidence"]
    assert "docker" in result.metadata["missing"]


def test_api_rules_endpoint(client):
    res = client.get("/api/rules")
    assert res.status_code == 200
    data = res.json()
    assert "rules" in data
    assert len(data["rules"]) >= 5


def test_target_market_schema_independence(client):
    # Verify language and target_market are independent
    res = client.post(
        "/api/resumes",
        json={
            "title": "International Turkish Candidate",
            "targetRole": "Senior Backend Engineer",
            "language": "en",
            "target_market": "TR",
        },
    )
    assert res.status_code == 201
    created = res.json()
    assert created["metadata"]["language"] == "en"
    assert created["metadata"]["targetMarket"] == "TR"
