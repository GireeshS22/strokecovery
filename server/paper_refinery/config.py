"""
PaperRefinery configuration - loads and validates environment variables.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_key: str = Field(..., env="SUPABASE_KEY")

    # Together.ai (Llama)
    together_api_key: str = Field(..., env="TOGETHER_API_KEY")
    together_model: str = Field(
        default="meta-llama/Llama-3-70b-chat-hf",
        env="TOGETHER_MODEL"
    )

    # OpenAI (Embeddings)
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    embedding_model: str = Field(
        default="text-embedding-ada-002",
        env="EMBEDDING_MODEL"
    )
    embedding_dimensions: int = Field(default=1536, env="EMBEDDING_DIMENSIONS")

    # Paths
    papers_dir: str = Field(default="data/papers", env="PAPERS_DIR")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience alias
settings = get_settings()
