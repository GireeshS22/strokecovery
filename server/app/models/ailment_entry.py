import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class AilmentEntry(Base):
    """Ailment entry model for tracking symptoms and issues."""

    __tablename__ = "ailment_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)

    # Entry details
    entry_date = Column(Date, nullable=False)  # Date this ailment is FOR
    symptom = Column(String(50), nullable=False)  # pain, fatigue, dizziness, numbness, headache, other
    body_location = Column(String(50), nullable=True)  # shoulder, head, leg, etc. (optional)
    severity = Column(Integer, nullable=False)  # 1-10 scale

    # Optional notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="ailment_entries")

    def __repr__(self):
        return f"<AilmentEntry {self.symptom} severity={self.severity} on {self.entry_date}>"

    @property
    def severity_label(self) -> str:
        """Return label for severity level."""
        if self.severity <= 3:
            return "Mild"
        elif self.severity <= 6:
            return "Moderate"
        else:
            return "Severe"

    @property
    def severity_color(self) -> str:
        """Return color for severity level."""
        if self.severity <= 3:
            return "#10B981"  # green
        elif self.severity <= 6:
            return "#F59E0B"  # amber
        else:
            return "#EF4444"  # red
