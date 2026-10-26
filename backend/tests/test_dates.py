from datetime import date

from app.dates import days_until, next_occurrence


def test_recurring_date_already_passed_this_year_rolls_to_next_year():
    today = date(2026, 10, 25)
    result = next_occurrence("2020-05-01", recurring=True, today=today)
    assert result == date(2027, 5, 1)


def test_recurring_date_still_upcoming_this_year_stays_this_year():
    today = date(2026, 10, 25)
    result = next_occurrence("2020-11-12", recurring=True, today=today)
    assert result == date(2026, 11, 12)


def test_recurring_date_today_counts_as_today():
    today = date(2026, 10, 25)
    result = next_occurrence("2020-10-25", recurring=True, today=today)
    assert result == today
    assert days_until(result, today) == 0


def test_recurring_leap_day_on_non_leap_year_rolls_to_march_first():
    today = date(2027, 1, 1)  # 2027 is not a leap year
    result = next_occurrence("2020-02-29", recurring=True, today=today)
    assert result == date(2027, 3, 1)


def test_non_recurring_date_returned_as_is_future_or_past():
    today = date(2026, 10, 25)
    future = next_occurrence("2026-12-25", recurring=False, today=today)
    past = next_occurrence("2020-01-01", recurring=False, today=today)
    assert future == date(2026, 12, 25)
    assert past == date(2020, 1, 1)


def test_days_until():
    assert days_until(date(2026, 11, 12), date(2026, 10, 25)) == 18
