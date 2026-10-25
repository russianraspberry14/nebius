"""Day 1 checklist item: one test call to each Nemotron tier (Nano, Super, Ultra).

Usage:
    cd backend
    python -m scripts.smoke_test_nemotron

Requires NEBIUS_API_KEY and the three *_MODEL_ID vars set in backend/.env
(copy from .env.example). Confirm exact model IDs in the Token Factory
console for Nano and Ultra; Super's ID is already in the spec.
"""

import sys
import time

sys.path.insert(0, ".")

from app.nemotron import TIER_MODELS, call_tier  # noqa: E402

PROMPT = "Reply with exactly one short sentence confirming you received this test call."


def run():
    print("Kindred Nemotron smoke test\n" + "-" * 40)
    results = {}
    for tier in ("nano", "super", "ultra"):
        model_id = TIER_MODELS[tier]
        if not model_id:
            print(f"[{tier:5}] SKIPPED - no model ID set (check backend/.env)")
            results[tier] = False
            continue

        print(f"[{tier:5}] model={model_id} ... ", end="", flush=True)
        start = time.perf_counter()
        try:
            reply = call_tier(tier, PROMPT, max_tokens=64)
            elapsed = time.perf_counter() - start
            print(f"OK ({elapsed:.2f}s)\n        -> {reply!r}")
            results[tier] = True
        except Exception as exc:
            elapsed = time.perf_counter() - start
            print(f"FAILED ({elapsed:.2f}s)\n        -> {exc}")
            results[tier] = False

    print("-" * 40)
    ok = sum(results.values())
    print(f"{ok}/3 tiers responded successfully.")
    if ok < 3:
        sys.exit(1)


if __name__ == "__main__":
    run()
