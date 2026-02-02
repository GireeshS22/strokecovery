from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID


class GameResultCreate(BaseModel):
    """Schema for creating a game result."""
    game_id: str = Field(..., max_length=20)  # "emoji_1", "word_1", etc.
    game_type: str = Field(..., max_length=20)  # "emoji_to_word", "word_to_emoji"
    score: int = Field(..., ge=0, le=1)  # 1=correct, 0=wrong
    time_seconds: Optional[int] = Field(None, ge=0)


class GameResultResponse(BaseModel):
    """Schema for game result response."""
    id: UUID
    patient_id: UUID
    game_id: str
    game_type: str
    score: int
    time_seconds: Optional[int]
    played_at: datetime

    class Config:
        from_attributes = True


class GameStatsResponse(BaseModel):
    """Schema for game statistics response."""
    total_games: int
    correct_answers: int
    accuracy: float  # Percentage 0-100
    games_today: int
    correct_today: int
    accuracy_today: float
    current_streak: int  # Consecutive days played
    last_played_date: Optional[date]  # Last date user played


class GameResultListResponse(BaseModel):
    """Schema for list of game results."""
    results: List[GameResultResponse]
    total: int
