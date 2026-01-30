from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database (PostgreSQL direct connection)
    database_url: str

    # Supabase (same as web/config.js)
    supabase_url: str
    supabase_key: str

    # JWT Authentication
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # App info
    app_name: str = "Strokecovery API"
    debug: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
