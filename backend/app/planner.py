"""Ultra reconciles a person's confirmed facts against Super's candidates and
drafts cited plan options (flow C, step 3 - the demo centerpiece).

Grounding is enforced after parsing, not just requested in the prompt: a
stop's cited_fact_ids are filtered down to facts that actually exist, and a
stop's url is dropped unless it matches a url Super's tools actually
returned. This is the spec's own risk mitigation ("Model invents places or
citations... validate before rendering") rather than trusting Ultra's output
as-is.
"""

from app.config import SUPER_MODEL_ID, ULTRA_MODEL_ID
from app.json_utils import parse_structured_json
from app.models import (
    CandidateSearchResult,
    FactOut,
    PlanGenerateResult,
    PlanOption,
    PlanStop,
    StopReviseResult,
)
from app.nemotron import get_client

# Super and Ultra are reasoning models - they spend completion tokens on
# hidden reasoning_content before any visible output, so a tight max_tokens
# can truncate before the real JSON reply ever appears.
COMPLETION_MAX_TOKENS = 4096

PLAN_SYSTEM_PROMPT = """You draft an outing or birthday plan for the given person/people, using \
ONLY the candidate places/events you're given and ONLY the facts you're given about them.

Hard rules:
- Every stop's "cited_fact_ids" must reference real fact ids from the list you were given. Only \
cite a fact if it genuinely motivated that stop - don't cite everything on every stop.
- A stop's "name" and "url" must come from the candidate places/events list, when the stop is a \
specific venue. A stop can also be a generic activity with no url (e.g. "walk along the river") \
if nothing in the candidates fits, but don't invent a specific business name that wasn't in the \
candidates.
- Do not repeat a stop name that appears in "past outings" unless there's a clear, stated reason \
(e.g. it's a recurring favorite the person asked to repeat).
- Write "why" as one short sentence a human would say, grounded in the cited fact(s) - not a \
restatement of the fact.
- Produce 2 or 3 distinct options (vary the vibe/budget/pace), each with 2-4 stops.

Respond with ONLY a JSON object, no markdown fences, matching:
{"options": [{"title": str, "stops": [{"name": str, "time": str|null, "url": str|null, \
"cost_estimate": str|null, "cited_fact_ids": [int], "why": str|null}]}]}
"""


def _format_facts(facts: list[FactOut]) -> str:
    if not facts:
        return "(no confirmed facts yet)"
    return "\n".join(f"- id={f.id} [{f.category}] {f.value} (sentiment: {f.sentiment})" for f in facts)


def _format_candidates(candidates: CandidateSearchResult) -> str:
    lines = []
    if candidates.places:
        lines.append("Places:")
        for p in candidates.places:
            lines.append(f"- {p.name} | {p.address or 'no address'} | rating {p.rating} | url: {p.url}")
    if candidates.events:
        lines.append("Events:")
        for e in candidates.events:
            lines.append(f"- {e.name} at {e.venue or 'TBD'} on {e.date} | url: {e.url}")
    if candidates.weather:
        w = candidates.weather
        lines.append(
            f"Weather on {w.date}: high {w.temp_high_c}C / low {w.temp_low_c}C, "
            f"{w.precipitation_chance}% chance of precipitation"
        )
    return "\n".join(lines) if lines else "(no candidates found)"


def _ground_stop(
    stop: PlanStop, known_fact_ids: set[int], known_urls: set[str], known_names: set[str]
) -> PlanStop:
    stop.cited_fact_ids = [fid for fid in stop.cited_fact_ids if fid in known_fact_ids]
    # Check before clearing the url - a surviving url is itself proof this
    # is a real candidate, but we still need that signal after nulling it.
    stop.verified = (stop.url in known_urls) if stop.url else (stop.name.strip().lower() in known_names)
    if stop.url and stop.url not in known_urls:
        stop.url = None
    return stop


def _ground_plan(
    result: PlanGenerateResult, known_fact_ids: set[int], known_urls: set[str], known_names: set[str]
) -> PlanGenerateResult:
    for option in result.options:
        for stop in option.stops:
            _ground_stop(stop, known_fact_ids, known_urls, known_names)
    return result


def generate_plan_options(
    *,
    people_facts: dict[str, list[FactOut]],
    candidates: CandidateSearchResult,
    past_stop_names: list[str],
    occasion: str,
    date: str,
    area: str,
    budget: str | None = None,
    duration: str | None = None,
) -> PlanGenerateResult:
    client = get_client()
    if not ULTRA_MODEL_ID:
        raise ValueError("No model ID configured for tier 'ultra'. Set ULTRA_MODEL_ID in backend/.env.")

    all_facts = [f for facts in people_facts.values() for f in facts]
    known_fact_ids = {f.id for f in all_facts}
    known_urls = {p.url for p in candidates.places if p.url} | {e.url for e in candidates.events if e.url}
    known_names = {p.name.strip().lower() for p in candidates.places} | {
        e.name.strip().lower() for e in candidates.events
    }

    people_block = "\n\n".join(
        f"{name}:\n{_format_facts(facts)}" for name, facts in people_facts.items()
    )
    past_block = ", ".join(past_stop_names) if past_stop_names else "(none yet)"

    user_context = (
        f"Occasion: {occasion}\nDate: {date}\nArea: {area}\nBudget: {budget or 'unspecified'}\n"
        f"Duration: {duration or 'unspecified'}\n\n"
        f"People and their confirmed facts:\n{people_block}\n\n"
        f"Candidates from search:\n{_format_candidates(candidates)}\n\n"
        f"Past outings already used (avoid repeating): {past_block}"
    )

    response = client.chat.completions.create(
        model=ULTRA_MODEL_ID,
        messages=[
            {"role": "system", "content": PLAN_SYSTEM_PROMPT},
            {"role": "user", "content": user_context},
        ],
        temperature=0.4,
        max_tokens=COMPLETION_MAX_TOKENS,
    )
    result = parse_structured_json(response.choices[0].message.content, PlanGenerateResult)
    return _ground_plan(result, known_fact_ids, known_urls, known_names)


STOP_REVISION_SYSTEM_PROMPT = """You revise exactly ONE stop in an existing outing plan, based on a \
user instruction (e.g. "swap dinner for something cheaper"). Use ONLY the fresh candidates you're \
given and ONLY the facts you're given - the same grounding rules as drafting a plan from scratch:

- "cited_fact_ids" must reference real fact ids from the list you were given, and only facts that \
actually motivated this stop.
- "name" and "url" must come from the candidate places/events list for a specific venue; a generic \
activity with no url is fine if nothing fits, but never invent a business name.
- Do not repeat a stop name from "other stops in this plan" or "past outings".
- The other stops are shown only for context - you are replacing ONE stop, not redesigning the plan.

Respond with ONLY a JSON object, no markdown fences, matching:
{"stop": {"name": str, "time": str|null, "url": str|null, "cost_estimate": str|null, \
"cited_fact_ids": [int], "why": str|null}}
"""


def revise_stop(
    *,
    people_facts: dict[str, list[FactOut]],
    candidates: CandidateSearchResult,
    other_stops: list[PlanStop],
    past_stop_names: list[str],
    stop_to_revise: PlanStop,
    instruction: str,
    occasion: str,
    date: str,
    area: str,
    budget: str | None = None,
) -> PlanStop:
    client = get_client()
    if not SUPER_MODEL_ID:
        raise ValueError("No model ID configured for tier 'super'. Set SUPER_MODEL_ID in backend/.env.")

    all_facts = [f for facts in people_facts.values() for f in facts]
    known_fact_ids = {f.id for f in all_facts}
    known_urls = {p.url for p in candidates.places if p.url} | {e.url for e in candidates.events if e.url}
    known_names = {p.name.strip().lower() for p in candidates.places} | {
        e.name.strip().lower() for e in candidates.events
    }

    people_block = "\n\n".join(
        f"{name}:\n{_format_facts(facts)}" for name, facts in people_facts.items()
    )
    other_names = ", ".join(s.name for s in other_stops) or "(none)"
    past_block = ", ".join(past_stop_names) if past_stop_names else "(none yet)"

    user_context = (
        f"Occasion: {occasion}\nDate: {date}\nArea: {area}\nBudget: {budget or 'unspecified'}\n\n"
        f"People and their confirmed facts:\n{people_block}\n\n"
        f"Stop being revised: {stop_to_revise.model_dump_json()}\n"
        f"User instruction: {instruction}\n\n"
        f"Other stops in this plan (context only, don't duplicate): {other_names}\n"
        f"Past outings already used (avoid repeating): {past_block}\n\n"
        f"Fresh candidates for the revision:\n{_format_candidates(candidates)}"
    )

    response = client.chat.completions.create(
        model=SUPER_MODEL_ID,
        messages=[
            {"role": "system", "content": STOP_REVISION_SYSTEM_PROMPT},
            {"role": "user", "content": user_context},
        ],
        temperature=0.4,
        max_tokens=COMPLETION_MAX_TOKENS,
    )
    result = parse_structured_json(response.choices[0].message.content, StopReviseResult)
    return _ground_stop(result.stop, known_fact_ids, known_urls, known_names)
