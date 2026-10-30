from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS
from app.db import init_db
from app.routers import auth, dashboard, facts, notes, people, planning, plans


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Kindred API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(people.router)
app.include_router(notes.router)
app.include_router(facts.router)
app.include_router(planning.router)
app.include_router(plans.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
