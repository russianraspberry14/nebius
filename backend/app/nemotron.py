"""Tiered access to Nemotron 3 (Nano / Super / Ultra) via Nebius Token Factory.

Token Factory exposes an OpenAI-compatible API, so every tier goes through the
same client with a different model ID. Each job in the product routes to the
smallest tier that can do it well (see spec: Nano for note extraction, Super
for tool-calling/revisions, Ultra for cited plan generation).
"""

from openai import OpenAI

from app.config import (
    NANO_MODEL_ID,
    NEBIUS_API_KEY,
    NEBIUS_BASE_URL,
    SUPER_MODEL_ID,
    ULTRA_MODEL_ID,
)
from app.json_utils import parse_structured_json
from app.models import FactExtraction

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
"value": "short phrase", "sentiment": "positive|negative|neutral", "confidence": 0.0-1.0}]}

Rules:
- Only extract facts that are actually stated or strongly implied in the note. Do not invent facts.
- Skip health, financial, or other sensitive categories entirely UNLESS the user wrote them as an \
explicit constraint (e.g. "vegetarian", "no stairs", "allergic to peanuts") - those go in "dietary" \
or "constraint".
- "value" should be a short phrase, not a full sentence (e.g. "wants to try pottery", not \
"She said she wants to try pottery sometime").
- If the note contains no extractable facts, return {"facts": []}.
- Output ONLY the JSON object. No markdown fences, no commentary.
"""


def _parse_fact_json(raw: str) -> FactExtraction:
    return parse_structured_json(raw, FactExtraction)


def extract_facts(note_text: str) -> FactExtraction:
    """Run a note through Nano and return validated fact proposals.

    Tries once with JSON-mode response_format, falls back to plain completion
    if the model rejects that param, and raises ValueError if neither attempt
    yields valid JSON matching the schema - callers should surface that as a
    502 rather than silently saving garbage.
    """
    client = get_client()
    model_id = TIER_MODELS["nano"]
    if not model_id:
        raise ValueError("No model ID configured for tier 'nano'. Set NANO_MODEL_ID in backend/.env.")

    messages = [
        {"role": "system", "content": FACT_EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": note_text},
    ]

    last_error: Exception | None = None
    for use_json_mode in (True, False):
        try:
            kwargs = {"response_format": {"type": "json_object"}} if use_json_mode else {}
            response = client.chat.completions.create(
                model=model_id, messages=messages, temperature=0, **kwargs
            )
            return _parse_fact_json(response.choices[0].message.content)
        except Exception as exc:
            last_error = exc

    raise ValueError(f"Nano did not return valid fact JSON: {last_error}")
