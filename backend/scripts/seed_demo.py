"""Seed 2 rich demo profiles so a judge can open the app and see something real.

Usage:
    cd backend
    python -m scripts.seed_demo
"""

import sys

sys.path.insert(0, ".")

from app import crud  # noqa: E402
from app.auth import hash_password  # noqa: E402
from app.db import init_db  # noqa: E402
from app.models import FactConfirm, KeyDateCreate, PlanStop  # noqa: E402

DEMO_NAME = "Judge"
DEMO_EMAIL = "judge@gmail.com"
DEMO_PASSWORD = "judge123"


def seed():
    init_db()

    demo_user = crud.get_user_by_email_with_hash(DEMO_EMAIL)
    if demo_user is None:
        demo = crud.create_user(DEMO_NAME, DEMO_EMAIL, hash_password(DEMO_PASSWORD))
        print(f"Created demo account: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    else:
        demo = crud.get_user(demo_user["id"])

    if crud.list_people(demo.id):
        print("Demo account already has people in it - skipping seed to avoid duplicates.")
        print("Delete backend/app/kindred.db and re-run if you want a fresh seed.")
        return

    maya = crud.create_person(demo.id, "Maya Chen", "partner", "Austin, TX")
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2026-11-12", recurring=True))
    note1 = crud.create_note(
        maya.id, "Maya said she wants to try pottery, hates loud bars."
    )
    pottery_fact, _loud_bars_fact = crud.create_facts(
        maya.id,
        note1.id,
        [
            FactConfirm(category="wishlist", value="try a pottery class", sentiment="positive", confidence=0.9),
            FactConfirm(category="dislike", value="loud bars", sentiment="negative", confidence=0.9),
        ],
    )
    note2 = crud.create_note(
        maya.id, "She's vegetarian and loves anything with matcha. Mentioned wanting to see live jazz."
    )
    _vegetarian_fact, _matcha_fact, jazz_fact = crud.create_facts(
        maya.id,
        note2.id,
        [
            FactConfirm(category="dietary", value="vegetarian", sentiment="neutral", confidence=0.95),
            FactConfirm(category="like", value="matcha", sentiment="positive", confidence=0.85),
            FactConfirm(category="wishlist", value="see live jazz", sentiment="positive", confidence=0.8),
        ],
    )
    note3 = crud.create_note(
        maya.id, "Told me her last birthday was pretty low-key, just the two of us at home - she'd love something a bit more of an occasion this year."
    )
    crud.create_facts(
        maya.id,
        note3.id,
        [
            FactConfirm(category="past_experience", value="last birthday was low-key, wants more of an occasion this year", sentiment="neutral", confidence=0.85),
        ],
    )

    # A saved plan already in Maya's history, so the demo isn't starting from
    # a blank slate - this is what Day 5's "avoid repeats" prompt sees.
    crud.create_plan(
        person_ids=[maya.id],
        occasion="Date night",
        date="2026-09-20",
        area="Austin, TX",
        budget="$$",
        stops=[
            PlanStop(
                name="Hyde Park Pottery Studio",
                time="6:00pm",
                url="https://example.com/hyde-park-pottery",
                cost_estimate="$45",
                cited_fact_ids=[pottery_fact.id],
                why="She's been wanting to try pottery.",
            ),
            PlanStop(
                name="The Elephant Room",
                time="8:30pm",
                url="https://example.com/elephant-room",
                cost_estimate="$$",
                cited_fact_ids=[jazz_fact.id],
                why="Live jazz, and quiet enough to actually talk.",
            ),
        ],
        status="saved",
    )

    sam = crud.create_person(demo.id, "Sam Rivera", "friend", "Austin, TX")
    crud.create_key_date(sam.id, KeyDateCreate(label="Birthday", date="2026-11-08", recurring=True))
    sam_note1 = crud.create_note(
        sam.id, "Sam's really into board games and craft beer. No stairs - bad knee."
    )
    crud.create_facts(
        sam.id,
        sam_note1.id,
        [
            FactConfirm(category="like", value="board games", sentiment="positive", confidence=0.9),
            FactConfirm(category="like", value="craft beer", sentiment="positive", confidence=0.85),
            FactConfirm(category="constraint", value="no stairs (bad knee)", sentiment="neutral", confidence=0.95),
        ],
    )
    sam_note2 = crud.create_note(
        sam.id, "Mentioned he's trying to eat less red meat these days. Also a huge fan of trivia nights."
    )
    crud.create_facts(
        sam.id,
        sam_note2.id,
        [
            FactConfirm(category="dietary", value="cutting back on red meat", sentiment="neutral", confidence=0.8),
            FactConfirm(category="like", value="trivia nights", sentiment="positive", confidence=0.85),
        ],
    )

    print(f"Seeded: {maya.name} (id={maya.id}), {sam.name} (id={sam.id})")
    print(f"Sign in as {DEMO_EMAIL} / {DEMO_PASSWORD} to see them.")


if __name__ == "__main__":
    seed()
