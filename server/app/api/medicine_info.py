from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.medicine_info import MedicineInfoResponse, MedicineInfoSearchResult
from app.services.medicine_info_service import get_or_create_medicine_info, search_medicine_names

router = APIRouter()


@router.get("/lookup", response_model=MedicineInfoResponse)
def lookup_medicine_info(
    name: str = Query(..., min_length=1, description="Medicine name to look up"),
    db: Session = Depends(get_db),
):
    """
    Return medicine metadata (combination, drug class, used_for) for the given name.
    Served from cache if available; otherwise calls the LLM and caches the result.
    """
    if not name.strip():
        raise HTTPException(status_code=400, detail="Medicine name cannot be empty")

    record = get_or_create_medicine_info(name.strip(), db)
    return MedicineInfoResponse(
        medicine_name=record.medicine_name,
        combination=record.combination,
        drug_class=record.drug_class,
        used_for=record.used_for,
    )


@router.get("/search", response_model=List[MedicineInfoSearchResult])
def search_medicines(
    q: str = Query(..., min_length=1, description="Search query for medicine name autocomplete"),
    db: Session = Depends(get_db),
):
    """
    Return up to 10 cached medicine names matching the query string.
    Used for autocomplete in the add/edit medicine form.
    """
    results = search_medicine_names(q.strip(), db, limit=10)
    return [
        MedicineInfoSearchResult(
            medicine_name=r.medicine_name,
            combination=r.combination,
            drug_class=r.drug_class,
            used_for=r.used_for,
        )
        for r in results
    ]
