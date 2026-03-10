#!/usr/bin/env python3
"""
Refine existing spot coordinates using OpenStreetMap Nominatim.

Safety rules:
- Only updates spots from selected countries.
- Only accepts matches where Nominatim country code matches expected country.
- Only accepts candidates within a max distance from existing coords.
- Keeps original coords when confidence is low.

Usage:
  python3 scripts/refine_spot_coords_nominatim.py --countries "India,Barbados" --apply
  python3 scripts/refine_spot_coords_nominatim.py --countries "India" --max-distance-km 120
"""

from __future__ import annotations

import argparse
import json
import math
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONSTANTS_PATH = ROOT / "src" / "constants.ts"
COORDS_PATH = ROOT / "src" / "spotCoords.ts"
CACHE_PATH = ROOT / "scripts" / ".nominatim_cache.json"

USER_AGENT = "surf-journal-coord-refiner/1.0 (local-dev)"


COUNTRY_TO_ISO2 = {
    "Sri Lanka": "lk",
    "Australia": "au",
    "Indonesia": "id",
    "United States": "us",
    "Portugal": "pt",
    "Brazil": "br",
    "South Africa": "za",
    "France": "fr",
    "Spain": "es",
    "Mexico": "mx",
    "Costa Rica": "cr",
    "India": "in",
    "Barbados": "bb",
    "Dominican Republic": "do",
    "Argentina": "ar",
    "Uruguay": "uy",
    "Colombia": "co",
    "Guatemala": "gt",
    "Mozambique": "mz",
    "Mauritius": "mu",
    "Reunion": "re",
    "Israel": "il",
    "Thailand": "th",
}


COUNTRY_RE = re.compile(r"^\s{2}['\"](.+?)['\"]:\s*\[\s*$")
SPOT_RE = re.compile(r"^\s{4}(['\"])(.*)\1,\s*$")
COORD_RE = re.compile(
    r"^(\s{2})(['\"])(.*)\2:\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\],\s*$"
)


@dataclass
class Candidate:
    lat: float
    lng: float
    display_name: str
    country_code: str


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def parse_spots_by_country(text: str) -> dict[str, list[str]]:
    in_obj = False
    current_country: str | None = None
    out: dict[str, list[str]] = {}
    for raw in text.splitlines():
        line = raw.rstrip()
        if "export const SPOTS_BY_COUNTRY" in line:
            in_obj = True
            continue
        if in_obj and line.strip() == "};":
            break
        if not in_obj:
            continue
        cm = COUNTRY_RE.match(line)
        if cm:
            current_country = cm.group(1)
            out[current_country] = []
            continue
        if current_country is None:
            continue
        sm = SPOT_RE.match(line)
        if sm:
            spot = sm.group(2).replace("\\'", "'").replace('\\"', '"')
            out[current_country].append(spot)
    return out


def parse_coords(text: str) -> dict[str, tuple[float, float]]:
    in_obj = False
    out: dict[str, tuple[float, float]] = {}
    for raw in text.splitlines():
        line = raw.rstrip()
        if "const SPOT_COORDS" in line:
            in_obj = True
            continue
        if in_obj and line.strip() == "};":
            break
        if not in_obj:
            continue
        m = COORD_RE.match(line)
        if m:
            key = m.group(3).replace("\\'", "'").replace('\\"', '"')
            out[key] = (float(m.group(4)), float(m.group(5)))
    return out


def clean_spot_name(spot: str) -> str:
    # Keep parenthetical info because many spots need it, but strip "various".
    return spot.replace("(various)", "").strip()


def load_cache() -> dict[str, dict]:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, dict]) -> None:
    CACHE_PATH.write_text(json.dumps(cache, indent=2, sort_keys=True), encoding="utf-8")


def nominatim_search(query: str, country_code: str, cache: dict[str, dict]) -> Candidate | None:
    cache_key = f"{country_code}|{query}"
    if cache_key in cache:
        payload = cache[cache_key]
    else:
        params = urllib.parse.urlencode(
            {
                "q": query,
                "format": "jsonv2",
                "limit": 5,
                "countrycodes": country_code,
                "addressdetails": 1,
            }
        )
        url = f"https://nominatim.openstreetmap.org/search?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

        # Back off on transient network/rate-limit failures.
        payload = None
        backoff_seconds = [2.0, 5.0, 10.0, 20.0]
        for attempt, sleep_s in enumerate(backoff_seconds, start=1):
            try:
                with urllib.request.urlopen(req, timeout=20) as res:
                    payload = json.loads(res.read().decode("utf-8"))
                break
            except urllib.error.HTTPError as exc:
                if exc.code == 429 and attempt < len(backoff_seconds):
                    time.sleep(sleep_s)
                    continue
                if exc.code == 429:
                    payload = []
                    break
                raise
            except urllib.error.URLError:
                if attempt < len(backoff_seconds):
                    time.sleep(sleep_s)
                    continue
                payload = []
                break

        if payload is None:
            payload = []
        cache[cache_key] = payload
        save_cache(cache)  # Persist progress so long runs can resume.
        time.sleep(1.2)  # Respect public Nominatim usage.

    if not payload:
        return None

    for row in payload:
        addr = row.get("address", {})
        cc = (addr.get("country_code") or "").lower()
        if cc != country_code:
            continue
        return Candidate(
            lat=float(row["lat"]),
            lng=float(row["lon"]),
            display_name=row.get("display_name", ""),
            country_code=cc,
        )
    return None


def replace_coords_file(
    original_text: str, updates: dict[str, tuple[float, float]]
) -> str:
    out_lines: list[str] = []
    for raw in original_text.splitlines():
        line = raw.rstrip("\n")
        m = COORD_RE.match(line.rstrip())
        if not m:
            out_lines.append(line)
            continue
        key = m.group(3).replace("\\'", "'").replace('\\"', '"')
        if key not in updates:
            out_lines.append(line)
            continue
        lat, lng = updates[key]
        quote = m.group(2)
        indent = m.group(1)
        key_escaped = key.replace("'", "\\'")
        out_lines.append(f"{indent}{quote}{key_escaped}{quote}: [{lat:.4f}, {lng:.4f}],")
    return "\n".join(out_lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--countries", required=True, help="Comma-separated country names")
    ap.add_argument("--max-distance-km", type=float, default=120.0)
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    target_countries = [c.strip() for c in args.countries.split(",") if c.strip()]
    constants_text = CONSTANTS_PATH.read_text(encoding="utf-8")
    coords_text = COORDS_PATH.read_text(encoding="utf-8")

    spots_by_country = parse_spots_by_country(constants_text)
    coords_map = parse_coords(coords_text)
    cache = load_cache()

    accepted: dict[str, tuple[float, float]] = {}
    reviewed = 0
    skipped = 0

    for country in target_countries:
        if country not in spots_by_country:
            print(f"[WARN] Country not found in constants: {country}")
            continue
        iso2 = COUNTRY_TO_ISO2.get(country)
        if not iso2:
            print(f"[WARN] Missing ISO mapping for country: {country}")
            continue
        for spot in spots_by_country[country]:
            reviewed += 1
            current = coords_map.get(spot)
            if not current:
                print(f"[SKIP] No current coords for {spot}")
                skipped += 1
                continue
            base_query = f"{clean_spot_name(spot)}, {country}"
            cand = nominatim_search(base_query, iso2, cache)
            if cand is None:
                # fallback without punctuation-heavy decorations
                fallback = re.sub(r"[()]", " ", clean_spot_name(spot))
                fallback = re.sub(r"\s+", " ", fallback).strip()
                cand = nominatim_search(f"{fallback}, {country}", iso2, cache)
            if cand is None:
                skipped += 1
                print(f"[SKIP] {country} / {spot} -> no candidate")
                continue
            dist = haversine_km(current[0], current[1], cand.lat, cand.lng)
            if dist <= args.max_distance_km:
                accepted[spot] = (cand.lat, cand.lng)
                print(f"[OK] {country} / {spot} -> {dist:.1f} km ({cand.display_name})")
            else:
                skipped += 1
                print(
                    f"[SKIP] {country} / {spot} -> {dist:.1f} km too far ({cand.display_name})"
                )

    save_cache(cache)

    print("\n---")
    print(f"Reviewed: {reviewed}")
    print(f"Accepted updates: {len(accepted)}")
    print(f"Skipped: {skipped}")

    if args.apply and accepted:
        updated_text = replace_coords_file(coords_text, accepted)
        COORDS_PATH.write_text(updated_text, encoding="utf-8")
        print(f"Applied updates to {COORDS_PATH}")
    elif args.apply:
        print("No updates applied.")
    else:
        print("Dry run only. Re-run with --apply to write changes.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
