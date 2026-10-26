"""Shared helpers for parsing structured JSON out of LLM completions."""

import json
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return text


def parse_structured_json(raw: str, model: type[T]) -> T:
    """Parse a (possibly markdown-fenced) JSON completion into a Pydantic model."""
    data = json.loads(strip_code_fences(raw))
    return model.model_validate(data)
