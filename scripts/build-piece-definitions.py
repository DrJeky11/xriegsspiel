"""Derive explicitly authored laboratory definitions; never convert source specs to game stats."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "catalog"


def profile(e):
    name = e["name"].lower()
    taxonomy = " > ".join(e["taxonomy"])
    candidate = e["candidateMobility"]
    if e['domain'] == 'air' and 'aircraft' in name and 'Air Based Electronic' in taxonomy:
        return 'fixed-wing'
    if 'Engineer Systems' in taxonomy and any(s in name for s in ('loader','crane','earthmover','forklift','container handler','roller','trench-digging','trench digging','bridgelayer','self-propelled','armored mine dispenser','10x10')):
        return 'tracked' if 'tracked' in name else 'ground-system'
    if "Man-Portable Air-Defense" in taxonomy or "Command and Control Information" in taxonomy:
        return "equipment"
    if candidate == "equipment":
        return "equipment"
    if candidate == "review-required":
        candidate = "ground-system"
    if "Air > Aircraft" in taxonomy and any(x in name for x in ("transport", "cargo", "airlift")):
        return "air-transport"
    if e["domain"] == "sea" and any(x in name for x in ("landing craft", "landing ship", "amphibious")):
        # Ship classes cannot beach like landing craft. Only the latter get a shore cell.
        return "landing-craft" if "landing craft" in name else "sea-transport"
    if e["domain"] == "sea" and any(x in name for x in ("replenishment", "oiler", "stores", "cargo", "support ship")):
        return "sea-transport"
    if e["domain"] == "land" and "truck" in name and any(x in name for x in ("cargo", "transport", "load handling")):
        return "truck"
    if "amphibious" in name and candidate in ("tracked", "wheeled"):
        return "amphibious-" + candidate
    return candidate


def build():
    catalog = json.loads((OUT / "equipment.json").read_text())
    rules = json.loads((OUT / "rules.json").read_text())
    known = {p["id"] for p in rules["profiles"]}
    notes = json.loads((OUT / "quality-notes.json").read_text())
    flagged = {n["equipmentId"]: n["status"] for n in notes["records"]}
    pieces = []
    for e in catalog["equipment"]:
        p = profile(e)
        assert p in known, (e["name"], p)
        pieces.append({
            "id": "piece-" + e["id"][5:], "equipmentId": e["id"], "name": e["name"],
            "rulesVersion": rules["version"], "profileId": p,
            "kind": "part" if p == "equipment" else "platform",
            "pieceScale": "one equipment item" if p == "equipment" else "one platform",
            "loadSlots": 1 if p == "equipment" else 4,
            "forceEvidence": e["memberships"],
            "eraEvidence": e["introduced"], "eraStatus": e["eraStatus"],
            "definitionStatus": "authored-laboratory",
            "historicalServiceStatus": "unverified",
            "profileBasis": "Authored class-level game abstraction selected from the source title/taxonomy; not measured equipment performance.",
            "reviewFlag": flagged.get(e["id"]),
        })
    result = {"version": "pieces/0.1.0", "equipmentVersion": catalog["version"], "rulesVersion": rules["version"], "pieces": pieces}
    (OUT / "pieces.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"definitions": len(pieces), "kinds": dict(Counter(p["kind"] for p in pieces)), "profiles": dict(Counter(p["profileId"] for p in pieces)), "scope": "Executable laboratory definitions; historical service and combat capabilities are not certified."}, indent=2))


if __name__ == "__main__":
    build()
