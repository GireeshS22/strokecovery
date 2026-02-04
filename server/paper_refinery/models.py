"""
Pydantic models for PaperRefinery data structures.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ===== Extraction Models =====

class ExtractedInsight(BaseModel):
    """A single insight extracted from a paper section."""

    claim: str = Field(..., description="The main finding or claim")
    evidence: Optional[str] = Field(None, description="Supporting evidence or methodology")
    quantitative_result: Optional[str] = Field(None, description="Specific numbers, metrics, p-values")
    stroke_types: List[str] = Field(default_factory=list, description="Applicable stroke types: ischemic, hemorrhagic, tbi")
    recovery_phase: Optional[str] = Field(None, description="Recovery phase: acute, subacute, chronic")
    intervention: Optional[str] = Field(None, description="Treatment or therapy mentioned")
    sample_size: Optional[int] = Field(None, description="Number of participants if mentioned")


class SectionExtraction(BaseModel):
    """Extraction result for a single section."""

    section_name: str
    insights: List[ExtractedInsight]


class PaperExtraction(BaseModel):
    """Complete extraction result for a paper."""

    sections: List[SectionExtraction]
    total_insights: int = 0

    def __init__(self, **data):
        super().__init__(**data)
        self.total_insights = sum(len(s.insights) for s in self.sections)


# ===== Paper Models =====

class PaperMetadata(BaseModel):
    """Metadata extracted from a paper."""

    filename: str
    hash: str
    title: Optional[str] = None
    authors: List[str] = Field(default_factory=list)
    publication_year: Optional[int] = None
    study_type: Optional[str] = Field(None, description="rct, meta-analysis, cohort, case-study, review")


class Section(BaseModel):
    """A parsed section from a paper."""

    section_name: str
    raw_text: str
    section_order: int


class ParsedPaper(BaseModel):
    """Result of parsing a PDF."""

    metadata: PaperMetadata
    sections: List[Section]
    full_text: str  # Complete markdown


# ===== Processing Models =====

class ProcessingResult(BaseModel):
    """Result of processing a single paper."""

    paper_id: Optional[str] = None
    filename: str
    success: bool
    error: Optional[str] = None
    sections_count: int = 0
    insights_count: int = 0
    processing_time_seconds: float = 0.0


class BatchProcessingResult(BaseModel):
    """Result of processing multiple papers."""

    total_papers: int
    successful: int
    failed: int
    results: List[ProcessingResult]
