"""Tiered access to Nemotron 3 (Nano / Super / Ultra) via Nebius Token Factory.

Token Factory exposes an OpenAI-compatible API, so every tier goes through the
same client with a different model ID. Each job in the product routes to the
smallest tier that can do it well (see spec: Nano for note extraction, Super
for tool-calling/revisions, Ultra for cited plan generation).
"""

import json
from datetime import date

from openai import OpenAI

from app.config import (
    NANO_MODEL_ID,
    NEBIUS_API_KEY,
    NEBIUS_BASE_URL,
    SUPER_MODEL_ID,
    ULTRA_MODEL_ID,
)
from app.json_utils import parse_structured_json
from app.models import FactExtraction, PlanChatSlots

TIER_MODELS = {
    "nano": NANO_MODEL_ID,
    "super": SUPER_MODEL_ID,
    "ultra": ULTRA_MODEL_ID,
}

_client: OpenAI | None = None


def get_client() -> OpenAI:
    """Shared Token Factory client - also used by the Super tool-calling loop."""
    global _client
    if _client is None:
        if not NEBIUS_API_KEY:
            raise ValueError("NEBIUS_API_KEY is not set. Copy backend/.env.example to backend/.env and fill it in.")
        _client = OpenAI(api_key=NEBIUS_API_KEY, base_url=NEBIUS_BASE_URL)
    return _client


def call_tier(tier: str, prompt: str, **kwargs) -> str:
    """Send a single user-turn prompt to the given tier and return the text reply."""
    model_id = TIER_MODELS.get(tier)
    if not model_id:
        raise ValueError(
            f"No model ID configured for tier '{tier}'. Set it in backend/.env."
        )
    client = get_client()
    response = client.chat.completions.create(
        model=model_id,
        messages=[{"role": "user", "content": prompt}],
        **kwargs,
    )
    return response.choices[0].message.content


def call_nano(prompt: str, **kwargs) -> str:
    return call_tier("nano", prompt, **kwargs)


def call_super(prompt: str, **kwargs) -> str:
    return call_tier("super", prompt, **kwargs)


def call_ultra(prompt: str, **kwargs) -> str:
    return call_tier("ultra", prompt, **kwargs)


FACT_EXTRACTION_SYSTEM_PROMPT = """You extract structured facts about a person from a short note the \
user wrote about them. Output strict JSON matching this shape and nothing else:

{"facts": [{"category": "like|dislike|wishlist|dietary|constraint|past_experience", \
"value": "short phrase", "sentiment": "positive|negative|neutral", "confidence": 0.0-1.0}], \
"key_date": {"label": "short label, e.g. Birthday or Graduation", "date": "YYYY-MM-DD"} or null}

Rules for "facts":
- Only extract facts that are actually stated or strongly implied in the note. Do not invent facts.
- Skip health, financial, or other sensitive categories entirely UNLESS the user wrote them as an \
explicit constraint (e.g. "vegetarian", "no stairs", "allergic to peanuts") - those go in "dietary" \
or "constraint".
- "value" should be a short phrase, not a full sentence (e.g. "wants to try pottery", not \
"She said she wants to try pottery sometime").
- If the note contains no extractable facts, use an empty list.

Rules for "key_date":
- Only set it if the note names a specific, datable event worth remembering (birthday, \
anniversary, graduation, appointment, etc.) - not a vague timeframe like "next month".
- Today's date is {today}. Resolve partial dates (e.g. "8th November", "Nov 8") against it: if no \
year is stated and that month/day has already passed this year, use next year; otherwise use this \
year. If the note itself implies a year (e.g. "graduated in 2024"), use that instead.
- "label" is a short title (e.g. "Graduation", "Birthday"), not a restatement of the whole note.
- If no datable event is mentioned, set it to null.

Output ONLY the JSON object. No markdown fences, no commentary.
"""


def _parse_fact_json(raw: str) -> FactExtraction:
    return parse_structured_json(raw, FactExtraction)


def _nano_structured_call(system_prompt: str, user_text: str, model_cls):
    """Shared two-attempt dance for a Nano call that must return JSON
    matching `model_cls`: try JSON-mode response_format first, fall back to
    a plain completion if the model rejects that param, and raise
    ValueError (never silently return garbage) if neither attempt parses."""
    client = get_client()
    model_id = TIER_MODELS["nano"]
    if not model_id:
        raise ValueError("No model ID configured for tier 'nano'. Set NANO_MODEL_ID in backend/.env.")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text},
    ]

    last_error: Exception | None = None
    for use_json_mode in (True, False):
        try:
            kwargs = {"response_format": {"type": "json_object"}} if use_json_mode else {}
            response = client.chat.completions.create(
                model=model_id, messages=messages, temperature=0, **kwargs
            )
            return parse_structured_json(response.choices[0].message.content, model_cls)
        except Exception as exc:
            last_error = exc

    raise ValueError(f"Nano did not return valid JSON: {last_error}")


def extract_facts(note_text: str, today_iso: str | None = None) -> FactExtraction:
    """Run a note through Nano and return validated fact (and key date) proposals."""
    today = today_iso or date.today().isoformat()
    system_prompt = FACT_EXTRACTION_SYSTEM_PROMPT.replace("{today}", today)
    return _nano_structured_call(system_prompt, note_text, FactExtraction)


PLAN_SLOT_SYSTEM_PROMPT = """You extract plan-request details from what someone says about planning \
an outing. Output strict JSON matching this shape and nothing else:

{"occasion": "short phrase, e.g. dinner date" or null, "date": "YYYY-MM-DD" or null, \
"area": "a place name, e.g. Austin or downtown" or null, "budget": "e.g. $, $$, $$$" or null, \
"duration": "e.g. an afternoon, evening around 7pm, a full day" or null}

Already known from earlier in this conversation (don't repeat these back, just fill in gaps or \
override one if the new message explicitly changes it): {known}

Rules:
- Only set a field if the message actually states or strongly implies it. Leave anything unstated \
as null - do not guess or invent a default.
- Today's date is {today}. Resolve a relative or partial date (e.g. "this Saturday", "Nov 8", \
"next Friday") to an absolute ISO date against it.
- If a specific time of day is mentioned (e.g. "around 7pm", "in the morning") and no separate \
duration is stated, fold it into "duration" (e.g. "evening, around 7pm").
- "area" is a place, not a venue type - "a park" is not an area, "Austin" is.

Output ONLY the JSON object. No markdown fences, no commentary.
"""


def parse_plan_slots(text: str, known: PlanChatSlots, today_iso: str | None = None) -> PlanChatSlots:
    """Run one turn of a plan-chat conversation through Nano, extracting
    whatever new occasion/date/area/budget/duration info it adds."""
    today = today_iso or date.today().isoformat()
    system_prompt = PLAN_SLOT_SYSTEM_PROMPT.replace("{today}", today).replace(
        "{known}", json.dumps(known.model_dump())
    )
    return _nano_structured_call(system_prompt, text, PlanChatSlots)
