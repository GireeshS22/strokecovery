from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


class AilmentEntryBase(BaseModel):
    """Base schema for ailment entry."""
    entry_date: date
    symptom: str = Field(..., max_length=50)  # pain, fatigue, dizziness, numbness, headache, other
    body_location: Optional[str] = Field(None, max_length=50)
    severity: int = Field(..., ge=1, le=10)  # 1-10 scale
    notes: Optional[str] = None


class AilmentEntryCreate(AilmentEntryBase):
    """Schema for creating an ailment entry."""
    pass


class AilmentEntryUpdate(BaseModel):
    """Schema for updating an ailment entry."""
    entry_date: Optional[date] = None
    symptom: Optional[str] = Field(None, max_length=50)
    body_location: Optional[str] = Field(None, max_length=50)
    severity: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = None


class AilmentEntryResponse(AilmentEntryBase):
    """Schema for ailment entry response."""
    id: UUID
    patient_id: UUID
    created_at: datetime
    severity_label: str
    severity_color: str

    class Config:
        from_attributes = True
