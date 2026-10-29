import os

from dotenv import load_dotenv

load_dotenv()

NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY", "")
NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.studio.nebius.com/v1")

NANO_MODEL_ID = os.getenv("NANO_MODEL_ID", "")
SUPER_MODEL_ID = os.getenv("SUPER_MODEL_ID", "nvidia/nemotron-3-super-120b-a12b")
ULTRA_MODEL_ID = os.getenv("ULTRA_MODEL_ID", "")

# External tool sources. Places and geocode/weather have keyless fallbacks;
# events has none, so search_events needs one of the two keys below.
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY", "")
SEATGEEK_CLIENT_ID = os.getenv("SEATGEEK_CLIENT_ID", "")
