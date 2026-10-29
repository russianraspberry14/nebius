from fastapi import APIRouter, Depends

from app.auth import require_user
from app.dashboard import get_upcoming_dates
from app.models import UpcomingDate

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/upcoming-dates", response_model=list[UpcomingDate])
def upcoming_dates(user_id: int = Depends(require_user)):
    return get_upcoming_dates(user_id)
