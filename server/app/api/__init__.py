from fastapi import APIRouter
from .auth import router as auth_router
from .profile import router as profile_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profile_router, prefix="/profile", tags=["Profile"])
