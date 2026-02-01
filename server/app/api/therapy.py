from datetime import datetime, date, timedelta
from typing import List, Optional
from uuid import UUID
from calendar import monthrange
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.therapy_session import TherapySession
from app.schemas.therapy_session import (
    TherapySessionCreate,
    TherapySessionUpdate,
    TherapySessionResponse,
    CalendarDayItem,
    CalendarMonthResponse,
    TherapyStatsResponse,
)

router = APIRouter()

# Valid therapy types
VALID_THERAPY_TYPES = ["PT", "OT", "Speech", "Other"]


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


@router.post("/sessions", response_model=TherapySessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_data: TherapySessionCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Log a new therapy session.

    - **therapy_type**: "PT", "OT", "Speech", or "Other"
    - **session_date**: Date of the session
    - **session_time**: Optional time of the session
    - **duration_minutes**: Duration in minutes (1-480)
    - **notes**: Optional notes about the session
    - **feeling_rating**: 1-5 scale (1=Very Tired, 5=Great)
    - **feeling_notes**: Optional note about how you felt
    """
    user, profile = get_user_and_profile(token, db)

    # Validate therapy type
    if session_data.therapy_type not in VALID_THERAPY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid therapy type. Must be one of: {', '.join(VALID_THERAPY_TYPES)}"
        )

    new_session = TherapySession(
        patient_id=profile.id,
        therapy_type=session_data.therapy_type,
        session_date=session_data.session_date,
        session_time=session_data.session_time,
        duration_minutes=session_data.duration_minutes,
        notes=session_data.notes,
        feeling_rating=session_data.feeling_rating,
        feeling_notes=session_data.feeling_notes,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return TherapySessionResponse.model_validate(new_session)


@router.get("/sessions", response_model=List[TherapySessionResponse])
def list_sessions(
    token: str,
    therapy_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List therapy sessions with optional filters.

    - **therapy_type**: Filter by type (PT, OT, Speech, Other)
    - **start_date**: Filter sessions on or after this date
    - **end_date**: Filter sessions on or before this date
    - **limit**: Number of results (default 50, max 200)
    - **offset**: Offset for pagination
    """
    user, profile = get_user_and_profile(token, db)

    query = db.query(TherapySession).filter(TherapySession.patient_id == profile.id)

    if therapy_type:
        query = query.filter(TherapySession.therapy_type == therapy_type)

    if start_date:
        query = query.filter(TherapySession.session_date >= start_date)

    if end_date:
        query = query.filter(TherapySession.session_date <= end_date)

    sessions = query.order_by(TherapySession.session_date.desc(), TherapySession.session_time.desc()).offset(offset).limit(limit).all()

    return [TherapySessionResponse.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=TherapySessionResponse)
def get_session(session_id: UUID, token: str, db: Session = Depends(get_db)):
    """Get a specific therapy session by ID."""
    user, profile = get_user_and_profile(token, db)

    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.patient_id == profile.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return TherapySessionResponse.model_validate(session)


@router.put("/sessions/{session_id}", response_model=TherapySessionResponse)
def update_session(
    session_id: UUID,
    session_data: TherapySessionUpdate,
    token: str,
    db: Session = Depends(get_db)
):
    """Update a therapy session."""
    user, profile = get_user_and_profile(token, db)

    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.patient_id == profile.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Validate therapy type if provided
    if session_data.therapy_type is not None:
        if session_data.therapy_type not in VALID_THERAPY_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid therapy type. Must be one of: {', '.join(VALID_THERAPY_TYPES)}"
            )
        session.therapy_type = session_data.therapy_type

    if session_data.session_date is not None:
        session.session_date = session_data.session_date
    if session_data.session_time is not None:
        session.session_time = session_data.session_time
    if session_data.duration_minutes is not None:
        session.duration_minutes = session_data.duration_minutes
    if session_data.notes is not None:
        session.notes = session_data.notes
    if session_data.feeling_rating is not None:
        session.feeling_rating = session_data.feeling_rating
    if session_data.feeling_notes is not None:
        session.feeling_notes = session_data.feeling_notes

    db.commit()
    db.refresh(session)

    return TherapySessionResponse.model_validate(session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: UUID, token: str, db: Session = Depends(get_db)):
    """Delete a therapy session."""
    user, profile = get_user_and_profile(token, db)

    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.patient_id == profile.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    db.delete(session)
    db.commit()

    return None


@router.get("/calendar/{year}/{month}", response_model=CalendarMonthResponse)
def get_calendar_month(
    year: int,
    month: int,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get calendar data for a specific month.

    Returns days with sessions and their therapy types.
    """
    user, profile = get_user_and_profile(token, db)

    # Validate year and month
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )

    # Get first and last day of month
    _, last_day = monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    # Get all sessions for this month
    sessions = db.query(TherapySession).filter(
        TherapySession.patient_id == profile.id,
        TherapySession.session_date >= start_date,
        TherapySession.session_date <= end_date
    ).order_by(TherapySession.session_date, TherapySession.session_time).all()

    # Group sessions by date
    sessions_by_date = {}
    for session in sessions:
        date_key = session.session_date
        if date_key not in sessions_by_date:
            sessions_by_date[date_key] = []
        sessions_by_date[date_key].append(session)

    # Build calendar day items for days with sessions
    days = []
    for session_date, day_sessions in sessions_by_date.items():
        therapy_types = list(set(s.therapy_type for s in day_sessions))
        day_item = CalendarDayItem(
            date=session_date,
            sessions=[TherapySessionResponse.model_validate(s) for s in day_sessions],
            session_count=len(day_sessions),
            therapy_types=therapy_types,
        )
        days.append(day_item)

    return CalendarMonthResponse(
        year=year,
        month=month,
        days=days,
    )


@router.get("/stats", response_model=TherapyStatsResponse)
def get_stats(token: str, db: Session = Depends(get_db)):
    """
    Get therapy statistics summary.

    Returns total sessions, minutes, breakdown by type, and averages.
    """
    user, profile = get_user_and_profile(token, db)

    # Get all sessions for this user
    all_sessions = db.query(TherapySession).filter(
        TherapySession.patient_id == profile.id
    ).all()

    if not all_sessions:
        return TherapyStatsResponse(
            total_sessions=0,
            total_minutes=0,
            sessions_by_type={},
            average_feeling=0.0,
            this_week_sessions=0,
            this_month_sessions=0,
        )

    # Calculate totals
    total_sessions = len(all_sessions)
    total_minutes = sum(s.duration_minutes for s in all_sessions)

    # Sessions by type
    sessions_by_type = {}
    for session in all_sessions:
        if session.therapy_type not in sessions_by_type:
            sessions_by_type[session.therapy_type] = 0
        sessions_by_type[session.therapy_type] += 1

    # Average feeling
    avg_feeling = sum(s.feeling_rating for s in all_sessions) / total_sessions

    # This week sessions
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    this_week_sessions = len([s for s in all_sessions if s.session_date >= week_start])

    # This month sessions
    month_start = date(today.year, today.month, 1)
    this_month_sessions = len([s for s in all_sessions if s.session_date >= month_start])

    return TherapyStatsResponse(
        total_sessions=total_sessions,
        total_minutes=total_minutes,
        sessions_by_type=sessions_by_type,
        average_feeling=round(avg_feeling, 1),
        this_week_sessions=this_week_sessions,
        this_month_sessions=this_month_sessions,
    )
