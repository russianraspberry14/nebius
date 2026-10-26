from typing import Literal, Optional

from pydantic import BaseModel, Field

FactCategory = Literal["like", "dislike", "wishlist", "dietary", "constraint", "past_experience"]
Sentiment = Literal["positive", "negative", "neutral"]


# ---- Person ----

class PersonCreate(BaseModel):
    name: str
    relationship: str
    home_city: Optional[str] = None


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    home_city: Optional[str] = None


class PersonOut(BaseModel):
    id: int
    name: str
    relationship: str
    home_city: Optional[str]
    created_at: str


# ---- KeyDate ----

class KeyDateCreate(BaseModel):
    label: str
    date: str  # ISO date, e.g. "2026-11-02"
    recurring: bool = True


class KeyDateOut(BaseModel):
    id: int
    person_id: int
    label: str
    date: str
    recurring: bool


# ---- Note ----

class NoteCreate(BaseModel):
    text: str = Field(min_length=1)


class NoteOut(BaseModel):
    id: int
    person_id: int
    text: str
    created_at: str


# ---- Fact ----

class FactProposal(BaseModel):
    """A single fact candidate extracted by Nano, not yet persisted."""
    category: FactCategory
    value: str
    sentiment: Optional[Sentiment] = None
    confidence: float = Field(ge=0.0, le=1.0)


class FactExtraction(BaseModel):
    """Nano's full structured response for one note."""
    facts: list[FactProposal]


class FactConfirm(BaseModel):
    """A chip the user accepted or edited, ready to persist."""
    category: FactCategory
    value: str
    sentiment: Optional[Sentiment] = None
    confidence: float = Field(ge=0.0, le=1.0)


class FactConfirmBatch(BaseModel):
    facts: list[FactConfirm]


class FactOut(BaseModel):
    id: int
    person_id: int
    note_id: int
    category: FactCategory
    value: str
    sentiment: Optional[Sentiment]
    confidence: Optional[float]
    confirmed: bool


# ---- Composite ----

class NoteCaptureResult(BaseModel):
    note: NoteOut
    proposed_facts: list[FactProposal]


class PersonDetail(BaseModel):
    person: PersonOut
    key_dates: list[KeyDateOut]
    notes: list[NoteOut]
    facts: list[FactOut]
