"""
Database client for PaperRefinery - Supabase operations.
"""

from typing import List, Optional, Dict, Any
from supabase import create_client, Client

from .config import settings
from .models import (
    PaperMetadata,
    Section,
    ExtractedInsight,
    ParsedPaper,
    PaperExtraction
)


def get_client() -> Client:
    """Get Supabase client."""
    return create_client(settings.supabase_url, settings.supabase_key)


# ===== Paper Operations =====

def check_paper_exists(file_hash: str, client: Client = None) -> bool:
    """Check if a paper with this hash already exists."""
    if client is None:
        client = get_client()

    result = client.table("papers").select("id").eq("hash", file_hash).execute()
    return len(result.data) > 0


def get_paper_by_hash(file_hash: str, client: Client = None) -> Optional[Dict]:
    """Get paper by hash if it exists."""
    if client is None:
        client = get_client()

    result = client.table("papers").select("*").eq("hash", file_hash).execute()
    return result.data[0] if result.data else None


def insert_paper(metadata: PaperMetadata, client: Client = None) -> str:
    """
    Insert a paper record.

    Returns:
        paper_id (UUID string)
    """
    if client is None:
        client = get_client()

    data = {
        "hash": metadata.hash,
        "filename": metadata.filename,
        "title": metadata.title,
        "authors": metadata.authors,
        "publication_year": metadata.publication_year,
        "study_type": metadata.study_type
    }

    result = client.table("papers").insert(data).execute()
    return result.data[0]["id"]


# ===== Section Operations =====

def insert_section(
    paper_id: str,
    section: Section,
    client: Client = None
) -> str:
    """
    Insert a paper section.

    Returns:
        section_id (UUID string)
    """
    if client is None:
        client = get_client()

    data = {
        "paper_id": paper_id,
        "section_name": section.section_name,
        "raw_text": section.raw_text,
        "section_order": section.section_order
    }

    result = client.table("paper_sections").insert(data).execute()
    return result.data[0]["id"]


def insert_sections_batch(
    paper_id: str,
    sections: List[Section],
    client: Client = None
) -> List[str]:
    """
    Insert multiple sections in batch.

    Returns:
        List of section_ids
    """
    if client is None:
        client = get_client()

    data = [
        {
            "paper_id": paper_id,
            "section_name": section.section_name,
            "raw_text": section.raw_text,
            "section_order": section.section_order
        }
        for section in sections
    ]

    result = client.table("paper_sections").insert(data).execute()
    return [row["id"] for row in result.data]


# ===== Insight Operations =====

def insert_insight(
    paper_id: str,
    section_id: str,
    insight: ExtractedInsight,
    embedding: List[float],
    client: Client = None
) -> str:
    """
    Insert a single insight with its embedding.

    Returns:
        insight_id (UUID string)
    """
    if client is None:
        client = get_client()

    data = {
        "paper_id": paper_id,
        "section_id": section_id,
        "claim": insight.claim,
        "evidence": insight.evidence,
        "quantitative_result": insight.quantitative_result,
        "stroke_types": insight.stroke_types,
        "recovery_phase": insight.recovery_phase,
        "intervention": insight.intervention,
        "sample_size": insight.sample_size,
        "embedding": embedding
    }

    result = client.table("insights").insert(data).execute()
    return result.data[0]["id"]


def insert_insights_batch(
    paper_id: str,
    section_id: str,
    insights: List[ExtractedInsight],
    embeddings: List[List[float]],
    client: Client = None
) -> List[str]:
    """
    Insert multiple insights with embeddings in batch.

    Returns:
        List of insight_ids
    """
    if client is None:
        client = get_client()

    data = [
        {
            "paper_id": paper_id,
            "section_id": section_id,
            "claim": insight.claim,
            "evidence": insight.evidence,
            "quantitative_result": insight.quantitative_result,
            "stroke_types": insight.stroke_types,
            "recovery_phase": insight.recovery_phase,
            "intervention": insight.intervention,
            "sample_size": insight.sample_size,
            "embedding": embedding
        }
        for insight, embedding in zip(insights, embeddings)
    ]

    result = client.table("insights").insert(data).execute()
    return [row["id"] for row in result.data]


# ===== Search Operations =====

def search_insights(
    query_embedding: List[float],
    limit: int = 10,
    stroke_types: List[str] = None,
    recovery_phase: str = None,
    client: Client = None
) -> List[Dict[str, Any]]:
    """
    Search for similar insights using vector similarity.

    Args:
        query_embedding: 1536-dim embedding of the query
        limit: Max results to return
        stroke_types: Filter by stroke types (optional)
        recovery_phase: Filter by recovery phase (optional)

    Returns:
        List of matching insights with similarity scores
    """
    if client is None:
        client = get_client()

    result = client.rpc(
        "match_insights",
        {
            "query_embedding": query_embedding,
            "match_count": limit,
            "filter_stroke_types": stroke_types,
            "filter_recovery_phase": recovery_phase
        }
    ).execute()

    return result.data


# ===== Stats Operations =====

def get_stats(client: Client = None) -> Dict[str, int]:
    """Get counts of papers and insights."""
    if client is None:
        client = get_client()

    papers = client.table("papers").select("id", count="exact").execute()
    insights = client.table("insights").select("id", count="exact").execute()

    return {
        "papers": papers.count,
        "insights": insights.count
    }
