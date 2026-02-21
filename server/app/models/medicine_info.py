import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class MedicineInfo(Base):
    __tablename__ = "medicine_info"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_name = Column(String(255), nullable=False, unique=True, index=True)
    combination = Column(Text, nullable=True)
    drug_class = Column(String(255), nullable=True)
    used_for = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
