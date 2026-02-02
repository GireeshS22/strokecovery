from datetime import date, datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.game_result import GameResult
from app.schemas.game_result import (
    GameResultCreate,
    GameResultResponse,
    GameStatsResponse,
    GameResultListResponse,
)

router = APIRouter()


def get_user_and_profile(token: str, db: Session) -> tuple[User, PatientProfile]:
    """Helper to get user and patient profile from token."""
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found. Complete onboarding first."
        )

    return user, profile


@router.post("/results", response_model=GameResultResponse, status_code=status.HTTP_201_CREATED)
def save_game_result(
    result_data: GameResultCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Save a game result.

    - **game_id**: Identifier for the game ("emoji_1", "word_1", etc.)
    - **game_type**: Type of game ("emoji_to_word" or "word_to_emoji")
    - **score**: 1 for correct, 0 for wrong
    - **time_seconds**: Optional time taken to answer
    """
    user, profile = get_user_and_profile(token, db)

    new_result = GameResult(
        patient_id=profile.id,
        game_id=result_data.game_id,
        game_type=result_data.game_type,
        score=result_data.score,
        time_seconds=result_data.time_seconds,
    )

    db.add(new_result)
    db.commit()
    db.refresh(new_result)

    return GameResultResponse.model_validate(new_result)


@router.get("/results", response_model=GameResultListResponse)
def list_game_results(
    token: str,
    game_type: str = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List game results with optional filtering.

    - **game_type**: Filter by game type (optional)
    - **limit**: Number of results (default 50, max 200)
    - **offset**: Offset for pagination
    """
    user, profile = get_user_and_profile(token, db)

    query = db.query(GameResult).filter(GameResult.patient_id == profile.id)

    if game_type:
        query = query.filter(GameResult.game_type == game_type)

    total = query.count()
    results = query.order_by(GameResult.played_at.desc()).offset(offset).limit(limit).all()

    return GameResultListResponse(
        results=[GameResultResponse.model_validate(r) for r in results],
        total=total
    )


def calculate_streak(db: Session, patient_id, today: date) -> tuple[int, Optional[date]]:
    """Calculate current streak of consecutive days played."""
    # Get distinct dates when user played, ordered descending
    played_dates_result = db.query(
        cast(GameResult.played_at, Date).label('play_date')
    ).filter(
        GameResult.patient_id == patient_id
    ).distinct().order_by(
        cast(GameResult.played_at, Date).desc()
    ).all()

    if not played_dates_result:
        return 0, None

    played_dates = [row.play_date for row in played_dates_result]
    last_played = played_dates[0]

    # If last played is not today or yesterday, streak is 0
    if last_played < today - timedelta(days=1):
        return 0, last_played

    # Count consecutive days starting from the most recent
    streak = 0
    check_date = today if last_played == today else today - timedelta(days=1)

    for play_date in played_dates:
        if play_date == check_date:
            streak += 1
            check_date -= timedelta(days=1)
        elif play_date < check_date:
            # Gap in dates, streak ends
            break

    return streak, last_played


@router.get("/stats", response_model=GameStatsResponse)
def get_game_stats(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get game statistics for the current user.

    Returns total games, accuracy, today's stats, and streak.
    """
    user, profile = get_user_and_profile(token, db)

    # Get all-time stats
    total_result = db.query(
        func.count(GameResult.id).label('total'),
        func.sum(GameResult.score).label('correct')
    ).filter(GameResult.patient_id == profile.id).first()

    total_games = total_result.total or 0
    correct_answers = int(total_result.correct or 0)
    accuracy = (correct_answers / total_games * 100) if total_games > 0 else 0

    # Get today's stats
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    today_end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)

    today_result = db.query(
        func.count(GameResult.id).label('total'),
        func.sum(GameResult.score).label('correct')
    ).filter(
        GameResult.patient_id == profile.id,
        GameResult.played_at >= today_start,
        GameResult.played_at <= today_end
    ).first()

    games_today = today_result.total or 0
    correct_today = int(today_result.correct or 0)
    accuracy_today = (correct_today / games_today * 100) if games_today > 0 else 0

    # Calculate streak
    current_streak, last_played_date = calculate_streak(db, profile.id, today)

    return GameStatsResponse(
        total_games=total_games,
        correct_answers=correct_answers,
        accuracy=round(accuracy, 1),
        games_today=games_today,
        correct_today=correct_today,
        accuracy_today=round(accuracy_today, 1),
        current_streak=current_streak,
        last_played_date=last_played_date
    )
