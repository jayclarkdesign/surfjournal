#!/usr/bin/env python3
"""
Validate surf spot coordinate integrity.

Checks:
1) Every spot in SPOTS_BY_COUNTRY has a coordinate entry.
2) No extra coordinates exist for unknown spots.
3) No duplicate spot names.
4) Latitude/longitude values are in valid numeric ranges.
5) Coordinates are inside rough country-level bounding boxes.

Bounding boxes are intentionally broad to avoid false positives while still
catching major errors (e.g., swapped signs, incorrect hemisphere, etc.).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONSTANTS_PATH = ROOT / "src" / "constants.ts"
COORDS_PATH = ROOT / "src" / "spotCoords.ts"


# lat_min, lat_max, lng_min, lng_max
COUNTRY_BOUNDS: dict[str, tuple[float, float, float, float]] = {
    "Sri Lanka": (5.0, 11.0, 79.0, 82.0),
    "Indonesia": (-12.0, 7.0, 94.0, 142.0),
    "Japan": (24.0, 46.5, 122.0, 146.5),
    "Philippines": (4.0, 22.0, 116.0, 127.5),
    "Maldives": (-1.5, 8.5, 72.0, 74.5),
    "Taiwan": (21.0, 26.5, 119.0, 123.5),
    "Australia": (-44.5, -9.0, 112.0, 154.5),
    "New Zealand": (-48.0, -33.0, 166.0, 179.9),
    "Fiji": (-22.0, -12.0, 176.0, 180.0),
    "Tahiti / French Polynesia": (-28.0, -6.0, -160.0, -132.0),
    "United States": (17.0, 72.0, -179.9, -64.0),
    "Canada": (41.0, 84.0, -142.0, -52.0),
    "Mexico": (14.0, 33.5, -118.5, -86.0),
    "Costa Rica": (8.0, 12.0, -86.5, -82.0),
    "Nicaragua": (10.0, 16.0, -88.5, -82.0),
    "El Salvador": (12.5, 14.6, -90.5, -87.5),
    "Panama": (7.0, 10.2, -83.2, -77.0),
    "Peru": (-19.0, -2.0, -82.0, -68.0),
    "Chile": (-56.0, -17.0, -76.0, -66.0),
    "Ecuador": (-5.5, 2.5, -92.5, -75.0),
    "Brazil": (-34.5, 6.5, -74.5, -32.0),
    "Portugal": (29.0, 43.0, -34.0, -6.0),
    "Spain": (27.0, 44.5, -19.0, 5.0),
    "France": (41.0, 52.0, -6.0, 10.0),
    "Ireland": (51.0, 56.0, -11.5, -5.0),
    "United Kingdom": (49.0, 61.5, -8.8, 2.5),
    "Italy": (35.0, 47.5, 6.0, 19.0),
    "Norway": (57.0, 72.5, 4.0, 32.0),
    "Iceland": (63.0, 67.5, -25.5, -12.0),
    "South Africa": (-35.5, -21.0, 16.0, 33.5),
    "Morocco": (21.0, 36.5, -13.5, -1.0),
    "Namibia": (-29.0, -16.0, 11.0, 26.0),
    "Senegal": (12.0, 17.5, -18.5, -11.0),
    "Papua New Guinea": (-12.0, 2.0, 140.0, 156.0),
    "India": (6.0, 38.0, 67.0, 98.0),
    "Barbados": (12.8, 13.5, -59.8, -59.3),
    "Dominican Republic": (17.0, 20.2, -72.2, -68.0),
    "Argentina": (-56.0, -21.0, -74.0, -53.0),
    "Uruguay": (-35.5, -30.0, -58.7, -53.0),
    "Colombia": (-5.0, 14.0, -82.5, -66.0),
    "Guatemala": (13.0, 18.5, -93.0, -88.0),
    "Mozambique": (-27.5, -10.0, 30.0, 41.0),
    "Mauritius": (-21.5, -19.0, 56.0, 58.5),
    "Reunion": (-22.0, -20.5, 54.8, 56.0),
    "Israel": (29.0, 34.0, 34.0, 36.2),
    "Thailand": (5.0, 21.0, 97.0, 106.0),
}


COUNTRY_START_RE = re.compile(r"^\s{2}['\"](.+?)['\"]:\s*\[\s*$")
SPOT_LINE_RE = re.compile(r"^\s{4}(['\"])(.*)\1,\s*$")
COORD_LINE_RE = re.compile(
    r"^\s{2}(['\"])(.*)\1:\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\],\s*$"
)


def parse_spots_by_country(text: str) -> tuple[dict[str, list[str]], list[str]]:
    in_obj = False
    current_country: str | None = None
    spots_by_country: dict[str, list[str]] = {}
    duplicates: list[str] = []
    seen: set[str] = set()

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if "export const SPOTS_BY_COUNTRY" in line:
            in_obj = True
            continue
        if in_obj and line.strip() == "};":
            break
        if not in_obj:
            continue

        country_match = COUNTRY_START_RE.match(line)
        if country_match:
            current_country = country_match.group(1)
            spots_by_country[current_country] = []
            continue

        if current_country is None:
            continue

        spot_match = SPOT_LINE_RE.match(line)
        if not spot_match:
            continue

        spot = spot_match.group(2).replace("\\'", "'").replace('\\"', '"')
        spots_by_country[current_country].append(spot)
        if spot in seen:
            duplicates.append(spot)
        seen.add(spot)

    return spots_by_country, duplicates


def parse_coords(text: str) -> dict[str, tuple[float, float]]:
    in_obj = False
    coords: dict[str, tuple[float, float]] = {}
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if "const SPOT_COORDS" in line:
            in_obj = True
            continue
        if in_obj and line.strip() == "};":
            break
        if not in_obj:
            continue

        match = COORD_LINE_RE.match(line)
        if not match:
            continue
        key = match.group(2).replace("\\'", "'").replace('\\"', '"')
        lat = float(match.group(3))
        lng = float(match.group(4))
        coords[key] = (lat, lng)
    return coords


def in_bounds(country: str, lat: float, lng: float) -> bool:
    bounds = COUNTRY_BOUNDS.get(country)
    if bounds is None:
        return True
    lat_min, lat_max, lng_min, lng_max = bounds
    return lat_min <= lat <= lat_max and lng_min <= lng <= lng_max


def main() -> int:
    constants_text = CONSTANTS_PATH.read_text(encoding="utf-8")
    coords_text = COORDS_PATH.read_text(encoding="utf-8")

    spots_by_country, duplicate_spots = parse_spots_by_country(constants_text)
    coords = parse_coords(coords_text)

    all_spots = [spot for spots in spots_by_country.values() for spot in spots]
    all_spot_set = set(all_spots)
    coord_set = set(coords.keys())

    missing_coords = sorted(all_spot_set - coord_set)
    unknown_coords = sorted(coord_set - all_spot_set)

    out_of_range: list[tuple[str, float, float]] = []
    out_of_bounds: list[tuple[str, str, float, float]] = []

    for country, spots in spots_by_country.items():
        for spot in spots:
            lat_lng = coords.get(spot)
            if lat_lng is None:
                continue
            lat, lng = lat_lng
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                out_of_range.append((spot, lat, lng))
            if not in_bounds(country, lat, lng):
                out_of_bounds.append((country, spot, lat, lng))

    print(f"Countries: {len(spots_by_country)}")
    print(f"Spots: {len(all_spot_set)}")
    print(f"Coords: {len(coords)}")
    print(f"Duplicate spot names: {len(duplicate_spots)}")
    print(f"Missing coords: {len(missing_coords)}")
    print(f"Unknown coords: {len(unknown_coords)}")
    print(f"Out-of-range coords: {len(out_of_range)}")
    print(f"Out-of-country-bound coords: {len(out_of_bounds)}")

    if duplicate_spots:
        print("\nDuplicate spot names:")
        for spot in sorted(set(duplicate_spots)):
            print(f"  - {spot}")

    if missing_coords:
        print("\nSpots missing coordinates:")
        for spot in missing_coords:
            print(f"  - {spot}")

    if unknown_coords:
        print("\nCoordinate keys not present in SPOTS_BY_COUNTRY:")
        for spot in unknown_coords:
            print(f"  - {spot}")

    if out_of_range:
        print("\nOut-of-range coordinates:")
        for spot, lat, lng in out_of_range:
            print(f"  - {spot}: [{lat}, {lng}]")

    if out_of_bounds:
        print("\nOut-of-country-bound coordinates:")
        for country, spot, lat, lng in out_of_bounds:
            print(f"  - {country} / {spot}: [{lat}, {lng}]")

    has_errors = bool(
        duplicate_spots or missing_coords or unknown_coords or out_of_range or out_of_bounds
    )
    return 1 if has_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
