"""Super's tool-calling loop: gathers raw outing candidates (places, events,
weather) for an area/date, capped at ~6 tool calls per the spec.

This produces a candidate list only - Day 4's Ultra step is what reconciles
candidates against a person's facts and drafts a cited plan.
"""

import json

from app.config import SEATGEEK_CLIENT_ID, SUPER_MODEL_ID, TICKETMASTER_API_KEY
from app.json_utils import parse_structured_json
from app.models import CandidateSearchResult
from app.nemotron import get_client
from app.tools.events import search_events
from app.tools.geocode import geocode
from app.tools.places import search_places
from app.tools.weather import get_weather

MAX_TOOL_CALLS = 6
# Super is a reasoning model - it spends completion tokens on hidden
# reasoning_content before any visible output, so a tight max_tokens can
# truncate before the real reply (or tool call) ever appears.
COMPLETION_MAX_TOKENS = 4096

BASE_TOOL_FUNCTIONS = {
    "geocode": geocode,
    "get_weather": get_weather,
    "search_places": search_places,
}

BASE_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "geocode",
            "description": "Resolve a city name to coordinates.",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the forecast for an area on a specific date (Open-Meteo covers ~16 days out).",
            "parameters": {
                "type": "object",
                "properties": {
                    "area": {"type": "string"},
                    "date": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["area", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_places",
            "description": "Search for restaurants, activities, or venues matching a query in an area.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "What kind of place, e.g. 'vegetarian restaurant' or 'pottery studio'",
                    },
                    "area": {"type": "string"},
                },
                "required": ["query", "area"],
            },
        },
    },
]

EVENTS_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "search_events",
        "description": "Search for concerts, shows, or sporting events in an area and date range.",
        "parameters": {
            "type": "object",
            "properties": {
                "area": {"type": "string"},
                "date_range": {
                    "type": "string",
                    "description": "YYYY-MM-DD, or YYYY-MM-DD..YYYY-MM-DD for a range",
                },
                "keywords": {"type": "string"},
            },
            "required": ["area", "date_range"],
        },
    },
}


def _active_tools() -> tuple[dict, list[dict]]:
    """Places and weather/geocode need no key; events needs one of
    TICKETMASTER_API_KEY / SEATGEEK_CLIENT_ID. Rather than advertise
    search_events and let it error on every call when neither is set, just
    don't offer it - a plan can be generated with places + weather alone."""
    functions = dict(BASE_TOOL_FUNCTIONS)
    schemas = list(BASE_TOOL_SCHEMAS)
    if TICKETMASTER_API_KEY or SEATGEEK_CLIENT_ID:
        functions["search_events"] = search_events
        schemas.append(EVENTS_TOOL_SCHEMA)
    return functions, schemas

CANDIDATE_SEARCH_SYSTEM_PROMPT = """You are gathering raw candidates for an outing by calling the \
available tools (geocode, get_weather, search_places, search_events). You do NOT write the final \
plan - another step does that from what you gather here.

Guidelines:
- Call search_places at least once with a query that fits the occasion.
- Call search_events if the occasion could plausibly involve one (concert, show, game).
- Call get_weather once for the given date and area.
- You have at most a handful of tool calls - don't call the same tool with the same arguments twice.
- When you have enough results (or have exhausted useful calls), respond with ONLY a JSON object, \
no markdown fences, matching:
  {"places": [{"name": ..., "address": ..., "rating": ..., "price_level": ..., "url": ..., "source": ...}], \
"events": [{"name": ..., "venue": ..., "date": ..., "url": ..., "source": ...}], \
"weather": {"date": ..., "temp_high_c": ..., "temp_low_c": ..., "precipitation_chance": ..., "weather_code": ...} or null}
- Only include places/events that actually came back from your tool calls. Never invent one.
- Omit fields you don't have rather than guessing a value.
"""


def _dispatch_tool(name: str, arguments_json: str, tool_functions: dict):
    fn = tool_functions.get(name)
    if fn is None:
        return {"error": f"Unknown tool '{name}'"}
    try:
        args = json.loads(arguments_json or "{}")
    except json.JSONDecodeError:
        return {"error": "Could not parse tool arguments as JSON"}
    try:
        return fn(**args)
    except Exception as exc:
        # Surfaced to the model as a tool result, not raised - lets Super
        # adapt (e.g. skip events if no events source is configured) instead
        # of the whole search failing over one tool's error.
        return {"error": str(exc)}


def run_candidate_search(
    *,
    occasion: str,
    date: str,
    area: str,
    budget: str | None = None,
    duration: str | None = None,
    keywords: str = "",
) -> CandidateSearchResult:
    client = get_client()
    if not SUPER_MODEL_ID:
        raise ValueError("No model ID configured for tier 'super'. Set SUPER_MODEL_ID in backend/.env.")

    user_context = json.dumps(
        {
            "occasion": occasion,
            "date": date,
            "area": area,
            "budget": budget,
            "duration": duration,
            "keywords": keywords,
        }
    )
    messages = [
        {"role": "system", "content": CANDIDATE_SEARCH_SYSTEM_PROMPT},
        {"role": "user", "content": user_context},
    ]
    tool_functions, tool_schemas = _active_tools()

    tool_calls_made = 0
    while tool_calls_made < MAX_TOOL_CALLS:
        response = client.chat.completions.create(
            model=SUPER_MODEL_ID,
            messages=messages,
            tools=tool_schemas,
            tool_choice="auto",
            temperature=0,
            max_tokens=COMPLETION_MAX_TOKENS,
        )
        message = response.choices[0].message

        if not message.tool_calls:
            return parse_structured_json(message.content, CandidateSearchResult)

        messages.append(
            {
                "role": "assistant",
                "content": message.content,
                "tool_calls": [tc.model_dump() for tc in message.tool_calls],
            }
        )
        for tc in message.tool_calls:
            tool_calls_made += 1
            result = _dispatch_tool(tc.function.name, tc.function.arguments, tool_functions)
            messages.append(
                {"role": "tool", "tool_call_id": tc.id, "content": json.dumps(result)}
            )
            if tool_calls_made >= MAX_TOOL_CALLS:
                break

    # Cap hit without a final answer - force one more call with no tools
    # allowed, using whatever's already been gathered.
    messages.append(
        {
            "role": "user",
            "content": "You've reached the tool-call limit. Respond now with the JSON candidate "
            "summary using only what you've already gathered.",
        }
    )
    response = client.chat.completions.create(
        model=SUPER_MODEL_ID,
        messages=messages,
        tool_choice="none",
        temperature=0,
        max_tokens=COMPLETION_MAX_TOKENS,
    )
    return parse_structured_json(response.choices[0].message.content, CandidateSearchResult)
