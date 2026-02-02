import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class GameResult(Base):
    """Game result for cognitive word-image association games."""

    __tablename__ = "game_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(String(20), nullable=False)  # "emoji_1", "word_1", etc.
    game_type = Column(String(20), nullable=False)  # "emoji_to_word", "word_to_emoji"
    score = Column(Integer, nullable=False)  # 1=correct, 0=wrong
    time_seconds = Column(Integer, nullable=True)  # Optional time taken
    played_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="game_results")

    def __repr__(self):
        return f"<GameResult game_id={self.game_id} score={self.score}>"
