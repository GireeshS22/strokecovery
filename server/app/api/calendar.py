from datetime import date, datetime
from typing import Optional, List, Dict, Any
from calendar import monthrange
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.therapy_session import TherapySession
from app.models.mood_entry import MoodEntry
from app.models.ailment_entry import AilmentEntry
from app.models.medicine_log import MedicineLog
from app.models.medicine import Medicine

router = APIRouter()


# Response schemas for calendar
class CalendarMedicineItem(BaseModel):
    id: str
    name: str
    dosage: Optional[str]
    status: str
    time_of_day: str
    taken_at: Optional[datetime]


class CalendarTherapyItem(BaseModel):
    id: str
    type: str
    duration: int
    feeling: int
    feeling_emoji: str
    notes: Optional[str]


class CalendarMoodItem(BaseModel):
    id: str
    level: int
    emoji: str
    label: str
    notes: Optional[str]


class CalendarAilmentItem(BaseModel):
    id: str
    symptom: str
    body_location: Optional[str]
    severity: int
    severity_label: str
    notes: Optional[str]


class CalendarDayEntries(BaseModel):
    medicines: List[CalendarMedicineItem]
    therapy: List[CalendarTherapyItem]
    mood: Optional[CalendarMoodItem]
    ailments: List[CalendarAilmentItem]


class CalendarSummary(BaseModel):
    medicine_count: int
    therapy_count: int
    mood_count: int
    ailment_count: int
    days_with_entries: int


class CalendarResponse(BaseModel):
    entries: Dict[str, CalendarDayEntries]
    summary: CalendarSummary


class DayEntriesResponse(BaseModel):
    date: date
    entries: CalendarDayEntries


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


def get_feeling_emoji(rating: int) -> str:
    """Return emoji for feeling rating."""
    emojis = {1: "😫", 2: "😔", 3: "😐", 4: "🙂", 5: "😊"}
    return emojis.get(rating, "😐")


def get_mood_emoji(level: int) -> str:
    """Return emoji for mood level."""
    emojis = {1: "😢", 2: "😔", 3: "😐", 4: "🙂", 5: "😊"}
    return emojis.get(level, "😐")


def get_mood_label(level: int) -> str:
    """Return label for mood level."""
    labels = {1: "Very Bad", 2: "Bad", 3: "Okay", 4: "Good", 5: "Great"}
    return labels.get(level, "Okay")


def get_severity_label(severity: int) -> str:
    """Return label for severity level."""
    if severity <= 3:
        return "Mild"
    elif severity <= 6:
        return "Moderate"
    else:
        return "Severe"


@router.get("", response_model=CalendarResponse)
def get_calendar_range(
    token: str,
    start_date: date = Query(..., description="Start date for range"),
    end_date: date = Query(..., description="End date for range"),
    db: Session = Depends(get_db)
):
    """
    Get all calendar entries for a date range.

    Returns entries grouped by date with medicines, therapy sessions, mood, and ailments.
    """
    user, profile = get_user_and_profile(token, db)

    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be after start_date"
        )

    # Initialize entries dict
    entries: Dict[str, CalendarDayEntries] = {}
    days_with_entries = set()

    # Get therapy sessions
    therapy_sessions = db.query(TherapySession).filter(
        TherapySession.patient_id == profile.id,
        TherapySession.session_date >= start_date,
        TherapySession.session_date <= end_date
    ).all()

    for session in therapy_sessions:
        date_key = session.session_date.isoformat()
        if date_key not in entries:
            entries[date_key] = CalendarDayEntries(
                medicines=[], therapy=[], mood=None, ailments=[]
            )
        entries[date_key].therapy.append(CalendarTherapyItem(
            id=str(session.id),
            type=session.therapy_type,
            duration=session.duration_minutes,
            feeling=session.feeling_rating,
            feeling_emoji=get_feeling_emoji(session.feeling_rating),
            notes=session.notes
        ))
        days_with_entries.add(date_key)

    # Get mood entries
    mood_entries = db.query(MoodEntry).filter(
        MoodEntry.patient_id == profile.id,
        MoodEntry.entry_date >= start_date,
        MoodEntry.entry_date <= end_date
    ).all()

    for entry in mood_entries:
        date_key = entry.entry_date.isoformat()
        if date_key not in entries:
            entries[date_key] = CalendarDayEntries(
                medicines=[], therapy=[], mood=None, ailments=[]
            )
        entries[date_key].mood = CalendarMoodItem(
            id=str(entry.id),
            level=entry.mood_level,
            emoji=get_mood_emoji(entry.mood_level),
            label=get_mood_label(entry.mood_level),
            notes=entry.notes
        )
        days_with_entries.add(date_key)

    # Get ailment entries
    ailment_entries = db.query(AilmentEntry).filter(
        AilmentEntry.patient_id == profile.id,
        AilmentEntry.entry_date >= start_date,
        AilmentEntry.entry_date <= end_date
    ).all()

    for entry in ailment_entries:
        date_key = entry.entry_date.isoformat()
        if date_key not in entries:
            entries[date_key] = CalendarDayEntries(
                medicines=[], therapy=[], mood=None, ailments=[]
            )
        entries[date_key].ailments.append(CalendarAilmentItem(
            id=str(entry.id),
            symptom=entry.symptom,
            body_location=entry.body_location,
            severity=entry.severity,
            severity_label=get_severity_label(entry.severity),
            notes=entry.notes
        ))
        days_with_entries.add(date_key)

    # Get medicine logs
    # We need to join with medicine to get name and dosage
    # Filter by scheduled_time's date
    medicine_logs = db.query(MedicineLog, Medicine).join(
        Medicine, MedicineLog.medicine_id == Medicine.id
    ).filter(
        Medicine.patient_id == profile.id,
        func.date(MedicineLog.scheduled_time) >= start_date,
        func.date(MedicineLog.scheduled_time) <= end_date
    ).all()

    for log, medicine in medicine_logs:
        date_key = log.scheduled_time.date().isoformat()
        if date_key not in entries:
            entries[date_key] = CalendarDayEntries(
                medicines=[], therapy=[], mood=None, ailments=[]
            )
        entries[date_key].medicines.append(CalendarMedicineItem(
            id=str(log.id),
            name=medicine.name,
            dosage=medicine.dosage,
            status=log.status,
            time_of_day=log.time_of_day,
            taken_at=log.taken_at
        ))
        days_with_entries.add(date_key)

    # Calculate summary
    total_medicines = sum(len(e.medicines) for e in entries.values())
    total_therapy = sum(len(e.therapy) for e in entries.values())
    total_mood = sum(1 for e in entries.values() if e.mood is not None)
    total_ailments = sum(len(e.ailments) for e in entries.values())

    summary = CalendarSummary(
        medicine_count=total_medicines,
        therapy_count=total_therapy,
        mood_count=total_mood,
        ailment_count=total_ailments,
        days_with_entries=len(days_with_entries)
    )

    return CalendarResponse(entries=entries, summary=summary)


@router.get("/{target_date}", response_model=DayEntriesResponse)
def get_calendar_day(
    target_date: date,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get all entries for a specific day.

    Returns medicines, therapy sessions, mood, and ailments for the given date.
    """
    user, profile = get_user_and_profile(token, db)

    day_entries = CalendarDayEntries(
        medicines=[], therapy=[], mood=None, ailments=[]
    )

    # Get therapy sessions
    therapy_sessions = db.query(TherapySession).filter(
        TherapySession.patient_id == profile.id,
        TherapySession.session_date == target_date
    ).order_by(TherapySession.session_time).all()

    for session in therapy_sessions:
        day_entries.therapy.append(CalendarTherapyItem(
            id=str(session.id),
            type=session.therapy_type,
            duration=session.duration_minutes,
            feeling=session.feeling_rating,
            feeling_emoji=get_feeling_emoji(session.feeling_rating),
            notes=session.notes
        ))

    # Get mood entry (only one per day)
    mood_entry = db.query(MoodEntry).filter(
        MoodEntry.patient_id == profile.id,
        MoodEntry.entry_date == target_date
    ).first()

    if mood_entry:
        day_entries.mood = CalendarMoodItem(
            id=str(mood_entry.id),
            level=mood_entry.mood_level,
            emoji=get_mood_emoji(mood_entry.mood_level),
            label=get_mood_label(mood_entry.mood_level),
            notes=mood_entry.notes
        )

    # Get ailment entries
    ailment_entries = db.query(AilmentEntry).filter(
        AilmentEntry.patient_id == profile.id,
        AilmentEntry.entry_date == target_date
    ).order_by(AilmentEntry.created_at).all()

    for entry in ailment_entries:
        day_entries.ailments.append(CalendarAilmentItem(
            id=str(entry.id),
            symptom=entry.symptom,
            body_location=entry.body_location,
            severity=entry.severity,
            severity_label=get_severity_label(entry.severity),
            notes=entry.notes
        ))

    # Get medicine logs
    medicine_logs = db.query(MedicineLog, Medicine).join(
        Medicine, MedicineLog.medicine_id == Medicine.id
    ).filter(
        Medicine.patient_id == profile.id,
        func.date(MedicineLog.scheduled_time) == target_date
    ).order_by(MedicineLog.scheduled_time).all()

    for log, medicine in medicine_logs:
        day_entries.medicines.append(CalendarMedicineItem(
            id=str(log.id),
            name=medicine.name,
            dosage=medicine.dosage,
            status=log.status,
            time_of_day=log.time_of_day,
            taken_at=log.taken_at
        ))

    return DayEntriesResponse(date=target_date, entries=day_entries)
