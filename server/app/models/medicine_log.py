import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class MedicineLog(Base):
    """Log entries for medicine intake tracking."""

    __tablename__ = "medicine_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_id = Column(UUID(as_uuid=True), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)

    # Schedule info
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    time_of_day = Column(String(20), nullable=False)  # "morning", "afternoon", "night"

    # Status tracking
    taken_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending")  # "pending", "taken", "missed", "skipped"

    # Additional info
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    medicine = relationship("Medicine", back_populates="logs")

    def __repr__(self):
        return f"<MedicineLog medicine_id={self.medicine_id} status={self.status}>"
