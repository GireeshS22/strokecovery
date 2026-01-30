from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class PatientProfileCreate(BaseModel):
    """Schema for creating/updating patient profile (onboarding)."""
    stroke_date: Optional[date] = None
    stroke_type: Optional[str] = None  # "ischemic", "hemorrhagic", "tbi"
    affected_side: Optional[str] = None  # "left", "right", "both"
    current_therapies: Optional[List[str]] = None  # ["PT", "OT", "Speech"]


class PatientProfileResponse(BaseModel):
    """Schema for patient profile response."""
    id: UUID
    user_id: UUID
    stroke_date: Optional[date]
    stroke_type: Optional[str]
    affected_side: Optional[str]
    current_therapies: Optional[List[str]]
    onboarding_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True
