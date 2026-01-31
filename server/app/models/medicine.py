import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Medicine(Base):
    """Medicine model for tracking patient medications."""

    __tablename__ = "medicines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)

    # Medicine details
    name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=True)  # e.g., "500mg", "2 tablets"

    # Schedule pattern (1-0-1 style like doctor prescriptions)
    morning = Column(Boolean, default=False)
    afternoon = Column(Boolean, default=False)
    night = Column(Boolean, default=False)

    # Timing instruction
    timing = Column(String(20), default="any_time")  # "before_food", "after_food", "with_food", "any_time"

    # Duration
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # null = ongoing medicine

    # Additional info
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="medicines")
    logs = relationship("MedicineLog", back_populates="medicine", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Medicine {self.name} for patient_id={self.patient_id}>"

    @property
    def schedule_display(self) -> str:
        """Return schedule as 1-0-1 format."""
        m = "1" if self.morning else "0"
        a = "1" if self.afternoon else "0"
        n = "1" if self.night else "0"
        return f"{m}-{a}-{n}"
