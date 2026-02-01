from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.ailment_entry import AilmentEntry
from app.schemas.ailment_entry import (
    AilmentEntryCreate,
    AilmentEntryUpdate,
    AilmentEntryResponse,
)

router = APIRouter()

# Valid symptom types
VALID_SYMPTOMS = ["pain", "fatigue", "dizziness", "numbness", "headache", "weakness", "spasticity", "other"]


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


@router.post("", response_model=AilmentEntryResponse, status_code=status.HTTP_201_CREATED)
def create_ailment_entry(
    entry_data: AilmentEntryCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Log an ailment entry for a specific date.

    - **entry_date**: Date this ailment is for
    - **symptom**: Type of symptom (pain, fatigue, dizziness, numbness, headache, weakness, spasticity, other)
    - **body_location**: Optional body location (shoulder, head, leg, etc.)
    - **severity**: 1-10 scale
    - **notes**: Optional notes
    """
    user, profile = get_user_and_profile(token, db)

    new_entry = AilmentEntry(
        patient_id=profile.id,
        entry_date=entry_data.entry_date,
        symptom=entry_data.symptom,
        body_location=entry_data.body_location,
        severity=entry_data.severity,
        notes=entry_data.notes,
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return AilmentEntryResponse.model_validate(new_entry)


@router.get("", response_model=List[AilmentEntryResponse])
def list_ailment_entries(
    token: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    symptom: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List ailment entries with optional filters.

    - **start_date**: Filter entries on or after this date
    - **end_date**: Filter entries on or before this date
    - **symptom**: Filter by symptom type
    - **limit**: Number of results (default 50, max 200)
    - **offset**: Offset for pagination
    """
    user, profile = get_user_and_profile(token, db)

    query = db.query(AilmentEntry).filter(AilmentEntry.patient_id == profile.id)

    if start_date:
        query = query.filter(AilmentEntry.entry_date >= start_date)

    if end_date:
        query = query.filter(AilmentEntry.entry_date <= end_date)

    if symptom:
        query = query.filter(AilmentEntry.symptom == symptom)

    entries = query.order_by(AilmentEntry.entry_date.desc(), AilmentEntry.created_at.desc()).offset(offset).limit(limit).all()

    return [AilmentEntryResponse.model_validate(e) for e in entries]


@router.get("/{entry_id}", response_model=AilmentEntryResponse)
def get_ailment_entry(entry_id: UUID, token: str, db: Session = Depends(get_db)):
    """Get a specific ailment entry by ID."""
    user, profile = get_user_and_profile(token, db)

    entry = db.query(AilmentEntry).filter(
        AilmentEntry.id == entry_id,
        AilmentEntry.patient_id == profile.id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ailment entry not found"
        )

    return AilmentEntryResponse.model_validate(entry)


@router.put("/{entry_id}", response_model=AilmentEntryResponse)
def update_ailment_entry(
    entry_id: UUID,
    entry_data: AilmentEntryUpdate,
    token: str,
    db: Session = Depends(get_db)
):
    """Update an ailment entry."""
    user, profile = get_user_and_profile(token, db)

    entry = db.query(AilmentEntry).filter(
        AilmentEntry.id == entry_id,
        AilmentEntry.patient_id == profile.id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ailment entry not found"
        )

    if entry_data.entry_date is not None:
        entry.entry_date = entry_data.entry_date
    if entry_data.symptom is not None:
        entry.symptom = entry_data.symptom
    if entry_data.body_location is not None:
        entry.body_location = entry_data.body_location
    if entry_data.severity is not None:
        entry.severity = entry_data.severity
    if entry_data.notes is not None:
        entry.notes = entry_data.notes

    db.commit()
    db.refresh(entry)

    return AilmentEntryResponse.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ailment_entry(entry_id: UUID, token: str, db: Session = Depends(get_db)):
    """Delete an ailment entry."""
    user, profile = get_user_and_profile(token, db)

    entry = db.query(AilmentEntry).filter(
        AilmentEntry.id == entry_id,
        AilmentEntry.patient_id == profile.id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ailment entry not found"
        )

    db.delete(entry)
    db.commit()

    return None
