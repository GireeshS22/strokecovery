from fastapi import APIRouter
from .auth import router as auth_router
from .profile import router as profile_router
from .medicines import router as medicines_router
from .therapy import router as therapy_router
from .mood import router as mood_router
from .ailment import router as ailment_router
from .calendar import router as calendar_router
from .games import router as games_router
from .stroke_bites import router as stroke_bites_router
from .medicine_info import router as medicine_info_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profile_router, prefix="/profile", tags=["Profile"])
api_router.include_router(medicines_router, prefix="/medicines", tags=["Medicines"])
api_router.include_router(medicine_info_router, prefix="/medicine-info", tags=["Medicine Info"])
api_router.include_router(therapy_router, prefix="/therapy", tags=["Therapy"])
api_router.include_router(mood_router, prefix="/mood", tags=["Mood"])
api_router.include_router(ailment_router, prefix="/ailments", tags=["Ailments"])
api_router.include_router(calendar_router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(games_router, prefix="/games", tags=["Games"])
api_router.include_router(stroke_bites_router, prefix="/stroke-bites", tags=["Stroke Bites"])
