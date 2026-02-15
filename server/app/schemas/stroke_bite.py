from datetime import date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID


class BiteOption(BaseModel):
    """Option for a Q&A card."""
    key: str = Field(..., max_length=10)  # "a", "b", "c"
    label: str = Field(..., max_length=200)  # "Yes", "No", etc.
    next_card_id: str = Field(..., max_length=20)  # ID of next card for this choice


class BiteCard(BaseModel):
    """A single card in the stroke bite flow."""
    id: str = Field(..., max_length=20)  # "c1", "c2", "c3a", etc.
    type: str = Field(..., max_length=30)  # "welcome", "research_fact", "motivation", "qa", "conditional_response", "tip"
    title: Optional[str] = Field(None, max_length=200)
    body: str = Field(..., max_length=1000)  # Main text content
    emoji: Optional[str] = Field(None, max_length=10)
    background_color: str = Field(default="#0D9488", max_length=7)  # Hex color
    source_insight_id: Optional[str] = None  # Links to insights table if research-based

    # For Q&A cards only
    question: Optional[str] = Field(None, max_length=500)
    options: Optional[List[BiteOption]] = None

    # For linear navigation (non-QA cards)
    next_card_id: Optional[str] = Field(None, max_length=20)


class StrokeBiteResponse(BaseModel):
    """Response containing the full bite session."""
    id: UUID
    generated_date: date
    cards: List[BiteCard]
    start_card_id: str
    total_cards: int
    card_sequence_length: int

    class Config:
        from_attributes = True


class StrokeBiteAnswerItem(BaseModel):
    """Single Q&A answer."""
    card_id: str = Field(..., max_length=20)
    selected_key: str = Field(..., max_length=10)
    question_text: Optional[str] = Field(None, max_length=500)
    selected_label: Optional[str] = Field(None, max_length=200)


class StrokeBiteAnswerCreate(BaseModel):
    """Schema for saving Q&A answers."""
    bite_id: UUID
    answers: List[StrokeBiteAnswerItem]


class StrokeBiteAnswerResponse(BaseModel):
    """Response after saving answers."""
    id: UUID
    bite_id: UUID
    saved: bool = True
    answers_count: int

    class Config:
        from_attributes = True
