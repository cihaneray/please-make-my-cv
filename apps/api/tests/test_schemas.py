from app.schemas.resume import ExperienceItem, Profile, ResumeDocument, ResumeMetadata


def test_resume_document_default_creation():
    doc = ResumeDocument()
    assert doc.metadata.schemaVersion == 1
    assert doc.metadata.title == "Untitled Resume"
    assert doc.profile.firstName == ""
    assert isinstance(doc.experience, list)
    assert len(doc.experience) == 0
    assert doc.design.template == "minimal"


def test_resume_document_with_data():
    doc = ResumeDocument(
        metadata=ResumeMetadata(title="Architect CV", targetRole="Staff Engineer"),
        profile=Profile(firstName="Jane", lastName="Doe", email="jane@doe.com"),
        experience=[
            ExperienceItem(
                company="TechCorp",
                position="Lead Architect",
                bullets=["Built distributed transaction engine."],
                technologies=["Python", "FastAPI"],
            )
        ],
    )
    assert doc.metadata.title == "Architect CV"
    assert (
        doc.profile.fullName()
        if hasattr(doc.profile, "fullName")
        else f"{doc.profile.firstName} {doc.profile.lastName}" == "Jane Doe"
    )
    assert len(doc.experience) == 1
    assert doc.experience[0].company == "TechCorp"
