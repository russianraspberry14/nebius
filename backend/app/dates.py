"""Pure date math for the upcoming-dates dashboard (spec: P0, no model call)."""

from datetime import date as Date
from datetime import datetime


def next_occurrence(date_str: str, recurring: bool, today: Date) -> Date:
    """The next time this date happens, relative to `today`.

    Non-recurring dates occur exactly once, on the stored date. Recurring
    dates roll forward to next year once this year's occurrence has passed.
    """
    d = datetime.strptime(date_str, "%Y-%m-%d").date()
    if not recurring:
        return d
    try:
        this_year = d.replace(year=today.year)
    except ValueError:
        # Feb 29 on a non-leap year.
        this_year = d.replace(year=today.year, month=3, day=1)
    if this_year < today:
        try:
            return this_year.replace(year=today.year + 1)
        except ValueError:
            return this_year.replace(year=today.year + 1, month=3, day=1)
    return this_year


def days_until(target: Date, today: Date) -> int:
    return (target - today).days
