"""Daily pre-draft job entrypoint (flow D).

Locally:
    cd backend
    python -m scripts.predraft_plans

In production this is the entrypoint for a Nebius Serverless Job scheduled
daily - see README's "Other Nebius services used" section.
"""

import sys

sys.path.insert(0, ".")

from app.db import init_db  # noqa: E402
from app.predraft import predraft_plans  # noqa: E402


def main():
    init_db()
    outcomes = predraft_plans()
    if not outcomes:
        print("No key dates within the pre-draft window.")
        return
    for o in outcomes:
        line = f"[{o.status}] {o.person_name} - {o.label} ({o.date})"
        if o.detail:
            line += f": {o.detail}"
        print(line)


if __name__ == "__main__":
    main()
