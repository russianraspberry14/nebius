from datetime import date as Date

from app import crud
from app.dates import days_until, next_occurrence
from app.models import UpcomingDate


def get_upcoming_dates(today: Date | None = None) -> list[UpcomingDate]:
    today = today or Date.today()
    upcoming = []
    for row in crud.list_all_key_dates_with_person():
        recurring = bool(row["recurring"])
        occurrence = next_occurrence(row["date"], recurring, today)
        delta = days_until(occurrence, today)
        if delta < 0:
            continue  # one-time date already passed
        upcoming.append(
            UpcomingDate(
                person_id=row["person_id"],
                person_name=row["person_name"],
                key_date_id=row["id"],
                label=row["label"],
                date=occurrence.isoformat(),
                days_until=delta,
                recurring=recurring,
            )
        )
    upcoming.sort(key=lambda u: u.days_until)
    return upcoming
