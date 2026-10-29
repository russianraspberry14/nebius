from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_user
from app.models import CandidateSearchRequest, CandidateSearchResult
from app.tool_loop import run_candidate_search

router = APIRouter(prefix="/plan", tags=["planning"])


@router.post("/search", response_model=CandidateSearchResult)
def search_candidates(data: CandidateSearchRequest, user_id: int = Depends(require_user)):
    """Run Super's tool-calling loop to gather outing candidates for an area/date.

    This is the raw search step (flow C, step 2) - Day 4's Ultra step turns
    these candidates plus a person's facts into a cited plan.
    """
    try:
        return run_candidate_search(
            occasion=data.occasion,
            date=data.date,
            area=data.area,
            budget=data.budget,
            duration=data.duration,
            keywords=data.keywords or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
