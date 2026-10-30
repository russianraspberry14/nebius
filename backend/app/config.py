import os

from dotenv import load_dotenv

load_dotenv()

NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY", "")
NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.studio.nebius.com/v1")

# Auth. JWT_SECRET must be set in production - the dev default is fine for
# running locally but signs tokens anyone reading this file could forge.
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = 60 * 24 * 14  # 14 days - this is a personal notebook app, not a bank

NANO_MODEL_ID = os.getenv("NANO_MODEL_ID", "")
SUPER_MODEL_ID = os.getenv("SUPER_MODEL_ID", "nvidia/nemotron-3-super-120b-a12b")
ULTRA_MODEL_ID = os.getenv("ULTRA_MODEL_ID", "")

# External tool sources. Places and geocode/weather have keyless fallbacks;
# events has none, so search_events needs one of the two keys below.
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY", "")
SEATGEEK_CLIENT_ID = os.getenv("SEATGEEK_CLIENT_ID", "")

# Comma-separated list of origins allowed to call this API (CORS). Defaults
# to local dev; set to the deployed frontend's origin(s) in production.
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()
]
