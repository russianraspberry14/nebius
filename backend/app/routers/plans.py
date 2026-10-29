from datetime import date as Date

from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.auth import require_user
from app.models import (
    PlanChatRequest,
    PlanChatResult,
    PlanChatSlots,
    PlanGenerateRequest,
    PlanGenerateResult,
    PlanOut,
    PlanSaveRequest,
    PlanStop,
    QuickCaptureAmbiguous,
    StopReviseRequest,
    UpcomingPlanOut,
)
from app.nemotron import parse_plan_slots
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
        print(f"[plans.generate] plan generation failed: {exc}")
        raise HTTPException(
            status_code=502, detail="Couldn't put a plan together just now - want to try again?"
        ) from exc


def _ask_for_missing(missing: list[str]) -> str:
    if "date" in missing and "area" in missing:
        return "When would you like to go (day, and a time if you have one in mind), and is there an area you'd like to stick to?"
    if "date" in missing:
        return "What day works - and roughly what time, if you have one in mind?"
    if "area" in missing:
        return "Any area you'd like to stick to?"
    return "Got it - one sec."


@router.post("/plans/chat", response_model=PlanChatResult)
def plan_chat(data: PlanChatRequest, user_id: int = Depends(require_user)):
    """Conversational plan creation: "plan a dinner date for me and Maya"
    resolves the person the same way quick-capture does, then Nano fills in
    occasion/date/area/budget/duration turn by turn - asking only for
    "date" and "area" if the message doesn't supply them - until there's
    enough to run the same Super-search + Ultra-draft pipeline as the
    person-page plan form.
    """
    if data.person_id is not None:
        person = crud.get_person(data.person_id, user_id)
        if person is None:
            raise HTTPException(status_code=404, detail="Person not found")
    else:
        matches = crud.match_people_by_text(user_id, data.text)
        if len(matches) != 1:
            message = (
                "Found more than one match for that name - which one?"
                if matches
                else "Didn't catch who that's for - who's this about?"
            )
            raise HTTPException(
                status_code=422,
                detail=QuickCaptureAmbiguous(message=message, candidates=matches).model_dump(),
            )
        person = matches[0]

    try:
        parsed = parse_plan_slots(data.text, known=data.slots, today_iso=Date.today().isoformat())
    except ValueError as exc:
        print(f"[plans.chat] slot parsing failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Couldn't quite parse that - try saying it a different way.",
        ) from exc

    merged = PlanChatSlots(
        occasion=parsed.occasion or data.slots.occasion,
        date=parsed.date or data.slots.date,
        area=parsed.area or data.slots.area,
        budget=parsed.budget or data.slots.budget,
        duration=parsed.duration or data.slots.duration,
    )

    missing: list[str] = []
    if not merged.date:
        missing.append("date")
    if not merged.area:
        missing.append("area")

    if missing:
        return PlanChatResult(
            person_id=person.id,
            person_name=person.name,
            slots=merged,
            missing=missing,
            reply=_ask_for_missing(missing),
            ready=False,
            options=[],
        )

    occasion = merged.occasion or "outing"
    people_facts, past_stop_names = _people_facts_and_history([person.id], user_id)
    try:
        candidates = run_candidate_search(
            occasion=occasion,
            date=merged.date,
            area=merged.area,
            budget=merged.budget,
            duration=merged.duration,
            keywords="",
        )
        result = generate_plan_options(
            people_facts=people_facts,
            candidates=candidates,
            past_stop_names=past_stop_names,
            occasion=occasion,
            date=merged.date,
            area=merged.area,
            budget=merged.budget,
            duration=merged.duration,
        )
    except ValueError as exc:
        print(f"[plans.chat] plan generation failed: {exc}")
        raise HTTPException(
            status_code=502, detail="Couldn't put a plan together just now - want to try again?"
        ) from exc

    return PlanChatResult(
        person_id=person.id,
        person_name=person.name,
        slots=merged,
        missing=[],
        reply=f"Here's what I've got for {person.name}:",
        ready=True,
        options=result.options,
    )


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
        print(f"[plans.revise_stop] revision failed: {exc}")
        raise HTTPException(
            status_code=502, detail="Couldn't find a swap for that one - try a different instruction?"
        ) from exc
