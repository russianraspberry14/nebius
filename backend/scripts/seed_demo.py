"""Seed 2 rich demo profiles so a judge can open the app and see something real.

Usage:
    cd backend
    python -m scripts.seed_demo
"""

import sys

sys.path.insert(0, ".")

from app import crud  # noqa: E402
from app.db import init_db  # noqa: E402
from app.models import FactConfirm, KeyDateCreate  # noqa: E402


def seed():
    init_db()

    if crud.list_people():
        print("Database already has people in it - skipping seed to avoid duplicates.")
        print("Delete backend/app/kindred.db and re-run if you want a fresh seed.")
        return

    maya = crud.create_person("Maya Chen", "partner", "Austin, TX")
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2026-11-12", recurring=True))
    note1 = crud.create_note(
        maya.id, "Maya said she wants to try pottery, hates loud bars."
    )
    crud.create_facts(
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
    crud.create_facts(
        maya.id,
        note2.id,
        [
            FactConfirm(category="dietary", value="vegetarian", sentiment="neutral", confidence=0.95),
            FactConfirm(category="like", value="matcha", sentiment="positive", confidence=0.85),
            FactConfirm(category="wishlist", value="see live jazz", sentiment="positive", confidence=0.8),
        ],
    )

    sam = crud.create_person("Sam Rivera", "friend", "Austin, TX")
    crud.create_key_date(sam.id, KeyDateCreate(label="Birthday", date="2026-11-08", recurring=True))
    note3 = crud.create_note(
        sam.id, "Sam's really into board games and craft beer. No stairs - bad knee."
    )
    crud.create_facts(
        sam.id,
        note3.id,
        [
            FactConfirm(category="like", value="board games", sentiment="positive", confidence=0.9),
            FactConfirm(category="like", value="craft beer", sentiment="positive", confidence=0.85),
            FactConfirm(category="constraint", value="no stairs (bad knee)", sentiment="neutral", confidence=0.95),
        ],
    )

    print(f"Seeded: {maya.name} (id={maya.id}), {sam.name} (id={sam.id})")


if __name__ == "__main__":
    seed()
