from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.exporters.json_exporter import JsonExporter
from app.exporters.markdown_exporter import MarkdownExporter
from app.exporters.yaml_exporter import YamlExporter
from app.schemas.resume import ExperienceItem, Profile, ResumeDocument, ResumeMetadata, SkillGroup


def sample_doc() -> ResumeDocument:
    return ResumeDocument(
        metadata=ResumeMetadata(title="Sample Developer CV"),
        profile=Profile(
            firstName="Marcus",
            lastName="Aurelius",
            headline="Stoic Architect",
            email="marcus@rome.gov",
            location="Rome, Italy",
        ),
        summary="Architecting resilient software systems with calm endurance.",
        experience=[
            ExperienceItem(
                company="Roman Empire",
                position="Emperor & Tech Lead",
                startDate="161 AD",
                endDate="180 AD",
                bullets=["Maintained Pax Romana and internal cluster stability."],
                technologies=["Governance", "Distributed Systems"],
            )
        ],
        skills=[SkillGroup(category="Leadership", skills=["Philosophy", "Crisis Management"])],
    )


def test_json_exporter():
    doc = sample_doc()
    res = JsonExporter.export(doc)
    assert '"Marcus"' in res
    assert '"Roman Empire"' in res


def test_yaml_exporter():
    doc = sample_doc()
    res = YamlExporter.export(doc)
    assert "firstName: Marcus" in res
    assert "company: Roman Empire" in res


def test_markdown_exporter():
    doc = sample_doc()
    res = MarkdownExporter.export(doc)
    assert "# Marcus Aurelius" in res
    assert "## Experience" in res
    assert "### Emperor & Tech Lead — Roman Empire" in res


def test_html_pdf_exporter():
    doc = sample_doc()
    res = HtmlPdfExporter.render_html(doc)
    assert "<!DOCTYPE html>" in res
    assert "Marcus Aurelius" in res
    assert "Pax Romana" in res
    assert "@page" in res


def test_html_pdf_exporter_templates_and_i18n():
    doc = sample_doc()

    # Technical template with English
    doc.design.template = "technical"
    doc.metadata.language = "en"
    res_tech = HtmlPdfExporter.render_html(doc)
    assert "TECHNICAL SKILLS" in res_tech
    assert "TECHNICAL SUMMARY" in res_tech

    # Professional template with Turkish
    doc.design.template = "professional"
    doc.metadata.language = "tr"
    res_prof_tr = HtmlPdfExporter.render_html(doc)
    assert "İŞ DENEYİMİ & KARİYER GEÇMİŞİ" in res_prof_tr
    assert "ÖZET" in res_prof_tr

    # Minimal template with Turkish
    doc.design.template = "minimal"
    doc.metadata.language = "tr"
    res_min_tr = HtmlPdfExporter.render_html(doc)
    assert "İŞ DENEYİMİ" in res_min_tr

