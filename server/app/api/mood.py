from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.mood_entry import MoodEntry
from app.schemas.mood_entry import (
    MoodEntryCreate,
    MoodEntryUpdate,
    MoodEntryResponse,
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


@router.post("", response_model=MoodEntryResponse, status_code=status.HTTP_201_CREATED)
def create_mood_entry(
    entry_data: MoodEntryCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Log a mood entry for a specific date.

    - **entry_date**: Date this mood is for
    - **mood_level**: 1-5 scale (1=Very Bad, 5=Great)
    - **notes**: Optional notes
    """
    user, profile = get_user_and_profile(token, db)

    # Check if mood already exists for this date
    existing = db.query(MoodEntry).filter(
        MoodEntry.patient_id == profile.id,
        MoodEntry.entry_date == entry_data.entry_date
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mood entry already exists for this date. Use PUT to update."
        )

    new_entry = MoodEntry(
        patient_id=profile.id,
        entry_date=entry_data.entry_date,
        mood_level=entry_data.mood_level,
        notes=entry_data.notes,
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return MoodEntryResponse.model_validate(new_entry)


@router.get("", response_model=List[MoodEntryResponse])
def list_mood_entries(
    token: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List mood entries with optional filters.

    - **start_date**: Filter entries on or after this date
    - **end_date**: Filter entries on or before this date
    - **limit**: Number of results (default 50, max 200)
    - **offset**: Offset for pagination
    """
    user, profile = get_user_and_profile(token, db)

    query = db.query(MoodEntry).filter(MoodEntry.patient_id == profile.id)

    if start_date:
        query = query.filter(MoodEntry.entry_date >= start_date)

    if end_date:
        query = query.filter(MoodEntry.entry_date <= end_date)

    entries = query.order_by(MoodEntry.entry_date.desc()).offset(offset).limit(limit).all()

    return [MoodEntryResponse.model_validate(e) for e in entries]


@router.get("/{entry_id}", response_model=MoodEntryResponse)
def get_mood_entry(entry_id: UUID, token: str, db: Session = Depends(get_db)):
    """Get a specific mood entry by ID."""
    user, profile = get_user_and_profile(token, db)

    entry = db.query(MoodEntry).filter(
        MoodEntry.id == entry_id,
        MoodEntry.patient_id == profile.id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mood entry not found"
        )

    return MoodEntryResponse.model_validate(entry)


@router.put("/{entry_id}", response_model=MoodEntryResponse)
def update_mood_entry(
    entry_id: UUID,
    entry_data: MoodEntryUpdate,
    token: str,
    db: Session = Depends(get_db)
):
    """Update a mood entry."""
    user, profile = get_user_and_profile(token, db)

    entry = db.query(MoodEntry).filter(
        MoodEntry.id == entry_id,
        MoodEntry.patient_id == profile.id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mood entry not found"
        )

    if entry_data.entry_date is not None:
        # Check if new date conflicts with existing entry
        if entry_data.entry_date != entry.entry_date:
            existing = db.query(MoodEntry).filter(
                MoodEntry.patient_id == profile.id,
                MoodEntry.entry_date == entry_data.entry_date,
                MoodEntry.id != entry_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mood entry already exists for this date"
                )
        entry.entry_date = entry_data.entry_date

    if entry_data.mood_level is not None:
        entry.mood_level = entry_data.mood_level
    if entry_data.notes is not None:
        entry.notes = entry_data.notes

    db.commit()
    db.refresh(entry)

    return MoodEntryResponse.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mood_entry(entry_id: UUID, token: str, db: Session = Depends(get_db)):
    """Delete a mood entry."""
    user, profile = get_user_and_profile(token, db)

    entry = db.query(MoodEntry).filter(
        MoodEntry.id == entry_id,
        MoodEntry.patient_id == profile.id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mood entry not found"
        )

    db.delete(entry)
    db.commit()

    return None
