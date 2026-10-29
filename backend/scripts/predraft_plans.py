"""Daily pre-draft job entrypoint (flow D).

Locally:
    cd backend
    python -m scripts.predraft_plans

In production this is the entrypoint for a Nebius Serverless Job scheduled
daily - see README's "Other Nebius services used" section.
"""

import sys

sys.path.insert(0, ".")

from app import crud  # noqa: E402
from app.db import init_db  # noqa: E402
from app.predraft import predraft_plans  # noqa: E402


def main():
    init_db()
    users = crud.list_users()
    if not users:
        print("No users yet.")
        return

    any_outcomes = False
    for user in users:
        outcomes = predraft_plans(user.id)
        if not outcomes:
            continue
        any_outcomes = True
        print(f"-- {user.email} --")
        for o in outcomes:
            line = f"[{o.status}] {o.person_name} - {o.label} ({o.date})"
            if o.detail:
                line += f": {o.detail}"
            print(line)

    if not any_outcomes:
        print("No key dates within the pre-draft window for any user.")


if __name__ == "__main__":
    main()
