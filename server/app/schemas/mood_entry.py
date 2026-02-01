from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


class MoodEntryBase(BaseModel):
    """Base schema for mood entry."""
    entry_date: date
    mood_level: int = Field(..., ge=1, le=5)  # 1-5 scale
    notes: Optional[str] = None


class MoodEntryCreate(MoodEntryBase):
    """Schema for creating a mood entry."""
    pass


class MoodEntryUpdate(BaseModel):
    """Schema for updating a mood entry."""
    entry_date: Optional[date] = None
    mood_level: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class MoodEntryResponse(MoodEntryBase):
    """Schema for mood entry response."""
    id: UUID
    patient_id: UUID
    created_at: datetime
    mood_emoji: str
    mood_label: str

    class Config:
        from_attributes = True
