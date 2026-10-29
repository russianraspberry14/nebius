from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

FactCategory = Literal["like", "dislike", "wishlist", "dietary", "constraint", "past_experience"]
Sentiment = Literal["positive", "negative", "neutral"]


# ---- Auth ----

class SignupRequest(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: str


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut


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


# ---- Candidate search (Super tool-calling loop) ----

class PlaceCandidate(BaseModel):
    name: str
    address: Optional[str] = None
    rating: Optional[float] = None
    price_level: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None


class EventCandidate(BaseModel):
    name: str
    venue: Optional[str] = None
    date: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None


class WeatherInfo(BaseModel):
    date: str
    temp_high_c: Optional[float] = None
    temp_low_c: Optional[float] = None
    precipitation_chance: Optional[float] = None
    weather_code: Optional[int] = None


class CandidateSearchRequest(BaseModel):
    occasion: str
    date: str  # ISO date, e.g. "2026-11-12"
    area: str
    budget: Optional[str] = None
    duration: Optional[str] = None
    keywords: Optional[str] = ""


class CandidateSearchResult(BaseModel):
    places: list[PlaceCandidate] = []
    events: list[EventCandidate] = []
    weather: Optional[WeatherInfo] = None


# ---- Plan (Ultra) ----

class PlanStop(BaseModel):
    name: str
    time: Optional[str] = None
    url: Optional[str] = None
    cost_estimate: Optional[str] = None
    cited_fact_ids: list[int] = []
    why: Optional[str] = None


class PlanOption(BaseModel):
    title: str
    stops: list[PlanStop]


class PlanGenerateRequest(BaseModel):
    person_ids: list[int] = Field(min_length=1)
    occasion: str
    date: str
    area: str
    budget: Optional[str] = None
    duration: Optional[str] = None
    keywords: Optional[str] = ""


class PlanGenerateResult(BaseModel):
    options: list[PlanOption]


class PlanSaveRequest(BaseModel):
    person_ids: list[int] = Field(min_length=1)
    occasion: str
    date: str
    area: Optional[str] = None
    budget: Optional[str] = None
    stops: list[PlanStop]


class PlanOut(BaseModel):
    id: int
    person_ids: list[int]
    occasion: str
    date: str
    budget: Optional[str]
    area: Optional[str]
    stops: list[PlanStop]
    status: str
    created_at: str


class UpcomingPlanOut(BaseModel):
    """A plan (draft or saved) with a today-or-later date, enriched with the
    names of the people it's for - for the dashboard's "Plans coming up"."""
    id: int
    occasion: str
    date: str
    person_ids: list[int]
    person_names: list[str]
    stops: list[PlanStop]
    status: str


class StopReviseRequest(BaseModel):
    person_ids: list[int] = Field(min_length=1)
    occasion: str
    date: str
    area: str
    stops: list[PlanStop] = Field(min_length=1)
    stop_index: int = Field(ge=0)
    instruction: str = Field(min_length=1)
    budget: Optional[str] = None


class StopReviseResult(BaseModel):
    """Super's raw structured response for one revised stop."""
    stop: PlanStop


# ---- Dashboard ----

class UpcomingDate(BaseModel):
    person_id: int
    person_name: str
    key_date_id: int
    label: str
    date: str  # this year's/next occurrence, ISO
    days_until: int
    recurring: bool
    draft_plan_id: Optional[int] = None
