"""
Healthcheck entrypoint for the MS4 daemon container.

Marks the daemon healthy only when cache is readable and contains
at least one wilaya prediction payload.
"""

import json
import os
import sys


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_PATH = os.path.join(BASE_DIR, "data", "cache", "radar_cache.json")


def main() -> int:
    if not os.path.exists(CACHE_PATH):
        return 1

    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception:
        return 1

    if not isinstance(payload, dict):
        return 1

    timestamp = payload.get("timestamp")
    wilayats = payload.get("wilayats")

    if not timestamp:
        return 1

    if not isinstance(wilayats, dict) or len(wilayats) == 0:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
