import uuid
from datetime import datetime, date, time
from sqlalchemy import Column, String, Date, Time, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class TherapySession(Base):
    """Therapy session model for tracking PT/OT/Speech therapy appointments."""

    __tablename__ = "therapy_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)

    # Session details
    therapy_type = Column(String(20), nullable=False)  # "PT", "OT", "Speech", "Other"
    session_date = Column(Date, nullable=False)
    session_time = Column(Time, nullable=True)  # Optional time
    duration_minutes = Column(Integer, nullable=False)  # Duration in minutes

    # Notes
    notes = Column(Text, nullable=True)

    # How did you feel after? (1-5 scale)
    # 1 = Very Tired, 2 = Tired, 3 = Okay, 4 = Good, 5 = Great
    feeling_rating = Column(Integer, nullable=False)
    feeling_notes = Column(Text, nullable=True)  # Optional note about feeling

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="therapy_sessions")

    def __repr__(self):
        return f"<TherapySession {self.therapy_type} on {self.session_date} for patient_id={self.patient_id}>"

    @property
    def feeling_emoji(self) -> str:
        """Return emoji for feeling rating."""
        emojis = {1: "😫", 2: "😔", 3: "😐", 4: "🙂", 5: "😊"}
        return emojis.get(self.feeling_rating, "😐")

    @property
    def feeling_label(self) -> str:
        """Return label for feeling rating."""
        labels = {1: "Very Tired", 2: "Tired", 3: "Okay", 4: "Good", 5: "Great"}
        return labels.get(self.feeling_rating, "Okay")
