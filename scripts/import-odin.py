"""Rebuild the equipment research catalog from pinned public ODIN CSV exports.

Python standard library only. This does not fetch network data or infer combat values.
Raw CSVs remain in gitignored data/odin; source manifests retain hashes and UI filters.
"""
from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "catalog"
UNKNOWN = {"", "-", "ina", "n/a", "unknown", "unk", "not available", "no data", "tbd"}
IDENTITY = {"name", "identifier", "dateOfIntroduction", "origin", "proliferation", "domain", "disname", "disstring"}


def is_unknown(value: str) -> bool:
    return value.strip().lower() in UNKNOWN


def classify(name: str, domain: str) -> tuple[str, str]:
    """Candidate classification only; never silently enables a piece for play."""
    n = name.lower()
    if any(x in domain for x in ("Infantry Weapons", "Aircraft Armament", "Ballistic Missiles", "Cruise Missiles", "Communication Equipment", "Land Based Sensors")):
        return "part", "equipment"
    if "Aircraft" in domain:
        return "platform", "rotary-wing" if any(x in n for x in ("helicopter", "tiltrotor")) else "fixed-wing"
    if domain.startswith("Sea"):
        return "platform", "submarine" if "submarine" in n else "surface-vessel"
    if any(x in n for x in ("towed", "trailer")):
        return "platform", "towed"
    if any(x in domain for x in ("Radar Systems", "Electronic Warfare", "CBRN")) and not any(x in n for x in ("vehicle", "truck", "4x4", "6x6", "8x8", "tracked")):
        return "part", "equipment"
    if "Engineer Systems" in domain and not any(x in n for x in ("vehicle", "truck", "carrier", "tank", "bulldozer", "excavator", "4x4", "6x6", "8x8", "tractor")):
        return "part", "equipment"
    if "Unmanned Ground Vehicles" in domain:
        return "platform", "ground-robot"
    if any(x in n for x in ("8x8", "6x6", "4x4", "10x10", "wheeled", "stryker", "truck", "hmmwv")):
        return "platform", "wheeled"
    if any(x in n for x in ("tank", "tracked", "bradley", "aav", "m113", "zbd", "wz-501", "self-propelled")):
        return "platform", "tracked"
    return "platform", "review-required"


def build() -> None:
    manifests = json.loads((CATALOG / "sources.json").read_text())
    merged: dict[str, dict] = {}
    for source in manifests:
        path = ROOT / source["localFile"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError(f"Source hash mismatch: {path}")
        with path.open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            if len(set(reader.fieldnames or [])) != len(reader.fieldnames or []):
                raise ValueError(f"Duplicate CSV headers in {path}")
            rows = list(reader)
        if len(rows) != source["rowCount"]:
            raise ValueError(f"Source row count mismatch: {path}")
        seen = set()
        for line, row in enumerate(rows, 2):
            key = row["identifier"].strip()
            if not key or key in seen:
                raise ValueError(f"Missing/duplicate equipment ID in {path}:{line}")
            seen.add(key)
            record = merged.setdefault(key, {"row": row, "sources": [], "conflicts": []})
            record["sources"].append({"exportId": source["id"], "recordNumber": line})
            for field, value in row.items():
                previous = record["row"].get(field)
                if previous is None or previous == "-":
                    record["row"][field] = value
                elif value not in (previous, "-", ""):
                    record["conflicts"].append({"field": field, "exportId": source["id"], "value": value})

    equipment = []
    for key, item in sorted(merged.items()):
        row = item["row"]
        source_ids = {x["exportId"] for x in item["sources"]}
        memberships = []
        for force, prefix in (("red", "china"), ("blue", "us")):
            if prefix + "-operator" in source_ids:
                memberships.append({"force": force, "basis": "odin-operator-filter", "sourceId": prefix + "-operator"})
            elif prefix + "-origin" in source_ids:
                memberships.append({"force": force, "basis": "origin-only-needs-operator-review", "sourceId": prefix + "-origin"})
        introduced = row["dateOfIntroduction"].strip()
        year = int(introduced) if introduced.isdigit() and 1800 <= int(introduced) <= 2100 else None
        kind, mobility = classify(row["name"], row["domain"])
        fields = {}
        omitted = []
        for field, value in row.items():
            if field in IDENTITY or value == "-" or not value.strip():
                continue
            # Retain bounded factual fields. Narrative paragraphs/images are not republished.
            if not field or "note" in field.lower() or "image" in field.lower() or len(value) > 300:
                omitted.append(field)
                continue
            fields[field] = {"raw": value, "value": None if is_unknown(value) else value}
        equipment.append({
            "id": "odin-" + key,
            "name": row["name"],
            "sourceUrl": "https://odin.t2com.army.mil/WEG/Asset/" + key,
            "origin": None if is_unknown(row["origin"]) else row["origin"],
            "operatorText": None if is_unknown(row["proliferation"]) else row["proliferation"],
            "memberships": memberships,
            "domain": row["domain"].split(" > ")[0].lower(),
            "taxonomy": row["domain"].split(" > "),
            "introduced": {"raw": introduced, "reportedYear": year, "basis": "ODIN dateOfIntroduction; not an operator-specific service date"},
            "eraStatus": "unknown-date" if year is None else "legacy-service-review" if year < 1980 else "introduced-1980-onward" if year <= 2026 else "future-date-review",
            "candidateKind": kind,
            "candidateMobility": mobility,
            "sourceFields": fields,
            "sources": item["sources"],
            "conflicts": item["conflicts"],
            "omittedNarrativeFields": sorted(omitted),
            "reviewStatus": "imported-unreviewed",
        })
    payload = {"version": "odin-catalog/0.1.0", "accessed": "2026-09-15", "scope": {"red": "China", "blue": "United States", "periodStart": 1980}, "equipment": equipment}
    (CATALOG / "equipment.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    report = {
        "uniqueEquipment": len(equipment),
        "sourceRows": {s["id"]: s["rowCount"] for s in manifests},
        "domains": dict(Counter(e["domain"] for e in equipment)),
        "candidateKinds": dict(Counter(e["candidateKind"] for e in equipment)),
        "eraStatus": dict(Counter(e["eraStatus"] for e in equipment)),
        "membershipEvidence": dict(Counter(m["force"] + ":" + m["basis"] for e in equipment for m in e["memberships"])),
        "recordsWithExportConflicts": sum(bool(e["conflicts"]) for e in equipment),
        "note": "Import coverage, not independent verification, a current order of battle, or a count of playable definitions. Source field grouping is lost by ODIN's flat CSV export; review before using quantities in rules.",
    }
    (CATALOG / "coverage.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    build()
