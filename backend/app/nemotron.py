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

TIER_MODELS = {
    "nano": NANO_MODEL_ID,
    "super": SUPER_MODEL_ID,
    "ultra": ULTRA_MODEL_ID,
}

_client: OpenAI | None = None


def _get_client() -> OpenAI:
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
    client = _get_client()
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
