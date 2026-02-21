import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class StrokeBite(Base):
    """Daily stroke bite card set generated for a patient."""

    __tablename__ = "stroke_bites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    generated_date = Column(Date, nullable=False)
    cards_json = Column(JSONB, nullable=False)  # Stores full card tree
    start_card_id = Column(String(20), nullable=False)
    card_sequence_length = Column(Integer, nullable=False, default=8)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="stroke_bites")
    answers = relationship("StrokeBiteAnswer", back_populates="bite", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<StrokeBite patient_id={self.patient_id} date={self.generated_date}>"


class StrokeBiteAnswer(Base):
    """Q&A answer from a stroke bite session for personalization."""

    __tablename__ = "stroke_bite_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bite_id = Column(UUID(as_uuid=True), ForeignKey("stroke_bites.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    card_id = Column(String(20), nullable=False)
    selected_key = Column(String(10), nullable=False)
    question_text = Column(Text, nullable=True)
    selected_label = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    bite = relationship("StrokeBite", back_populates="answers")
    patient = relationship("PatientProfile", back_populates="stroke_bite_answers")

    def __repr__(self):
        return f"<StrokeBiteAnswer card_id={self.card_id} selected={self.selected_key}>"
