from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID


class TherapySessionBase(BaseModel):
    """Base schema for therapy session."""
    therapy_type: str = Field(..., description="Type: PT, OT, Speech, Other")
    session_date: date
    session_time: Optional[time] = None
    duration_minutes: int = Field(..., ge=1, le=480)  # Max 8 hours
    notes: Optional[str] = None
    feeling_rating: int = Field(..., ge=1, le=5)  # 1-5 scale
    feeling_notes: Optional[str] = None


class TherapySessionCreate(TherapySessionBase):
    """Schema for creating a therapy session."""
    pass


class TherapySessionUpdate(BaseModel):
    """Schema for updating a therapy session."""
    therapy_type: Optional[str] = None
    session_date: Optional[date] = None
    session_time: Optional[time] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    notes: Optional[str] = None
    feeling_rating: Optional[int] = Field(None, ge=1, le=5)
    feeling_notes: Optional[str] = None


class TherapySessionResponse(TherapySessionBase):
    """Schema for therapy session response."""
    id: UUID
    patient_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CalendarDayItem(BaseModel):
    """Schema for a single day in calendar view."""
    date: date
    sessions: List[TherapySessionResponse]
    session_count: int
    therapy_types: List[str]  # List of therapy types on this day


class CalendarMonthResponse(BaseModel):
    """Schema for calendar month data."""
    year: int
    month: int
    days: List[CalendarDayItem]


class TherapyStatsResponse(BaseModel):
    """Schema for therapy statistics."""
    total_sessions: int
    total_minutes: int
    sessions_by_type: dict  # {"PT": 5, "OT": 3, ...}
    average_feeling: float
    this_week_sessions: int
    this_month_sessions: int
