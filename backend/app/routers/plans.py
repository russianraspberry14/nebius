from fastapi import APIRouter, HTTPException

from app import crud
from app.models import PlanGenerateRequest, PlanGenerateResult, PlanOut, PlanSaveRequest
from app.planner import generate_plan_options
from app.tool_loop import run_candidate_search

router = APIRouter(tags=["plans"])


@router.post("/plans/generate", response_model=PlanGenerateResult)
def generate_plan(data: PlanGenerateRequest):
    """Flow C, steps 2-3: Super searches candidates, Ultra drafts cited options.

    Nothing is saved here - the user picks/tweaks an option client-side, then
    POSTs it to /plans to log it to history.
    """
    people_facts = {}
    for person_id in data.person_ids:
        person = crud.get_person(person_id)
        if person is None:
            raise HTTPException(status_code=404, detail=f"Person {person_id} not found")
        people_facts[person.name] = crud.list_facts(person_id)

    past_stop_names: list[str] = []
    seen = set()
    for person_id in data.person_ids:
        for plan in crud.list_plans(person_id):
            for stop in plan.stops:
                if stop.name not in seen:
                    seen.add(stop.name)
                    past_stop_names.append(stop.name)

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
def save_plan(data: PlanSaveRequest):
    for person_id in data.person_ids:
        if crud.get_person(person_id) is None:
            raise HTTPException(status_code=404, detail=f"Person {person_id} not found")
    return crud.create_plan(
        person_ids=data.person_ids,
        occasion=data.occasion,
        date=data.date,
        area=data.area,
        budget=data.budget,
        stops=data.stops,
    )


@router.get("/people/{person_id}/plans", response_model=list[PlanOut])
def list_person_plans(person_id: int):
    if crud.get_person(person_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.list_plans(person_id)
