"""search_events(area, date_range, keywords) -> candidate events.

No keyless source exists for this one (spec notes both options need a free
key) - set TICKETMASTER_API_KEY or SEATGEEK_CLIENT_ID in backend/.env.
"""

import httpx

from app.config import SEATGEEK_CLIENT_ID, TICKETMASTER_API_KEY
from app.tools.cache import cached

TICKETMASTER_URL = "https://app.ticketmaster.com/discovery/v2/events.json"
SEATGEEK_URL = "https://api.seatgeek.com/2/events"


def _split_range(date_range: str) -> tuple[str, str]:
    if ".." in date_range:
        start, end = date_range.split("..", 1)
        return start, end
    return date_range, date_range


def _search_events_ticketmaster(area: str, date_range: str, keywords: str) -> list[dict]:
    start, end = _split_range(date_range)
    resp = httpx.get(
        TICKETMASTER_URL,
        params={
            "apikey": TICKETMASTER_API_KEY,
            "city": area,
            "keyword": keywords,
            "startDateTime": f"{start}T00:00:00Z",
            "endDateTime": f"{end}T23:59:59Z",
            "size": 10,
        },
        timeout=10,
    )
    resp.raise_for_status()
    events = resp.json().get("_embedded", {}).get("events", [])
    return [
        {
            "name": e.get("name"),
            "venue": (e.get("_embedded", {}).get("venues") or [{}])[0].get("name"),
            "date": e.get("dates", {}).get("start", {}).get("localDate"),
            "url": e.get("url"),
            "source": "ticketmaster",
        }
        for e in events
    ]


def _search_events_seatgeek(area: str, date_range: str, keywords: str) -> list[dict]:
    start, end = _split_range(date_range)
    resp = httpx.get(
        SEATGEEK_URL,
        params={
            "client_id": SEATGEEK_CLIENT_ID,
            "venue.city": area,
            "q": keywords,
            "datetime_local.gte": start,
            "datetime_local.lte": end,
            "per_page": 10,
        },
        timeout=10,
    )
    resp.raise_for_status()
    events = resp.json().get("events", [])
    return [
        {
            "name": e.get("title"),
            "venue": (e.get("venue") or {}).get("name"),
            "date": (e.get("datetime_local") or "")[:10],
            "url": e.get("url"),
            "source": "seatgeek",
        }
        for e in events
    ]


@cached("search_events")
def search_events(area: str, date_range: str, keywords: str = "") -> list[dict]:
    if TICKETMASTER_API_KEY:
        return _search_events_ticketmaster(area=area, date_range=date_range, keywords=keywords)
    if SEATGEEK_CLIENT_ID:
        return _search_events_seatgeek(area=area, date_range=date_range, keywords=keywords)
    raise ValueError(
        "No events source configured. Set TICKETMASTER_API_KEY or SEATGEEK_CLIENT_ID in backend/.env."
    )
