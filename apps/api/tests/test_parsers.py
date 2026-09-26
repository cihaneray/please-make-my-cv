from app.parsers.json_parser import JsonParser
from app.parsers.markdown_parser import MarkdownParser
from app.parsers.yaml_parser import YamlParser


def test_json_parser_valid():
    json_str = """
    {
      "schemaVersion": 1,
      "resume": {
        "profile": {
          "firstName": "John",
          "lastName": "Smith",
          "email": "john@smith.com"
        },
        "summary": "Senior developer"
      }
    }
    """
    doc, warnings, errors = JsonParser.parse(json_str)
    assert errors == []
    assert doc is not None
    assert doc.profile.firstName == "John"
    assert doc.profile.email == "john@smith.com"


def test_json_parser_invalid_syntax():
    json_str = "INVALID { JSON"
    doc, warnings, errors = JsonParser.parse(json_str)
    assert doc is None
    assert len(errors) > 0
    assert "Invalid JSON" in errors[0]


def test_yaml_parser_valid():
    yaml_str = """
schemaVersion: 1
resume:
  profile:
    firstName: Sarah
    lastName: Connor
    email: sarah@resistance.org
  experience:
    - company: Cyberdyne
      position: Security Consultant
      bullets:
        - Defended production infrastructure.
    """
    doc, warnings, errors = YamlParser.parse(yaml_str)
    assert errors == []
    assert doc is not None
    assert doc.profile.firstName == "Sarah"
    assert len(doc.experience) == 1
    assert doc.experience[0].company == "Cyberdyne"


def test_markdown_parser():
    md_str = """# Elena Rostova
Principal Cloud Architect

## Contact
elena@cloud.net • +1 (555) 987-6543 • Seattle, WA • linkedin.com/in/elena

## Summary
Experienced distributed systems engineer with 10 years scaling clusters.

## Experience
### Staff Cloud Engineer — Horizon Cloud
2021 — Present
- Architected multi-region Kubernetes mesh handling 2M requests/sec.
- Reduced cloud spend by 32% through spot instance automation.

## Skills
- Cloud: AWS, GCP, Terraform, Kubernetes
- Languages: Python, Go, TypeScript

## Patents & Honors
### Distributed Consensus Patent
Granted in 2023 for lock-free ledger synchronization.
"""
    doc, warnings, errors = MarkdownParser.parse(md_str)
    assert errors == []
    assert doc.profile.firstName == "Elena"
    assert doc.profile.lastName == "Rostova"
    assert doc.profile.email == "elena@cloud.net"
    assert len(doc.experience) == 1
    assert doc.experience[0].company == "Horizon Cloud"
    assert len(doc.experience[0].bullets) == 2
    assert len(doc.skills) >= 1
    # Patents & Honors should be captured as customSection!
    assert len(doc.customSections) == 1
    assert doc.customSections[0].title == "Patents & Honors"
