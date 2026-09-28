from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CV Workspace API"
    app_env: str = "development"
    debug: bool = False
    seed_demo: bool = False
    api_prefix: str = "/api"

    # Database
    database_url: str = "sqlite:///./cv_workspace.db"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Optional model connection configured through local Settings UI.
    ai_config_path: str = "data/ai-settings.json"
    pdf_browser_channel: str | None = None
    pdf_browser_executable: str | None = None

    # File uploads
    max_upload_size_bytes: int = 5 * 1024 * 1024  # 5 MB

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
