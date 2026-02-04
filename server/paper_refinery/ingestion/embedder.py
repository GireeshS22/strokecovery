"""
Embedder - Generate vector embeddings for insights using OpenAI.
"""

from typing import List
from openai import OpenAI

from ..config import settings
from ..models import ExtractedInsight


def get_client() -> OpenAI:
    """Get OpenAI client."""
    return OpenAI(api_key=settings.openai_api_key)


def create_insight_text(insight: ExtractedInsight) -> str:
    """
    Create text representation of an insight for embedding.
    Combines claim + evidence + context for richer embedding.
    """
    parts = [insight.claim]

    if insight.evidence:
        parts.append(f"Evidence: {insight.evidence}")

    if insight.quantitative_result:
        parts.append(f"Results: {insight.quantitative_result}")

    if insight.intervention:
        parts.append(f"Intervention: {insight.intervention}")

    return " ".join(parts)


def embed_text(text: str, client: OpenAI = None) -> List[float]:
    """
    Generate embedding for a single text.

    Args:
        text: Text to embed
        client: OpenAI client (creates one if not provided)

    Returns:
        List of 1536 floats (embedding vector)
    """
    if client is None:
        client = get_client()

    response = client.embeddings.create(
        model=settings.embedding_model,
        input=text
    )

    return response.data[0].embedding


def embed_insight(insight: ExtractedInsight, client: OpenAI = None) -> List[float]:
    """
    Generate embedding for a single insight.

    Args:
        insight: ExtractedInsight to embed
        client: OpenAI client

    Returns:
        List of 1536 floats (embedding vector)
    """
    text = create_insight_text(insight)
    return embed_text(text, client)


def embed_insights_batch(
    insights: List[ExtractedInsight],
    client: OpenAI = None
) -> List[List[float]]:
    """
    Generate embeddings for multiple insights in batch.

    Args:
        insights: List of insights to embed
        client: OpenAI client

    Returns:
        List of embedding vectors (one per insight)
    """
    if not insights:
        return []

    if client is None:
        client = get_client()

    # Create text for each insight
    texts = [create_insight_text(insight) for insight in insights]

    # Batch embed (OpenAI supports up to 2048 texts per request)
    response = client.embeddings.create(
        model=settings.embedding_model,
        input=texts
    )

    # Return embeddings in same order as input
    return [item.embedding for item in response.data]


def embed_query(query: str, client: OpenAI = None) -> List[float]:
    """
    Generate embedding for a search query.

    Args:
        query: Search query text
        client: OpenAI client

    Returns:
        List of 1536 floats (embedding vector)
    """
    return embed_text(query, client)
