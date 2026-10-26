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

### Seeding demo data

Two rich demo profiles (Maya, Sam) with key dates, notes, and confirmed facts:

```bash
cd backend
python -m scripts.seed_demo
```

### Running backend tests

Routes are covered end-to-end with `pytest` + FastAPI's `TestClient`, each test against
a throwaway SQLite file. Nemotron calls are mocked so the suite runs with no Token
Factory credentials configured.

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Repo layout

```
backend/
  app/
    main.py       # FastAPI app + lifespan DB init + router wiring
    db.py         # SQLite connection + schema loader
    schema.sql    # person, key_date, note, fact, plan
    models.py     # Pydantic request/response schemas
    crud.py       # SQLite CRUD helpers
    nemotron.py   # tiered Nemotron client (Nano/Super/Ultra) + fact extraction
    config.py     # env-var loading
    routers/      # people, notes, facts endpoints
  scripts/
    smoke_test_nemotron.py
    seed_demo.py
  tests/          # pytest suite (CRUD, note capture, cascade deletes)
frontend/
  src/
    app/
      page.tsx              # people list + add person
      people/[id]/page.tsx  # person profile (server wrapper, Suspense)
    components/person/      # KeyDates, NoteCapture, NotesList, FactsList
    lib/
      api.ts         # typed fetch client for the backend
      constants.ts   # fact category labels/colors
```

## License

MIT — see [LICENSE](LICENSE).
