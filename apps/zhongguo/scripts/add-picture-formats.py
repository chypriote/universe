#!/usr/bin/env python3
"""Add format (16:9 or 9:16) to every picture object in itinerary JSON files."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ITINERARIES_DIR = ROOT / "itineraries"


def detect_format(url: str) -> str:
    path = ROOT / url
    if not path.is_file():
        # Remote/example URLs — default to landscape.
        return "16:9"
    with Image.open(path) as img:
        width, height = img.size
    return "16:9" if width >= height else "9:16"


def add_format_to_pictures(pictures: list) -> int:
    updated = 0
    for picture in pictures:
        if not isinstance(picture, dict) or "url" not in picture:
            continue
        picture["format"] = detect_format(picture["url"])
        updated += 1
    return updated


def walk(node) -> int:
    updated = 0
    if isinstance(node, dict):
        if "pictures" in node and isinstance(node["pictures"], list):
            pictures = node["pictures"]
            if pictures and isinstance(pictures[0], dict):
                updated += add_format_to_pictures(pictures)
        for value in node.values():
            updated += walk(value)
    elif isinstance(node, list):
        for item in node:
            updated += walk(item)
    return updated


def main() -> None:
    files = sorted(ITINERARIES_DIR.glob("*.json"))
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        # example_itinerary wraps under "itinerary"
        root = data["itinerary"] if "itinerary" in data else data
        count = walk(root)
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"{path.name}: updated {count} pictures")


if __name__ == "__main__":
    main()
