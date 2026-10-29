"""Daily background job: pre-drafts a plan for every key date in the next 21
days (flow D). Runs as a Nebius Serverless Job in production (cron, daily);
locally it's scripts/predraft_plans.py.

Same pipeline as POST /plans/generate, just automatic and saved straight to
history with status="draft" instead of waiting for the user to pick an
option. The dashboard surfaces this as draft_plan_id on the matching
upcoming date (see app/dashboard.py).
"""

from dataclasses import dataclass
from datetime import date as Date

from app import crud
from app.dashboard import get_upcoming_dates
from app.planner import generate_plan_options
from app.tool_loop import run_candidate_search

PREDRAFT_WINDOW_DAYS = 21


@dataclass
class PredraftOutcome:
    person_id: int
    person_name: str
    label: str
    date: str
    status: str  # "drafted" | "skipped" | "error"
    detail: str = ""


def predraft_plans(user_id: int, today: Date | None = None) -> list[PredraftOutcome]:
    today = today or Date.today()
    outcomes: list[PredraftOutcome] = []

    for upcoming in get_upcoming_dates(user_id, today=today):
        if upcoming.days_until > PREDRAFT_WINDOW_DAYS:
            continue
        if upcoming.draft_plan_id is not None:
            outcomes.append(
                PredraftOutcome(
                    upcoming.person_id, upcoming.person_name, upcoming.label, upcoming.date,
                    "skipped", "already has a plan for this date",
                )
            )
            continue

        person = crud.get_person(upcoming.person_id, user_id)
        if not person.home_city:
            outcomes.append(
                PredraftOutcome(
                    upcoming.person_id, upcoming.person_name, upcoming.label, upcoming.date,
                    "skipped", "no home city on file to search an area",
                )
            )
            continue

        try:
            people_facts, past_stop_names = crud.gather_people_facts_and_history([person.id], user_id)
            candidates = run_candidate_search(
                occasion=upcoming.label, date=upcoming.date, area=person.home_city,
            )
            result = generate_plan_options(
                people_facts=people_facts,
                candidates=candidates,
                past_stop_names=past_stop_names,
                occasion=upcoming.label,
                date=upcoming.date,
                area=person.home_city,
            )
        except ValueError as exc:
            outcomes.append(
                PredraftOutcome(
                    upcoming.person_id, upcoming.person_name, upcoming.label, upcoming.date,
                    "error", str(exc),
                )
            )
            continue

        if not result.options:
            outcomes.append(
                PredraftOutcome(
                    upcoming.person_id, upcoming.person_name, upcoming.label, upcoming.date,
                    "skipped", "no plan options came back",
                )
            )
            continue

        best = result.options[0]
        crud.create_plan(
            person_ids=[person.id],
            occasion=upcoming.label,
            date=upcoming.date,
            area=person.home_city,
            budget=None,
            stops=best.stops,
            status="draft",
        )
        outcomes.append(
            PredraftOutcome(
                upcoming.person_id, upcoming.person_name, upcoming.label, upcoming.date, "drafted"
            )
        )

    return outcomes
