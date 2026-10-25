import os

from dotenv import load_dotenv

load_dotenv()

NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY", "")
NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.studio.nebius.com/v1")

NANO_MODEL_ID = os.getenv("NANO_MODEL_ID", "")
SUPER_MODEL_ID = os.getenv("SUPER_MODEL_ID", "nvidia/nemotron-3-super120b-a12b")
ULTRA_MODEL_ID = os.getenv("ULTRA_MODEL_ID", "")
