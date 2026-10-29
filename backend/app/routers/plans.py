from datetime import date as Date

from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.auth import require_user
from app.models import (
    PlanGenerateRequest,
    PlanGenerateResult,
    PlanOut,
    PlanSaveRequest,
    PlanStop,
    StopReviseRequest,
    UpcomingPlanOut,
)
from app.planner import generate_plan_options, revise_stop
from app.tool_loop import run_candidate_search

router = APIRouter(tags=["plans"])


def _people_facts_and_history(person_ids: list[int], user_id: int):
    try:
        return crud.gather_people_facts_and_history(person_ids, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/plans/generate", response_model=PlanGenerateResult)
def generate_plan(data: PlanGenerateRequest, user_id: int = Depends(require_user)):
    """Flow C, steps 2-3: Super searches candidates, Ultra drafts cited options.

    Nothing is saved here - the user picks/tweaks an option client-side, then
    POSTs it to /plans to log it to history.
    """
    people_facts, past_stop_names = _people_facts_and_history(data.person_ids, user_id)

    try:
        candidates = run_candidate_search(
            occasion=data.occasion,
            date=data.date,
            area=data.area,
            budget=data.budget,
            duration=data.duration,
            keywords=data.keywords or "",
        )
        return generate_plan_options(
            people_facts=people_facts,
            candidates=candidates,
            past_stop_names=past_stop_names,
            occasion=data.occasion,
            date=data.date,
            area=data.area,
            budget=data.budget,
            duration=data.duration,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/plans", response_model=PlanOut, status_code=201)
def save_plan(data: PlanSaveRequest, user_id: int = Depends(require_user)):
    for person_id in data.person_ids:
        if crud.get_person(person_id, user_id) is None:
            raise HTTPException(status_code=404, detail=f"Person {person_id} not found")
    return crud.create_plan(
        person_ids=data.person_ids,
        occasion=data.occasion,
        date=data.date,
        area=data.area,
        budget=data.budget,
        stops=data.stops,
    )


@router.get("/plans/upcoming", response_model=list[UpcomingPlanOut])
def list_upcoming_plans(user_id: int = Depends(require_user)):
    """Every draft/saved plan dated today or later, across all of this user's
    people - the dashboard's "Plans coming up" section."""
    plans = crud.list_upcoming_plans(user_id, Date.today().isoformat())
    results = []
    for p in plans:
        names = []
        for person_id in p.person_ids:
            person = crud.get_person(person_id, user_id)
            if person:
                names.append(person.name)
        results.append(
            UpcomingPlanOut(
                id=p.id,
                occasion=p.occasion,
                date=p.date,
                person_ids=p.person_ids,
                person_names=names,
                stops=p.stops,
                status=p.status,
            )
        )
    return results


@router.get("/people/{person_id}/plans", response_model=list[PlanOut])
def list_person_plans(person_id: int, user_id: int = Depends(require_user)):
    if crud.get_person(person_id, user_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.list_plans(person_id)


@router.post("/plans/revise-stop", response_model=PlanStop)
def revise_plan_stop(data: StopReviseRequest, user_id: int = Depends(require_user)):
    """Flow C, step 4: "swap dinner for something cheaper" - revise only one stop.

    Not tied to a saved plan: the frontend holds the current (possibly
    unsaved) stop list and sends it along with which index to revise.
    """
    if data.stop_index >= len(data.stops):
        raise HTTPException(status_code=400, detail="stop_index is out of range")

    people_facts, past_stop_names = _people_facts_and_history(data.person_ids, user_id)
    other_stops = [s for i, s in enumerate(data.stops) if i != data.stop_index]
    stop_to_revise = data.stops[data.stop_index]

    try:
        candidates = run_candidate_search(
            occasion=data.occasion,
            date=data.date,
            area=data.area,
            budget=data.budget,
            keywords=data.instruction,
        )
        return revise_stop(
            people_facts=people_facts,
            candidates=candidates,
            other_stops=other_stops,
            past_stop_names=past_stop_names,
            stop_to_revise=stop_to_revise,
            instruction=data.instruction,
            occasion=data.occasion,
            date=data.date,
            area=data.area,
            budget=data.budget,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
