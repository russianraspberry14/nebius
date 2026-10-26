from types import SimpleNamespace

import pytest

from app import nemotron
from app.models import FactExtraction


def test_parse_fact_json_plain():
    raw = '{"facts": [{"category": "like", "value": "tea", "sentiment": "positive", "confidence": 0.8}]}'
    result = nemotron._parse_fact_json(raw)
    assert isinstance(result, FactExtraction)
    assert result.facts[0].value == "tea"


def test_parse_fact_json_strips_markdown_fence():
    raw = '```json\n{"facts": []}\n```'
    result = nemotron._parse_fact_json(raw)
    assert result.facts == []


def test_parse_fact_json_invalid_raises():
    with pytest.raises(Exception):
        nemotron._parse_fact_json("not json at all")


def _fake_response(content: str):
    message = SimpleNamespace(content=content)
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


def test_extract_facts_happy_path(monkeypatch):
    monkeypatch.setitem(nemotron.TIER_MODELS, "nano", "fake-nano-model")

    calls = []

    class FakeCompletions:
        def create(self, **kwargs):
            calls.append(kwargs)
            return _fake_response('{"facts": [{"category": "like", "value": "hiking", "sentiment": "positive", "confidence": 0.7}]}')

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(nemotron, "get_client", lambda: fake_client)

    result = nemotron.extract_facts("likes hiking")
    assert len(result.facts) == 1
    assert result.facts[0].value == "hiking"
    # First attempt should use JSON mode.
    assert calls[0]["response_format"] == {"type": "json_object"}


def test_extract_facts_falls_back_when_json_mode_rejected(monkeypatch):
    monkeypatch.setitem(nemotron.TIER_MODELS, "nano", "fake-nano-model")

    calls = []

    class FakeCompletions:
        def create(self, **kwargs):
            calls.append(kwargs)
            if "response_format" in kwargs:
                raise TypeError("unexpected keyword argument 'response_format'")
            return _fake_response('{"facts": []}')

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(nemotron, "get_client", lambda: fake_client)

    result = nemotron.extract_facts("nothing extractable here")
    assert result.facts == []
    assert len(calls) == 2


def test_extract_facts_raises_value_error_when_both_attempts_fail(monkeypatch):
    monkeypatch.setitem(nemotron.TIER_MODELS, "nano", "fake-nano-model")

    class FakeCompletions:
        def create(self, **kwargs):
            return _fake_response("not valid json")

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(nemotron, "get_client", lambda: fake_client)

    with pytest.raises(ValueError):
        nemotron.extract_facts("some note")


def test_extract_facts_without_model_id_configured(monkeypatch):
    monkeypatch.setitem(nemotron.TIER_MODELS, "nano", "")
    monkeypatch.setattr(nemotron, "get_client", lambda: SimpleNamespace())
    with pytest.raises(ValueError, match="No model ID configured"):
        nemotron.extract_facts("some note")
