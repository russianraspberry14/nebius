from datetime import date

from app import crud
from app.dashboard import get_upcoming_dates
from app.models import KeyDateCreate


def test_upcoming_dates_sorted_and_filters_past_one_time_dates(tool_db, test_user_id):
    today = date(2026, 10, 25)

    maya = crud.create_person(test_user_id, "Maya", "partner", None)
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2020-11-12", recurring=True))

    sam = crud.create_person(test_user_id, "Sam", "friend", None)
    crud.create_key_date(sam.id, KeyDateCreate(label="Birthday", date="2020-11-08", recurring=True))
    # One-time date already in the past - should not appear.
    crud.create_key_date(sam.id, KeyDateCreate(label="Old anniversary", date="2020-01-01", recurring=False))

    result = get_upcoming_dates(test_user_id, today=today)

    assert [u.person_name for u in result] == ["Sam", "Maya"]
    assert result[0].label == "Birthday"
    assert result[0].days_until == 14
    assert result[1].days_until == 18
    assert all(u.label != "Old anniversary" for u in result)


def test_upcoming_dates_empty_when_no_people(tool_db, test_user_id):
    assert get_upcoming_dates(test_user_id, today=date(2026, 10, 25)) == []


def test_upcoming_dates_only_shows_the_requesting_users_people(tool_db, test_user_id):
    other_user = crud.create_user("other@example.com", "not-a-real-hash")
    other_person = crud.create_person(other_user.id, "Not Mine", "friend", None)
    crud.create_key_date(
        other_person.id, KeyDateCreate(label="Birthday", date="2020-11-12", recurring=True)
    )

    assert get_upcoming_dates(test_user_id, today=date(2026, 10, 25)) == []
