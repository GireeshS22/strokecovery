import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Boolean, DateTime, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class PatientProfile(Base):
    """Patient profile with onboarding data."""

    __tablename__ = "patient_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    stroke_date = Column(Date, nullable=True)
    stroke_type = Column(String(50), nullable=True)  # "ischemic", "hemorrhagic", "tbi"
    affected_side = Column(String(20), nullable=True)  # "left", "right", "both"
    current_therapies = Column(ARRAY(String), nullable=True)  # ["PT", "OT", "Speech"]
    onboarding_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="profile")
    medicines = relationship("Medicine", back_populates="patient", cascade="all, delete-orphan")
    therapy_sessions = relationship("TherapySession", back_populates="patient", cascade="all, delete-orphan")
    mood_entries = relationship("MoodEntry", back_populates="patient", cascade="all, delete-orphan")
    ailment_entries = relationship("AilmentEntry", back_populates="patient", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PatientProfile user_id={self.user_id}>"
