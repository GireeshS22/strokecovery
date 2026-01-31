from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str
    name: Optional[str] = None
    role: str = "patient"  # "patient" or "caregiver"


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (no password)."""
    id: UUID
    email: str
    name: Optional[str] = None
    role: str
    auth_provider: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user info."""
    name: Optional[str] = None


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
