from datetime import date
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.stroke_bite import StrokeBite, StrokeBiteAnswer
from app.schemas.stroke_bite import (
    StrokeBiteResponse,
    BiteCard,
    StrokeBiteAnswerCreate,
    StrokeBiteAnswerResponse
)
from app.services.bite_generator import generate_bites

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


@router.get("/today", response_model=StrokeBiteResponse)
def get_todays_bites(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get today's stroke bites if already generated (cached).
    Returns 404 if not generated yet.
    """
    user, profile = get_user_and_profile(token, db)

    today = date.today()
    bite = db.query(StrokeBite).filter(
        StrokeBite.patient_id == profile.id,
        StrokeBite.generated_date == today
    ).first()

    if not bite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No bites generated for today yet"
        )

    # Parse cards from JSONB
    cards_data = bite.cards_json.get('cards', [])
    cards = [BiteCard(**card) for card in cards_data]

    return StrokeBiteResponse(
        id=bite.id,
        generated_date=bite.generated_date,
        cards=cards,
        start_card_id=bite.start_card_id,
        total_cards=len(cards),
        card_sequence_length=bite.card_sequence_length
    )


@router.post("/generate", response_model=StrokeBiteResponse, status_code=status.HTTP_201_CREATED)
def generate_todays_bites(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Generate new stroke bites for today using LLM.
    Caches the result in database.
    """
    user, profile = get_user_and_profile(token, db)

    # Check if already generated today (race condition handling)
    today = date.today()
    existing = db.query(StrokeBite).filter(
        StrokeBite.patient_id == profile.id,
        StrokeBite.generated_date == today
    ).first()

    if existing:
        # Already generated, return cached
        cards_data = existing.cards_json.get('cards', [])
        cards = [BiteCard(**card) for card in cards_data]

        return StrokeBiteResponse(
            id=existing.id,
            generated_date=existing.generated_date,
            cards=cards,
            start_card_id=existing.start_card_id,
            total_cards=len(cards),
            card_sequence_length=existing.card_sequence_length
        )

    # Generate new bites
    try:
        result = generate_bites(profile, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate bites: {str(e)}"
        )

    # Store in database
    new_bite = StrokeBite(
        patient_id=profile.id,
        generated_date=today,
        cards_json=result,
        start_card_id=result['start_card_id'],
        card_sequence_length=result['card_sequence_length']
    )

    try:
        db.add(new_bite)
        db.commit()
        db.refresh(new_bite)
    except IntegrityError:
        # Race condition: another request already created it
        db.rollback()
        existing = db.query(StrokeBite).filter(
            StrokeBite.patient_id == profile.id,
            StrokeBite.generated_date == today
        ).first()

        if existing:
            cards_data = existing.cards_json.get('cards', [])
            cards = [BiteCard(**card) for card in cards_data]

            return StrokeBiteResponse(
                id=existing.id,
                generated_date=existing.generated_date,
                cards=cards,
                start_card_id=existing.start_card_id,
                total_cards=len(cards),
                card_sequence_length=existing.card_sequence_length
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store generated bites"
            )

    # Return response
    cards = [BiteCard(**card) for card in result['cards']]

    return StrokeBiteResponse(
        id=new_bite.id,
        generated_date=new_bite.generated_date,
        cards=cards,
        start_card_id=new_bite.start_card_id,
        total_cards=len(cards),
        card_sequence_length=new_bite.card_sequence_length
    )


@router.post("/answers", response_model=StrokeBiteAnswerResponse, status_code=status.HTTP_201_CREATED)
def save_bite_answers(
    answer_data: StrokeBiteAnswerCreate,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Save Q&A answers from a bite session for future personalization.
    """
    user, profile = get_user_and_profile(token, db)

    # Verify bite exists and belongs to this user
    bite = db.query(StrokeBite).filter(
        StrokeBite.id == answer_data.bite_id,
        StrokeBite.patient_id == profile.id
    ).first()

    if not bite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bite session not found or doesn't belong to you"
        )

    # Save each answer
    saved_count = 0
    first_answer_id = None

    for answer_item in answer_data.answers:
        new_answer = StrokeBiteAnswer(
            bite_id=answer_data.bite_id,
            patient_id=profile.id,
            card_id=answer_item.card_id,
            selected_key=answer_item.selected_key,
            question_text=answer_item.question_text,
            selected_label=answer_item.selected_label
        )

        db.add(new_answer)
        saved_count += 1

        if not first_answer_id:
            db.flush()  # Get ID without committing
            first_answer_id = new_answer.id

    db.commit()

    return StrokeBiteAnswerResponse(
        id=first_answer_id or answer_data.bite_id,
        bite_id=answer_data.bite_id,
        saved=True,
        answers_count=saved_count
    )
