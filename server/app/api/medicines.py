from datetime import datetime, date, timedelta
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.medicine import Medicine
from app.models.medicine_log import MedicineLog
from app.schemas.medicine import (
    MedicineCreate,
    MedicineUpdate,
    MedicineResponse,
    MedicineLogCreate,
    MedicineLogUpdate,
    MedicineLogResponse,
    MedicineTodayItem,
    MedicineTodayResponse,
)

router = APIRouter()

# Default reminder times
DEFAULT_TIMES = {
    "morning": "08:00",
    "afternoon": "14:00",
    "night": "20:00",
}


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


@router.post("/", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def create_medicine(
    medicine_data: MedicineCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Create a new medicine.

    - **name**: Medicine name (required)
    - **dosage**: Dosage like "500mg" or "2 tablets"
    - **morning/afternoon/night**: Schedule pattern (1-0-1 style)
    - **timing**: "before_food", "after_food", "with_food", "any_time"
    - **start_date**: When to start taking
    - **end_date**: When to stop (optional, null = ongoing)
    """
    user, profile = get_user_and_profile(token, db)

    # Validate at least one time slot is selected
    if not (medicine_data.morning or medicine_data.afternoon or medicine_data.night):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select at least one time slot (morning, afternoon, or night)"
        )

    new_medicine = Medicine(
        patient_id=profile.id,
        name=medicine_data.name,
        dosage=medicine_data.dosage,
        morning=medicine_data.morning,
        afternoon=medicine_data.afternoon,
        night=medicine_data.night,
        timing=medicine_data.timing,
        start_date=medicine_data.start_date,
        end_date=medicine_data.end_date,
        notes=medicine_data.notes,
    )

    db.add(new_medicine)
    db.commit()
    db.refresh(new_medicine)

    return MedicineResponse.model_validate(new_medicine)


@router.get("/", response_model=List[MedicineResponse])
def list_medicines(
    token: str,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all medicines for the current user.

    - **include_inactive**: Set to true to include ended/inactive medicines
    """
    user, profile = get_user_and_profile(token, db)

    query = db.query(Medicine).filter(Medicine.patient_id == profile.id)

    if not include_inactive:
        today = date.today()
        query = query.filter(
            Medicine.is_active == True,
            (Medicine.end_date == None) | (Medicine.end_date >= today)
        )

    medicines = query.order_by(Medicine.created_at.desc()).all()

    return [MedicineResponse.model_validate(m) for m in medicines]


@router.get("/today", response_model=MedicineTodayResponse)
def get_today_schedule(token: str, db: Session = Depends(get_db)):
    """
    Get today's medicine schedule with status.

    Returns medicines grouped by morning/afternoon/night with their status.
    """
    user, profile = get_user_and_profile(token, db)

    today = date.today()
    now = datetime.now()

    # Get active medicines for today
    medicines = db.query(Medicine).filter(
        Medicine.patient_id == profile.id,
        Medicine.is_active == True,
        Medicine.start_date <= today,
        (Medicine.end_date == None) | (Medicine.end_date >= today)
    ).all()

    morning_items = []
    afternoon_items = []
    night_items = []

    total_pending = 0
    total_taken = 0
    total_missed = 0

    for medicine in medicines:
        for time_of_day in ["morning", "afternoon", "night"]:
            # Check if this medicine is scheduled for this time
            if not getattr(medicine, time_of_day):
                continue

            # Calculate scheduled time for today
            time_str = DEFAULT_TIMES[time_of_day]
            hour, minute = map(int, time_str.split(":"))
            scheduled_time = datetime.combine(today, datetime.min.time().replace(hour=hour, minute=minute))

            # Check if log exists for this schedule
            log = db.query(MedicineLog).filter(
                MedicineLog.medicine_id == medicine.id,
                MedicineLog.time_of_day == time_of_day,
                MedicineLog.scheduled_time >= datetime.combine(today, datetime.min.time()),
                MedicineLog.scheduled_time < datetime.combine(today + timedelta(days=1), datetime.min.time())
            ).first()

            # Determine status
            if log:
                status = log.status
                taken_at = log.taken_at
                log_id = log.id
            else:
                # No log yet - check if time has passed
                if scheduled_time < now - timedelta(hours=2):
                    status = "missed"
                else:
                    status = "pending"
                taken_at = None
                log_id = None

            item = MedicineTodayItem(
                log_id=log_id,
                medicine_id=medicine.id,
                medicine_name=medicine.name,
                dosage=medicine.dosage,
                time_of_day=time_of_day,
                timing=medicine.timing,
                scheduled_time=scheduled_time,
                status=status,
                taken_at=taken_at,
            )

            if time_of_day == "morning":
                morning_items.append(item)
            elif time_of_day == "afternoon":
                afternoon_items.append(item)
            else:
                night_items.append(item)

            # Count totals
            if status == "pending":
                total_pending += 1
            elif status == "taken":
                total_taken += 1
            elif status == "missed":
                total_missed += 1

    return MedicineTodayResponse(
        date=today,
        morning=morning_items,
        afternoon=afternoon_items,
        night=night_items,
        total_pending=total_pending,
        total_taken=total_taken,
        total_missed=total_missed,
    )


@router.get("/{medicine_id}", response_model=MedicineResponse)
def get_medicine(medicine_id: UUID, token: str, db: Session = Depends(get_db)):
    """Get a specific medicine by ID."""
    user, profile = get_user_and_profile(token, db)

    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.patient_id == profile.id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )

    return MedicineResponse.model_validate(medicine)


@router.put("/{medicine_id}", response_model=MedicineResponse)
def update_medicine(
    medicine_id: UUID,
    medicine_data: MedicineUpdate,
    token: str,
    db: Session = Depends(get_db)
):
    """Update a medicine."""
    user, profile = get_user_and_profile(token, db)

    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.patient_id == profile.id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )

    # Update fields if provided
    if medicine_data.name is not None:
        medicine.name = medicine_data.name
    if medicine_data.dosage is not None:
        medicine.dosage = medicine_data.dosage
    if medicine_data.morning is not None:
        medicine.morning = medicine_data.morning
    if medicine_data.afternoon is not None:
        medicine.afternoon = medicine_data.afternoon
    if medicine_data.night is not None:
        medicine.night = medicine_data.night
    if medicine_data.timing is not None:
        medicine.timing = medicine_data.timing
    if medicine_data.start_date is not None:
        medicine.start_date = medicine_data.start_date
    if medicine_data.end_date is not None:
        medicine.end_date = medicine_data.end_date
    if medicine_data.notes is not None:
        medicine.notes = medicine_data.notes
    if medicine_data.is_active is not None:
        medicine.is_active = medicine_data.is_active

    db.commit()
    db.refresh(medicine)

    return MedicineResponse.model_validate(medicine)


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medicine(medicine_id: UUID, token: str, db: Session = Depends(get_db)):
    """Delete a medicine."""
    user, profile = get_user_and_profile(token, db)

    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.patient_id == profile.id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )

    db.delete(medicine)
    db.commit()

    return None


@router.post("/{medicine_id}/log", response_model=MedicineLogResponse, status_code=status.HTTP_201_CREATED)
def log_medicine(
    medicine_id: UUID,
    log_data: MedicineLogCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Log a medicine intake (taken, missed, or skipped).

    - **scheduled_time**: The scheduled time for this dose
    - **time_of_day**: "morning", "afternoon", or "night"
    - **status**: "taken", "missed", or "skipped"
    """
    user, profile = get_user_and_profile(token, db)

    # Verify medicine belongs to user
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.patient_id == profile.id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )

    # Check if log already exists for this time
    existing_log = db.query(MedicineLog).filter(
        MedicineLog.medicine_id == medicine_id,
        MedicineLog.time_of_day == log_data.time_of_day,
        MedicineLog.scheduled_time == log_data.scheduled_time
    ).first()

    if existing_log:
        # Update existing log
        existing_log.status = log_data.status
        if log_data.status == "taken":
            existing_log.taken_at = datetime.now()
        existing_log.notes = log_data.notes
        db.commit()
        db.refresh(existing_log)
        return MedicineLogResponse.model_validate(existing_log)

    # Create new log
    new_log = MedicineLog(
        medicine_id=medicine_id,
        scheduled_time=log_data.scheduled_time,
        time_of_day=log_data.time_of_day,
        status=log_data.status,
        taken_at=datetime.now() if log_data.status == "taken" else None,
        notes=log_data.notes,
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return MedicineLogResponse.model_validate(new_log)


@router.get("/{medicine_id}/logs", response_model=List[MedicineLogResponse])
def get_medicine_logs(
    medicine_id: UUID,
    token: str,
    limit: int = 30,
    db: Session = Depends(get_db)
):
    """Get log history for a specific medicine."""
    user, profile = get_user_and_profile(token, db)

    # Verify medicine belongs to user
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.patient_id == profile.id
    ).first()

    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )

    logs = db.query(MedicineLog).filter(
        MedicineLog.medicine_id == medicine_id
    ).order_by(MedicineLog.scheduled_time.desc()).limit(limit).all()

    return [MedicineLogResponse.model_validate(log) for log in logs]
