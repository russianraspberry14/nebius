import json
from types import SimpleNamespace

import pytest

from app import tool_loop
from app.models import CandidateSearchResult


def _tool_call(call_id, name, arguments):
    return SimpleNamespace(
        id=call_id,
        function=SimpleNamespace(name=name, arguments=json.dumps(arguments)),
        model_dump=lambda: {"id": call_id, "function": {"name": name, "arguments": json.dumps(arguments)}},
    )


def _message(content=None, tool_calls=None):
    return SimpleNamespace(content=content, tool_calls=tool_calls)


def _response(message):
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.fixture()
def no_model_check(monkeypatch):
    monkeypatch.setattr(tool_loop, "SUPER_MODEL_ID", "fake-super-model")


def test_run_candidate_search_dispatches_tool_calls_and_parses_final_json(monkeypatch, no_model_check):
    monkeypatch.setattr(
        tool_loop,
        "TOOL_FUNCTIONS",
        {"search_places": lambda **kwargs: [{"name": "Clayworks", "source": "test"}]},
    )

    calls = []

    class FakeCompletions:
        def create(self, **kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                tc = _tool_call("call_1", "search_places", {"query": "pottery", "area": "Austin"})
                return _response(_message(tool_calls=[tc]))
            final = CandidateSearchResult(
                places=[{"name": "Clayworks", "source": "test"}], events=[], weather=None
            )
            return _response(_message(content=final.model_dump_json()))

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(tool_loop, "get_client", lambda: fake_client)

    result = tool_loop.run_candidate_search(occasion="birthday", date="2026-11-12", area="Austin")
    assert isinstance(result, CandidateSearchResult)
    assert result.places[0].name == "Clayworks"
    assert len(calls) == 2

    # The tool result was fed back to the model as a `tool` message.
    tool_messages = [m for m in calls[1]["messages"] if m.get("role") == "tool"]
    assert len(tool_messages) == 1
    assert json.loads(tool_messages[0]["content"]) == [{"name": "Clayworks", "source": "test"}]


def test_run_candidate_search_stops_immediately_with_no_tool_calls(monkeypatch, no_model_check):
    final = CandidateSearchResult(places=[], events=[], weather=None)

    class FakeCompletions:
        def create(self, **kwargs):
            return _response(_message(content=final.model_dump_json()))

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(tool_loop, "get_client", lambda: fake_client)

    result = tool_loop.run_candidate_search(occasion="birthday", date="2026-11-12", area="Austin")
    assert result.places == []


def test_run_candidate_search_respects_tool_call_cap(monkeypatch, no_model_check):
    monkeypatch.setattr(tool_loop, "MAX_TOOL_CALLS", 2)
    monkeypatch.setattr(
        tool_loop,
        "TOOL_FUNCTIONS",
        {"search_places": lambda **kwargs: [{"name": "Somewhere", "source": "test"}]},
    )

    calls = []

    class FakeCompletions:
        def create(self, **kwargs):
            calls.append(kwargs)
            # Keep requesting another tool call every time tools are allowed...
            if kwargs.get("tool_choice") == "none":
                final = CandidateSearchResult(places=[], events=[], weather=None)
                return _response(_message(content=final.model_dump_json()))
            tc = _tool_call(f"call_{len(calls)}", "search_places", {"query": "x", "area": "Austin"})
            return _response(_message(tool_calls=[tc]))

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(tool_loop, "get_client", lambda: fake_client)

    result = tool_loop.run_candidate_search(occasion="birthday", date="2026-11-12", area="Austin")
    assert isinstance(result, CandidateSearchResult)
    # One call with tool_calls (hits the cap at 2), then the forced final call.
    forced_final_calls = [c for c in calls if c.get("tool_choice") == "none"]
    assert len(forced_final_calls) == 1


def test_tool_dispatch_errors_are_returned_not_raised(monkeypatch, no_model_check):
    def boom(**kwargs):
        raise ValueError("No events source configured.")

    monkeypatch.setattr(tool_loop, "TOOL_FUNCTIONS", {"search_events": boom})

    result = tool_loop._dispatch_tool("search_events", json.dumps({"area": "Austin", "date_range": "2026-11-12"}))
    assert result == {"error": "No events source configured."}


def test_without_super_model_id_raises(monkeypatch):
    monkeypatch.setattr(tool_loop, "SUPER_MODEL_ID", "")
    monkeypatch.setattr(tool_loop, "get_client", lambda: SimpleNamespace())
    with pytest.raises(ValueError, match="No model ID configured"):
        tool_loop.run_candidate_search(occasion="birthday", date="2026-11-12", area="Austin")
