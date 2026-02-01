import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class MoodEntry(Base):
    """Mood entry model for tracking daily mood levels."""

    __tablename__ = "mood_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)

    # Entry details
    entry_date = Column(Date, nullable=False)  # Date this mood is FOR
    mood_level = Column(Integer, nullable=False)  # 1-5 scale

    # Optional notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="mood_entries")

    def __repr__(self):
        return f"<MoodEntry level={self.mood_level} on {self.entry_date} for patient_id={self.patient_id}>"

    @property
    def mood_emoji(self) -> str:
        """Return emoji for mood level."""
        emojis = {1: "😢", 2: "😔", 3: "😐", 4: "🙂", 5: "😊"}
        return emojis.get(self.mood_level, "😐")

    @property
    def mood_label(self) -> str:
        """Return label for mood level."""
        labels = {1: "Very Bad", 2: "Bad", 3: "Okay", 4: "Good", 5: "Great"}
        return labels.get(self.mood_level, "Okay")
