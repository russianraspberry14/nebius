# Kindred

A private assistant that remembers what the people in your life like and turns it into
outing and birthday plans before you are scrambling. Log a quick note, Kindred extracts
structured facts, and it drafts a plan where every choice cites the note behind it.

Built for the Personal AI track: persistent memory (person profiles), reusable skills
(plan outing, suggest gift), user-chosen tools (places/events/weather), and private data
under the user's control.

## Stack

- **Backend:** Python FastAPI, SQLite (`backend/`)
- **Frontend:** Next.js + Tailwind (`frontend/`)
- **Models:** Nemotron 3 Nano / Super / Ultra via Nebius Token Factory, routed by task

| Job | Model |
|---|---|
| Extract facts from notes | Nemotron 3 Nano |
| Tool calling, plan revisions, gift ideas | Nemotron 3 Super |
| Reconcile preferences, draft cited plans | Nemotron 3 Ultra |

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows; use source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env     # fill in NEBIUS_API_KEY and the three *_MODEL_ID vars
python -m app.db          # initializes the SQLite schema at app/kindred.db
uvicorn app.main:app --reload
```

Confirm the Nano and Ultra model IDs in the Token Factory console — the spec only
pins Super's ID (`nvidia/nemotron-3-super120b-a12b`).

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Smoke-testing the Nemotron tiers

One test call to each tier (Day 1 checklist item):

```bash
cd backend
python -m scripts.smoke_test_nemotron
```

## Repo layout

```
backend/
  app/
    main.py       # FastAPI app + lifespan DB init
    db.py         # SQLite connection + schema loader
    schema.sql    # person, key_date, note, fact, plan
    nemotron.py   # tiered Nemotron client (Nano/Super/Ultra)
    config.py     # env-var loading
  scripts/
    smoke_test_nemotron.py
frontend/         # Next.js + Tailwind app
```

## License

MIT — see [LICENSE](LICENSE).
