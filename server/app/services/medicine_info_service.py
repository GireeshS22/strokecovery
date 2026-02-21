"""
Medicine Info Service

Fetches medicine metadata (combination, drug class, used_for) using an LLM
and caches results globally in the medicine_info table.
"""

import json
import re
from sqlalchemy import func
from sqlalchemy.orm import Session
from together import Together

from app.core.config import get_settings
from app.models.medicine_info import MedicineInfo

settings = get_settings()


def _call_llm(medicine_name: str) -> dict:
    """Call Together.ai LLM to get medicine metadata. Returns parsed JSON dict."""
    client = Together(api_key=settings.together_api_key)

    system_prompt = (
        "You are a medical information assistant. "
        "Given a medicine name, return ONLY a JSON object with exactly three fields:\n"
        '  "combination": the actual drug compound(s) and strength (e.g. "Paracetamol 650mg"). '
        "If it is already a compound name, state it clearly.\n"
        '  "drug_class": the pharmacological class (e.g. "Analgesic / Antipyretic").\n'
        '  "used_for": primary clinical uses in plain language, very brief (e.g. "Pain relief, fever reduction").\n'
        'If you are unsure about any field, use "Unknown".\n'
        "Do NOT include any explanation outside the JSON."
    )

    user_prompt = f"Medicine: {medicine_name}"

    response = client.chat.completions.create(
        model=settings.together_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=200,
    )

    content = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

    return json.loads(content)


def get_or_create_medicine_info(medicine_name: str, db: Session) -> MedicineInfo:
    """
    Return cached MedicineInfo for this medicine name, or call the LLM,
    persist the result, and return it. Lookup is case-insensitive.
    """
    normalized = medicine_name.strip()

    # Case-insensitive cache lookup
    cached = (
        db.query(MedicineInfo)
        .filter(func.lower(MedicineInfo.medicine_name) == normalized.lower())
        .first()
    )
    if cached:
        return cached

    # LLM call
    try:
        data = _call_llm(normalized)
    except Exception as e:
        print(f"[MedicineInfo] LLM call failed for '{normalized}': {e}")
        # Store a minimal row so we don't hammer the LLM on retries
        data = {"combination": None, "drug_class": None, "used_for": None}

    record = MedicineInfo(
        medicine_name=normalized,
        combination=data.get("combination"),
        drug_class=data.get("drug_class"),
        used_for=data.get("used_for"),
    )
    db.add(record)
    try:
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        # Another request may have inserted concurrently — fetch it
        cached = (
            db.query(MedicineInfo)
            .filter(func.lower(MedicineInfo.medicine_name) == normalized.lower())
            .first()
        )
        if cached:
            return cached
        raise

    return record


def search_medicine_names(query: str, db: Session, limit: int = 10):
    """Return MedicineInfo rows whose name contains the query string (case-insensitive).
    Excludes entries with an unknown or missing drug class."""
    return (
        db.query(MedicineInfo)
        .filter(MedicineInfo.medicine_name.ilike(f"%{query}%"))
        .filter(MedicineInfo.drug_class.isnot(None))
        .filter(func.lower(MedicineInfo.drug_class) != "unknown")
        .limit(limit)
        .all()
    )
