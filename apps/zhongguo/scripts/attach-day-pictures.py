#!/usr/bin/env python3
"""Attach day-level pictures from PHOTOS_DIR into itinerary JSON files."""

from __future__ import annotations

import json
import os
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ITINERARIES_DIR = ROOT / "itineraries"
TRIPS_DIR = Path(os.environ["PHOTOS_DIR"])
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def parse_photo_date(filename: str) -> str | None:
    name = Path(filename).name

    # 2025-03-29-09-02.jpg or 2025-12-03 -10-05.jpg
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})\s*-\d{2}-\d{2}", name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    m = re.match(r"^IMG_(\d{4})(\d{2})(\d{2})", name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    m = re.match(r"^IMG(\d{4})(\d{2})(\d{2})\d{6}", name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    m = re.match(r"^mmexport(\d{10,13})", name)
    if m:
        raw = m.group(1)
        ms = int(raw) * 1000 if len(raw) <= 10 else int(raw)
        d = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        return d.strftime("%Y-%m-%d")

    return None


def parse_photo_taken_at(filename: str) -> float | None:
    name = Path(filename).name

    m = re.match(
        r"^(\d{4})-(\d{2})-(\d{2})\s*-(\d{2})-(\d{2})(?:\.\w+)?$",
        name,
    )
    if m:
        y, mo, d, h, mi = map(int, m.groups())
        return datetime(y, mo, d, h, mi, tzinfo=timezone.utc).timestamp()

    m = re.match(r"^IMG_(\d{4})(\d{2})(\d{2})(?:_(\d{2})(\d{2})(\d{2}))?", name)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        h = int(m.group(4) or 0)
        mi = int(m.group(5) or 0)
        s = int(m.group(6) or 0)
        return datetime(y, mo, d, h, mi, s, tzinfo=timezone.utc).timestamp()

    m = re.match(r"^IMG(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", name)
    if m:
        y, mo, d, h, mi, s = map(int, m.groups())
        return datetime(y, mo, d, h, mi, s, tzinfo=timezone.utc).timestamp()

    m = re.match(r"^mmexport(\d{10,13})", name)
    if m:
        raw = m.group(1)
        return (int(raw) * 1000 if len(raw) <= 10 else int(raw)) / 1000

    return None


def caption_from_filename(filename: str) -> str:
    name = Path(filename).stem

    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})\s*-(\d{2})-(\d{2})", name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)} {m.group(4)}:{m.group(5)}"

    m = re.match(r"^IMG_(\d{4})(\d{2})(\d{2})(?:_(\d{2})(\d{2})(\d{2}))?", name)
    if m:
        y, mo, d = m.group(1), m.group(2), m.group(3)
        if m.group(4) is not None:
            return f"{y}-{mo}-{d} {m.group(4)}:{m.group(5)}"
        return f"{y}-{mo}-{d}"

    m = re.match(r"^IMG(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)} {m.group(4)}:{m.group(5)}"

    return name


def get_day_date(start_date: str, day_number: int) -> str:
    y, m, d = map(int, start_date.split("-"))
    dt = date(y, m, d) + timedelta(days=day_number - 1)
    return dt.isoformat()


def load_photos_by_date(slug: str) -> tuple[dict[str, list[str]], int, int]:
    directory = TRIPS_DIR / slug
    files = [f.name for f in directory.iterdir() if f.suffix.lower() in IMAGE_EXT]
    by_date: dict[str, list[str]] = defaultdict(list)
    undated = 0

    for file in files:
        photo_date = parse_photo_date(file)
        if not photo_date:
            undated += 1
            continue
        by_date[photo_date].append(file)

    for photo_list in by_date.values():
        photo_list.sort(
            key=lambda f: (
                parse_photo_taken_at(f) is None,
                parse_photo_taken_at(f) or 0,
                f,
            )
        )

    return by_date, len(files), undated


def detect_format(path: Path) -> str:
    with Image.open(path) as img:
        width, height = img.size
    return "16:9" if width >= height else "9:16"


def to_picture(slug: str, filename: str) -> dict[str, str]:
    path = TRIPS_DIR / slug / filename
    return {
        "url": f"src/assets/trips/{slug}/{filename}",
        "caption": caption_from_filename(filename),
        "format": detect_format(path),
    }


def main() -> None:
    files = sorted(
        f
        for f in ITINERARIES_DIR.glob("*.json")
        if f.name != "example_itinerary.json"
    )

    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        slug = data["slug"]
        start_date = data["released_itinerary"]["start_date"]
        by_date, total, undated = load_photos_by_date(slug)

        assigned = 0
        days_with_pics = 0

        rebuilt_days = []
        for day in data["days"]:
            day_date = get_day_date(start_date, day["day_number"])
            filenames = by_date.get(day_date, [])
            pictures = [to_picture(slug, f) for f in filenames]
            assigned += len(pictures)
            if pictures:
                days_with_pics += 1

            # Keep a stable field order with pictures on the day object.
            rebuilt_days.append(
                {
                    "day_number": day["day_number"],
                    "main_city": day["main_city"],
                    "title": day["title"],
                    "notes": day["notes"],
                    "pictures": pictures,
                    "attractions": day.get("attractions", []),
                    "train_trips": day.get("train_trips", []),
                }
            )
        data["days"] = rebuilt_days

        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(
            f"{path.name}: {days_with_pics}/{len(data['days'])} days with pictures, "
            f"{assigned}/{total} photos assigned ({undated} undated skipped)"
        )


if __name__ == "__main__":
    main()
