from datetime import date as Date

from app import crud
from app.dates import days_until, next_occurrence
from app.models import UpcomingDate


def get_upcoming_dates(today: Date | None = None) -> list[UpcomingDate]:
    today = today or Date.today()
    upcoming = []
    plans_by_person: dict[int, list] = {}
    for row in crud.list_all_key_dates_with_person():
        recurring = bool(row["recurring"])
        occurrence = next_occurrence(row["date"], recurring, today)
        delta = days_until(occurrence, today)
        if delta < 0:
            continue  # one-time date already passed

        person_id = row["person_id"]
        occurrence_iso = occurrence.isoformat()
        if person_id not in plans_by_person:
            plans_by_person[person_id] = crud.list_plans(person_id)
        draft_plan_id = next(
            (
                p.id
                for p in plans_by_person[person_id]
                if p.date == occurrence_iso and p.occasion.lower() == row["label"].lower()
            ),
            None,
        )

        upcoming.append(
            UpcomingDate(
                person_id=person_id,
                person_name=row["person_name"],
                key_date_id=row["id"],
                label=row["label"],
                date=occurrence_iso,
                days_until=delta,
                recurring=recurring,
                draft_plan_id=draft_plan_id,
            )
        )
    upcoming.sort(key=lambda u: u.days_until)
    return upcoming
