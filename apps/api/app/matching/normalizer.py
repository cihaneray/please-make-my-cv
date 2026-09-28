import re

SYNONYM_MAP: dict[str, str] = {
    "postgres": "postgresql",
    "pgsql": "postgresql",
    "js": "javascript",
    "ts": "typescript",
    "reactjs": "react",
    "react.js": "react",
    "nextjs": "next.js",
    "vuejs": "vue",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "k8s": "kubernetes",
    "golang": "go",
    "py": "python",
    "aws": "amazon web services",
    "gcp": "google cloud platform",
    "rest": "restful apis",
    "restful": "restful apis",
    "ci/cd": "cicd",
    "ci-cd": "cicd",
}

KNOWN_TECH_KEYWORDS: set[str] = {
    "python",
    "fastapi",
    "django",
    "flask",
    "sqlalchemy",
    "alembic",
    "pydantic",
    "typescript",
    "javascript",
    "react",
    "next.js",
    "tailwind",
    "css",
    "html",
    "node.js",
    "nodejs",
    "graphql",
    "restful apis",
    "docker",
    "kubernetes",
    "postgresql",
    "sqlite",
    "mysql",
    "redis",
    "mongodb",
    "aws",
    "gcp",
    "azure",
    "git",
    "github",
    "linux",
    "cicd",
    "microservices",
    "system design",
    "architecture",
    "design systems",
    "figma",
    "ui/ux",
    "interaction design",
    "prototyping",
    "accessibility",
    "wcag",
    "agile",
    "scrum",
    "jest",
    "pytest",
    "vitest",
    "playwright",
    "machine learning",
    "deep learning",
    "nlp",
    "llm",
    "rag",
    "pytorch",
    "tensorflow",
}


def normalize_keyword(keyword: str) -> str:
    cleaned = keyword.strip().lower()
    cleaned = re.sub(r"[^\w\s\.\/\-\+]", "", cleaned)
    return SYNONYM_MAP.get(cleaned, cleaned)


def extract_keywords_from_text(text: str) -> set[str]:
    found: set[str] = set()
    cleaned_text = text.lower()

    # Match against dictionary of known tech keywords
    for kw in KNOWN_TECH_KEYWORDS | set(SYNONYM_MAP) | set(SYNONYM_MAP.values()):
        # Regex word boundary check
        pattern = r"\b" + re.escape(kw) + r"\b"
        if re.search(pattern, cleaned_text):
            found.add(normalize_keyword(kw))

    # Also detect capital abbreviations (e.g. AWS, GCP, SQL, CI/CD)
    words = re.findall(r"\b[A-Za-z0-9\.\/\+\#]{2,15}\b", text)
    for w in words:
        norm = normalize_keyword(w)
        if norm in KNOWN_TECH_KEYWORDS:
            found.add(norm)

    return found
