import json
import sqlite3
from typing import Optional

from app.db import get_connection
from app.models import (
    FactConfirm,
    FactOut,
    KeyDateCreate,
    KeyDateOut,
    NoteOut,
    PersonDetail,
    PersonOut,
    PersonUpdate,
    PlanOut,
    PlanStop,
    UserOut,
)


def _row_to_person(row: sqlite3.Row) -> PersonOut:
    d = dict(row)
    d.pop("user_id", None)
    return PersonOut(**d)


def _row_to_key_date(row: sqlite3.Row) -> KeyDateOut:
    d = dict(row)
    d["recurring"] = bool(d["recurring"])
    return KeyDateOut(**d)


def _row_to_note(row: sqlite3.Row) -> NoteOut:
    return NoteOut(**dict(row))


def _row_to_fact(row: sqlite3.Row) -> FactOut:
    d = dict(row)
    d["confirmed"] = bool(d["confirmed"])
    return FactOut(**d)


def _row_to_plan(row: sqlite3.Row) -> PlanOut:
    d = dict(row)
    d["person_ids"] = json.loads(d["person_ids"])
    d["stops"] = [PlanStop(**s) for s in json.loads(d["stops"])]
    return PlanOut(**d)


def _row_to_user(row: sqlite3.Row) -> UserOut:
    d = dict(row)
    d.pop("hashed_password", None)
    return UserOut(**d)


# ---- User ----

def create_user(email: str, hashed_password: str) -> UserOut:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO user (email, hashed_password) VALUES (?, ?)",
            (email.lower(), hashed_password),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM user WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _row_to_user(row)
    finally:
        conn.close()


def get_user_by_email_with_hash(email: str) -> Optional[sqlite3.Row]:
    """Raw row (includes hashed_password) - only for verifying a login attempt."""
    conn = get_connection()
    try:
        return conn.execute("SELECT * FROM user WHERE email = ?", (email.lower(),)).fetchone()
    finally:
        conn.close()


def email_taken(email: str) -> bool:
    conn = get_connection()
    try:
        row = conn.execute("SELECT 1 FROM user WHERE email = ?", (email.lower(),)).fetchone()
        return row is not None
    finally:
        conn.close()


def get_user(user_id: int) -> Optional[UserOut]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM user WHERE id = ?", (user_id,)).fetchone()
        return _row_to_user(row) if row else None
    finally:
        conn.close()


def list_users() -> list[UserOut]:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM user ORDER BY id").fetchall()
        return [_row_to_user(r) for r in rows]
    finally:
        conn.close()


# ---- Person ----

def create_person(user_id: int, name: str, relationship: str, home_city: Optional[str]) -> PersonOut:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO person (user_id, name, relationship, home_city) VALUES (?, ?, ?, ?)",
            (user_id, name, relationship, home_city),
        )
        conn.commit()
        return get_person(cur.lastrowid, user_id, conn=conn)
    finally:
        conn.close()


def list_people(user_id: int) -> list[PersonOut]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM person WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        return [_row_to_person(r) for r in rows]
    finally:
        conn.close()


def get_person(
    person_id: int, user_id: int, conn: Optional[sqlite3.Connection] = None
) -> Optional[PersonOut]:
    """None if the person doesn't exist OR belongs to someone else - callers
    treat both the same way (404), so this never leaks whether an id exists."""
    owns_conn = conn is None
    conn = conn or get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM person WHERE id = ? AND user_id = ?", (person_id, user_id)
        ).fetchone()
        return _row_to_person(row) if row else None
    finally:
        if owns_conn:
            conn.close()


def update_person(person_id: int, user_id: int, data: PersonUpdate) -> Optional[PersonOut]:
    fields = data.model_dump(exclude_unset=True)
    if not fields:
        return get_person(person_id, user_id)
    conn = get_connection()
    try:
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        conn.execute(
            f"UPDATE person SET {set_clause} WHERE id = ? AND user_id = ?",
            (*fields.values(), person_id, user_id),
        )
        conn.commit()
        return get_person(person_id, user_id, conn=conn)
    finally:
        conn.close()


def delete_person(person_id: int, user_id: int) -> bool:
    conn = get_connection()
    try:
        cur = conn.execute(
            "DELETE FROM person WHERE id = ? AND user_id = ?", (person_id, user_id)
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ---- KeyDate ----
# Callers verify person ownership (via get_person) before create/list; the
# leaf-level delete re-checks ownership itself via a join, since a
# key_date_id alone doesn't carry the owning user.

def create_key_date(person_id: int, data: KeyDateCreate) -> KeyDateOut:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO key_date (person_id, label, date, recurring) VALUES (?, ?, ?, ?)",
            (person_id, data.label, data.date, int(data.recurring)),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM key_date WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _row_to_key_date(row)
    finally:
        conn.close()


def list_key_dates(person_id: int) -> list[KeyDateOut]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM key_date WHERE person_id = ? ORDER BY date", (person_id,)
        ).fetchall()
        return [_row_to_key_date(r) for r in rows]
    finally:
        conn.close()


def delete_key_date(key_date_id: int, user_id: int) -> bool:
    conn = get_connection()
    try:
        cur = conn.execute(
            """DELETE FROM key_date WHERE id = ? AND person_id IN
               (SELECT id FROM person WHERE user_id = ?)""",
            (key_date_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ---- Note ----

def create_note(person_id: int, text: str) -> NoteOut:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO note (person_id, text) VALUES (?, ?)", (person_id, text)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM note WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _row_to_note(row)
    finally:
        conn.close()


def get_note(note_id: int, user_id: int) -> Optional[NoteOut]:
    conn = get_connection()
    try:
        row = conn.execute(
            """SELECT note.* FROM note JOIN person ON person.id = note.person_id
               WHERE note.id = ? AND person.user_id = ?""",
            (note_id, user_id),
        ).fetchone()
        return _row_to_note(row) if row else None
    finally:
        conn.close()


def list_notes(person_id: int) -> list[NoteOut]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM note WHERE person_id = ? ORDER BY created_at DESC", (person_id,)
        ).fetchall()
        return [_row_to_note(r) for r in rows]
    finally:
        conn.close()


def delete_note(note_id: int, user_id: int) -> bool:
    conn = get_connection()
    try:
        cur = conn.execute(
            """DELETE FROM note WHERE id = ? AND person_id IN
               (SELECT id FROM person WHERE user_id = ?)""",
            (note_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ---- Fact ----

def create_facts(person_id: int, note_id: int, facts: list[FactConfirm]) -> list[FactOut]:
    if not facts:
        return []
    conn = get_connection()
    try:
        saved = []
        for f in facts:
            cur = conn.execute(
                """INSERT INTO fact (person_id, note_id, category, value, sentiment, confidence, confirmed)
                   VALUES (?, ?, ?, ?, ?, ?, 1)""",
                (person_id, note_id, f.category, f.value, f.sentiment, f.confidence),
            )
            row = conn.execute("SELECT * FROM fact WHERE id = ?", (cur.lastrowid,)).fetchone()
            saved.append(_row_to_fact(row))
        conn.commit()
        return saved
    finally:
        conn.close()


def list_facts(person_id: int) -> list[FactOut]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM fact WHERE person_id = ? AND confirmed = 1 ORDER BY id DESC",
            (person_id,),
        ).fetchall()
        return [_row_to_fact(r) for r in rows]
    finally:
        conn.close()


def delete_fact(fact_id: int, user_id: int) -> bool:
    conn = get_connection()
    try:
        cur = conn.execute(
            """DELETE FROM fact WHERE id = ? AND person_id IN
               (SELECT id FROM person WHERE user_id = ?)""",
            (fact_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ---- Plan ----
# Callers verify every person_id in a plan belongs to the requesting user
# (via get_person) before create/list - a plan's person_ids are a JSON array,
# not a single FK, so there's no single join to check ownership here.

def create_plan(
    person_ids: list[int],
    occasion: str,
    date: str,
    area: Optional[str],
    budget: Optional[str],
    stops: list[PlanStop],
    status: str = "saved",
) -> PlanOut:
    conn = get_connection()
    try:
        cur = conn.execute(
            """INSERT INTO plan (person_ids, occasion, date, budget, area, stops, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                json.dumps(person_ids),
                occasion,
                date,
                budget,
                area,
                json.dumps([s.model_dump() for s in stops]),
                status,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM plan WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _row_to_plan(row)
    finally:
        conn.close()


def list_plans(person_id: int) -> list[PlanOut]:
    """Plans that include this person, newest first.

    person_ids is stored as a JSON array, so membership is checked in Python
    rather than relying on SQLite's JSON1 extension being available.
    """
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM plan ORDER BY created_at DESC").fetchall()
        plans = [_row_to_plan(r) for r in rows]
        return [p for p in plans if person_id in p.person_ids]
    finally:
        conn.close()


# ---- Dashboard ----

def list_all_key_dates_with_person(user_id: int) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT key_date.id, key_date.label, key_date.date, key_date.recurring,
                      person.id AS person_id, person.name AS person_name
               FROM key_date JOIN person ON person.id = key_date.person_id
               WHERE person.user_id = ?""",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---- Composite ----

def get_person_detail(person_id: int, user_id: int) -> Optional[PersonDetail]:
    person = get_person(person_id, user_id)
    if person is None:
        return None
    return PersonDetail(
        person=person,
        key_dates=list_key_dates(person_id),
        notes=list_notes(person_id),
        facts=list_facts(person_id),
    )


def gather_people_facts_and_history(
    person_ids: list[int], user_id: int
) -> tuple[dict[str, list[FactOut]], list[str]]:
    """Shared context for generating a plan, revising a stop, and the pre-draft job.

    Returns (confirmed facts per person name, past stop names across their
    saved/drafted plans - the "avoid repeats" list). Raises ValueError for an
    unknown or not-owned person id so callers can turn that into a 404.
    """
    people_facts: dict[str, list[FactOut]] = {}
    for person_id in person_ids:
        person = get_person(person_id, user_id)
        if person is None:
            raise ValueError(f"Person {person_id} not found")
        people_facts[person.name] = list_facts(person_id)

    past_stop_names: list[str] = []
    seen = set()
    for person_id in person_ids:
        for plan in list_plans(person_id):
            for stop in plan.stops:
                if stop.name not in seen:
                    seen.add(stop.name)
                    past_stop_names.append(stop.name)

    return people_facts, past_stop_names
