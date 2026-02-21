from typing import Optional
from pydantic import BaseModel


class MedicineInfoResponse(BaseModel):
    medicine_name: str
    combination: Optional[str] = None
    drug_class: Optional[str] = None
    used_for: Optional[str] = None

    class Config:
        from_attributes = True


class MedicineInfoSearchResult(BaseModel):
    medicine_name: str
    combination: Optional[str] = None
    drug_class: Optional[str] = None
    used_for: Optional[str] = None

    class Config:
        from_attributes = True
