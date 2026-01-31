from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.schemas.patient_profile import PatientProfileCreate, PatientProfileResponse

router = APIRouter()


def get_user_from_token(token: str, db: Session) -> User:
    """Helper to get user from token."""
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

    return user


@router.get("/", response_model=PatientProfileResponse)
def get_profile(token: str, db: Session = Depends(get_db)):
    """
    Get current user's profile.

    Pass token as query parameter: /api/profile?token=xxx
    """
    user = get_user_from_token(token, db)

    profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Complete onboarding first."
        )

    return PatientProfileResponse.model_validate(profile)


@router.get("/check")
def check_profile(token: str, db: Session = Depends(get_db)):
    """
    Check if user has completed onboarding.

    Returns: { "has_profile": true/false, "onboarding_completed": true/false }
    """
    user = get_user_from_token(token, db)

    profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()

    return {
        "has_profile": profile is not None,
        "onboarding_completed": profile.onboarding_completed if profile else False
    }


@router.put("/", response_model=PatientProfileResponse)
def update_profile(
    profile_data: PatientProfileCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Update user's profile.

    - **stroke_date**: When the stroke occurred
    - **stroke_type**: "ischemic", "hemorrhagic", or "tbi"
    - **affected_side**: "left", "right", or "both"
    - **current_therapies**: List like ["PT", "OT", "Speech"]
    """
    user = get_user_from_token(token, db)

    profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Complete onboarding first."
        )

    # Update fields if provided
    if profile_data.stroke_date is not None:
        profile.stroke_date = profile_data.stroke_date
    if profile_data.stroke_type is not None:
        profile.stroke_type = profile_data.stroke_type
    if profile_data.affected_side is not None:
        profile.affected_side = profile_data.affected_side
    if profile_data.current_therapies is not None:
        profile.current_therapies = profile_data.current_therapies

    db.commit()
    db.refresh(profile)

    return PatientProfileResponse.model_validate(profile)


@router.post("/onboarding", response_model=PatientProfileResponse, status_code=status.HTTP_201_CREATED)
def complete_onboarding(
    profile_data: PatientProfileCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Complete user onboarding with profile data.

    - **stroke_date**: When the stroke occurred
    - **stroke_type**: "ischemic", "hemorrhagic", or "tbi"
    - **affected_side**: "left", "right", or "both"
    - **current_therapies**: List like ["PT", "OT", "Speech"]
    """
    user = get_user_from_token(token, db)

    # Check if profile already exists
    existing_profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()

    if existing_profile:
        # Update existing profile
        existing_profile.stroke_date = profile_data.stroke_date
        existing_profile.stroke_type = profile_data.stroke_type
        existing_profile.affected_side = profile_data.affected_side
        existing_profile.current_therapies = profile_data.current_therapies
        existing_profile.onboarding_completed = True

        db.commit()
        db.refresh(existing_profile)

        return PatientProfileResponse.model_validate(existing_profile)
    else:
        # Create new profile
        new_profile = PatientProfile(
            user_id=user.id,
            stroke_date=profile_data.stroke_date,
            stroke_type=profile_data.stroke_type,
            affected_side=profile_data.affected_side,
            current_therapies=profile_data.current_therapies,
            onboarding_completed=True
        )

        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)

        return PatientProfileResponse.model_validate(new_profile)
