from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.
    Add new config values here as the project grows.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App identity
    app_name: str = "S21 Regenerative Tourism Impact Ledger"
    app_version: str = "0.1.0"
    env: str = "development"

    # Database – populated via DATABASE_URL in .env
    database_url: str = "postgresql://postgres:password@localhost:5432/s21_db"

    # Logging configuration
    log_level: str = "INFO"

    # EcoTrace AI / Gemini configuration
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_api_url: str = "https://generativelanguage.googleapis.com/v1beta/models"

    # CORS configuration for frontend clients
    cors_origins: list[str] = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:8000",
    "https://purchased-seattle-loops-syndrome.trycloudflare.com",
]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            # Split comma-separated string
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(i).strip() for i in v if str(i).strip()]
        return v


# Single shared instance imported across the application
settings = Settings()
