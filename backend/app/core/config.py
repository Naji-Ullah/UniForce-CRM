"""Application configuration loaded from environment variables.

Centralising settings here keeps secrets and tunables out of the codebase and
makes the service 12-factor friendly (the same image runs in every environment,
behaviour is driven purely by env vars).
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Application -------------------------------------------------------
    PROJECT_NAME: str = "Shizuka University CRM"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # --- Database ----------------------------------------------------------
    POSTGRES_USER: str = "shizuka"
    POSTGRES_PASSWORD: str = "shizuka"
    POSTGRES_DB: str = "shizuka_crm"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # --- Security ----------------------------------------------------------
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Bootstrap (Head Admin seeded on first run) ------------------------
    HEAD_ADMIN_EMAIL: str = "admin@shizuka.io"
    HEAD_ADMIN_PASSWORD: str = "Admin@12345"
    HEAD_ADMIN_NAME: str = "Platform Owner"

    # --- CORS --------------------------------------------------------------
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
