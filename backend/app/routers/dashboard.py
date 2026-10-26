from fastapi import APIRouter

from app.dashboard import get_upcoming_dates
from app.models import UpcomingDate

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/upcoming-dates", response_model=list[UpcomingDate])
def upcoming_dates():
    return get_upcoming_dates()
