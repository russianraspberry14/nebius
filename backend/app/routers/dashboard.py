from datetime import date as Date

from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.auth import require_user
from app.dashboard import get_upcoming_dates
from app.models import QuickCaptureRequest, QuickCaptureResult, UpcomingDate
from app.nemotron import extract_facts

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/upcoming-dates", response_model=list[UpcomingDate])
def upcoming_dates(user_id: int = Depends(require_user)):
    return get_upcoming_dates(user_id)


@router.post("/capture", response_model=QuickCaptureResult, status_code=201)
def quick_capture(data: QuickCaptureRequest, user_id: int = Depends(require_user)):
    """One input box for the whole dashboard: say or type something like
    "Maya graduated on 8th November" and it's routed to the right person as
    a note, with Nano proposing facts and/or a key date from it - same
    pipeline as the per-person capture, just without a person page open.
    """
    if data.person_id is not None:
        person = crud.get_person(data.person_id, user_id)
        if person is None:
            raise HTTPException(status_code=404, detail="Person not found")
    else:
        matches = crud.match_people_by_text(user_id, data.text)
        if len(matches) != 1:
            raise HTTPException(
                status_code=422,
                detail="Couldn't tell who that's about - mention their name, or pick them below.",
            )
        person = matches[0]

    note = crud.create_note(person.id, data.text)
    try:
        extraction = extract_facts(data.text, today_iso=Date.today().isoformat())
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return QuickCaptureResult(
        person_id=person.id,
        person_name=person.name,
        note=note,
        proposed_facts=extraction.facts,
        proposed_key_date=extraction.key_date,
    )
