from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class MedicineCreate(BaseModel):
    """Schema for creating a medicine."""
    name: str
    dosage: Optional[str] = None
    morning: bool = False
    afternoon: bool = False
    night: bool = False
    timing: str = "any_time"  # "before_food", "after_food", "with_food", "any_time"
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None


class MedicineUpdate(BaseModel):
    """Schema for updating a medicine."""
    name: Optional[str] = None
    dosage: Optional[str] = None
    morning: Optional[bool] = None
    afternoon: Optional[bool] = None
    night: Optional[bool] = None
    timing: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class MedicineResponse(BaseModel):
    """Schema for medicine response."""
    id: UUID
    patient_id: UUID
    name: str
    dosage: Optional[str]
    morning: bool
    afternoon: bool
    night: bool
    timing: str
    start_date: date
    end_date: Optional[date]
    notes: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MedicineLogCreate(BaseModel):
    """Schema for creating a medicine log entry."""
    scheduled_time: datetime
    time_of_day: str  # "morning", "afternoon", "night"
    status: str = "pending"  # "pending", "taken", "missed", "skipped"
    notes: Optional[str] = None


class MedicineLogUpdate(BaseModel):
    """Schema for updating a medicine log entry."""
    status: str  # "taken", "missed", "skipped"
    taken_at: Optional[datetime] = None
    notes: Optional[str] = None


class MedicineLogResponse(BaseModel):
    """Schema for medicine log response."""
    id: UUID
    medicine_id: UUID
    scheduled_time: datetime
    time_of_day: str
    taken_at: Optional[datetime]
    status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MedicineTodayItem(BaseModel):
    """Schema for today's medicine reminder item."""
    log_id: Optional[UUID]
    medicine_id: UUID
    medicine_name: str
    dosage: Optional[str]
    time_of_day: str  # "morning", "afternoon", "night"
    timing: str  # "before_food", etc.
    scheduled_time: datetime
    status: str  # "pending", "taken", "missed", "skipped"
    taken_at: Optional[datetime]


class MedicineTodayResponse(BaseModel):
    """Schema for today's medicine schedule."""
    date: date
    morning: List[MedicineTodayItem]
    afternoon: List[MedicineTodayItem]
    night: List[MedicineTodayItem]
    total_pending: int
    total_taken: int
    total_missed: int
