"""Create a portable, queryable SQLite database from the canonical catalog JSON."""
import hashlib
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "catalog"


def build():
    catalog = json.loads((OUT / "equipment.json").read_text())
    sources = json.loads((OUT / "sources.json").read_text())
    quality = json.loads((OUT / "quality-notes.json").read_text())
    rules = json.loads((OUT / "rules.json").read_text())
    pieces = json.loads((OUT / "pieces.json").read_text())
    components = json.loads((OUT / "components.json").read_text())
    references = json.loads((OUT / 'references.json').read_text())
    # Build atomically so readers never see a half-written database.
    path = OUT / "equipment.sqlite.tmp"
    if path.exists():
        path.unlink()
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript("""
      CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE source_export(id TEXT PRIMARY KEY, url TEXT NOT NULL, accessed TEXT NOT NULL,
        filter_json TEXT NOT NULL, row_count INTEGER NOT NULL, sha256 TEXT NOT NULL, local_file TEXT NOT NULL);
      CREATE TABLE equipment(id TEXT PRIMARY KEY, name TEXT NOT NULL, source_url TEXT NOT NULL,
        origin TEXT, operator_text TEXT, domain TEXT NOT NULL, taxonomy_json TEXT NOT NULL,
        introduced_raw TEXT NOT NULL, reported_introduction_year INTEGER, era_status TEXT NOT NULL,
        candidate_kind TEXT NOT NULL, candidate_mobility TEXT NOT NULL, review_status TEXT NOT NULL);
      CREATE TABLE membership(equipment_id TEXT NOT NULL REFERENCES equipment(id), force TEXT NOT NULL,
        basis TEXT NOT NULL, export_id TEXT NOT NULL REFERENCES source_export(id),
        PRIMARY KEY(equipment_id, force));
      CREATE TABLE provenance(equipment_id TEXT NOT NULL REFERENCES equipment(id),
        export_id TEXT NOT NULL REFERENCES source_export(id), record_number INTEGER NOT NULL,
        PRIMARY KEY(equipment_id,export_id));
      CREATE TABLE source_fact(equipment_id TEXT NOT NULL REFERENCES equipment(id), field TEXT NOT NULL,
        raw_value TEXT NOT NULL, value TEXT, PRIMARY KEY(equipment_id,field));
      CREATE TABLE quality_note(equipment_id TEXT NOT NULL REFERENCES equipment(id), issue TEXT NOT NULL,
        evidence TEXT NOT NULL, locator TEXT NOT NULL, status TEXT NOT NULL);
      CREATE TABLE rules_profile(id TEXT PRIMARY KEY, rules_version TEXT NOT NULL, label TEXT NOT NULL,
        layer TEXT NOT NULL, movement_points INTEGER NOT NULL, cargo_slots INTEGER NOT NULL, terrain_costs_json TEXT NOT NULL);
      CREATE TABLE piece_definition(id TEXT PRIMARY KEY, equipment_id TEXT NOT NULL UNIQUE REFERENCES equipment(id),
        profile_id TEXT NOT NULL REFERENCES rules_profile(id), rules_version TEXT NOT NULL, kind TEXT NOT NULL,
        load_slots INTEGER NOT NULL, piece_scale TEXT NOT NULL, definition_status TEXT NOT NULL,
        historical_service_status TEXT NOT NULL, review_flag TEXT);
      CREATE TABLE component(id TEXT PRIMARY KEY, equipment_id TEXT NOT NULL REFERENCES equipment(id),
        parent_component_id TEXT REFERENCES component(id), linked_equipment_id TEXT REFERENCES equipment(id),
        kind TEXT NOT NULL, name TEXT NOT NULL, quantity INTEGER, relationship TEXT NOT NULL,
        review_status TEXT NOT NULL, source_url TEXT NOT NULL, accessed TEXT NOT NULL, locator TEXT NOT NULL,
        source_field TEXT, fields_json TEXT NOT NULL, note TEXT NOT NULL,
        FOREIGN KEY(equipment_id,source_field) REFERENCES source_fact(equipment_id,field));
      CREATE TABLE unit_reference(equipment_id TEXT PRIMARY KEY REFERENCES equipment(id), reference_version TEXT NOT NULL,
        title TEXT NOT NULL, role_label TEXT NOT NULL, role TEXT NOT NULL, recognition_json TEXT NOT NULL,
        review_status TEXT NOT NULL, reviewed TEXT NOT NULL);
      CREATE TABLE reference_source(equipment_id TEXT NOT NULL REFERENCES unit_reference(equipment_id), ordinal INTEGER NOT NULL,
        label TEXT NOT NULL, url TEXT NOT NULL, locator TEXT NOT NULL, dated TEXT NOT NULL, accessed TEXT NOT NULL,
        PRIMARY KEY(equipment_id,ordinal));
      CREATE TABLE reference_media(id TEXT PRIMARY KEY, equipment_id TEXT NOT NULL UNIQUE REFERENCES unit_reference(equipment_id),
        subject TEXT NOT NULL, relationship TEXT NOT NULL, photo_date TEXT NOT NULL, source_page TEXT NOT NULL,
        original_url TEXT NOT NULL, creator TEXT NOT NULL, credit TEXT NOT NULL, license TEXT NOT NULL,
        license_url TEXT NOT NULL, rights_evidence TEXT NOT NULL, attribution TEXT NOT NULL, source_sha256 TEXT NOT NULL,
        source_asset_url TEXT NOT NULL, alt TEXT NOT NULL, framing TEXT NOT NULL, caveat TEXT NOT NULL);
      CREATE TABLE reference_asset(media_id TEXT NOT NULL REFERENCES reference_media(id), size TEXT NOT NULL,
        path TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL,
        PRIMARY KEY(media_id,size));
      CREATE INDEX component_equipment ON component(equipment_id);
      CREATE VIEW lab_eligible_2026 AS
        SELECT p.*,e.name,m.force FROM piece_definition p JOIN equipment e ON e.id=p.equipment_id
        JOIN membership m ON m.equipment_id=e.id
        WHERE m.basis='odin-operator-filter' AND e.reported_introduction_year<=2026;
      CREATE INDEX equipment_name ON equipment(name);
      CREATE INDEX equipment_domain_era ON equipment(domain, reported_introduction_year);
      CREATE INDEX membership_force ON membership(force,basis);
      CREATE VIEW parts AS SELECT * FROM equipment WHERE candidate_kind='part';
      CREATE VIEW platforms AS SELECT * FROM equipment WHERE candidate_kind='platform';
      CREATE VIEW force_candidates_1980_onward AS
        SELECT e.*,m.force,m.basis FROM equipment e JOIN membership m ON m.equipment_id=e.id
        WHERE era_status='introduced-1980-onward' AND m.basis='odin-operator-filter';
    """)
    for k, v in {"version": catalog["version"], "accessed": catalog["accessed"], "scope": catalog["scope"],
                 "global_quality_notes": quality["global"], "rules": rules, "piece_version": pieces["version"],
                 "component_version": components["version"], "reference_version": references["version"], "reference_notice": references["notice"],
                 "input_sha256": {name: hashlib.sha256((OUT / (name + '.json')).read_bytes()).hexdigest() for name in ('equipment','sources','rules','pieces','components','quality-notes','references')}}.items():
        db.execute("INSERT INTO metadata VALUES (?,?)", (k, json.dumps(v)))
    for s in sources:
        db.execute("INSERT INTO source_export VALUES (?,?,?,?,?,?,?)", (s["id"], s["url"], s["accessed"], json.dumps(s["filter"]), s["rowCount"], s["sha256"], s["localFile"]))
    for e in catalog["equipment"]:
        db.execute("INSERT INTO equipment VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            e["id"], e["name"], e["sourceUrl"], e["origin"], e["operatorText"], e["domain"], json.dumps(e["taxonomy"]),
            e["introduced"]["raw"], e["introduced"]["reportedYear"], e["eraStatus"], e["candidateKind"], e["candidateMobility"], e["reviewStatus"]))
        db.executemany("INSERT INTO membership VALUES (?,?,?,?)", [(e["id"], m["force"], m["basis"], m["sourceId"]) for m in e["memberships"]])
        db.executemany("INSERT INTO provenance VALUES (?,?,?)", [(e["id"], p["exportId"], p["recordNumber"]) for p in e["sources"]])
        db.executemany("INSERT INTO source_fact VALUES (?,?,?,?)", [(e["id"], k, f["raw"], f["value"]) for k, f in e["sourceFields"].items()])
    for q in quality["records"]:
        db.execute("INSERT INTO quality_note VALUES (?,?,?,?,?)", (q["equipmentId"], q["issue"], q["evidence"], q["locator"], q["status"]))
    for p in rules['profiles']:
        db.execute('INSERT INTO rules_profile VALUES (?,?,?,?,?,?,?)', (p['id'],rules['version'],p['label'],p['layer'],p['movement'],p['cargoSlots'],json.dumps(p['costs'])))
    for p in pieces['pieces']:
        db.execute('INSERT INTO piece_definition VALUES (?,?,?,?,?,?,?,?,?,?)', (p['id'],p['equipmentId'],p['profileId'],p['rulesVersion'],p['kind'],p['loadSlots'],p['pieceScale'],p['definitionStatus'],p['historicalServiceStatus'],p['reviewFlag']))
    for c in components['components']:
        db.execute('INSERT INTO component VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (c['id'],c['equipmentId'],c['parentComponentId'],c['linkedEquipmentId'],c['kind'],c['name'],c['quantity'],c['relationship'],c['reviewStatus'],c['sourceUrl'],c['accessed'],c['locator'],c['sourceField'],json.dumps(c['fields']),c['note']))
    for r in references['records']:
        db.execute('INSERT INTO unit_reference VALUES (?,?,?,?,?,?,?,?)', (r['equipmentId'],references['version'],r['title'],r['roleLabel'],r['role'],json.dumps(r['recognition']),r['reviewStatus'],r['reviewed']))
        for i, source in enumerate(r['sources']):
            db.execute('INSERT INTO reference_source VALUES (?,?,?,?,?,?,?)', (r['equipmentId'],i,source['label'],source['url'],source['locator'],source['dated'],source['accessed']))
        m = r['media']
        db.execute('INSERT INTO reference_media VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (m['id'],r['equipmentId'],m['subject'],m['relationship'],m['photoDate'],m['sourcePage'],m['originalUrl'],m['creator'],m['credit'],m['license'],m['licenseUrl'],m['rightsEvidence'],m['attribution'],m['sourceSha256'],m['sourceAssetUrl'],m['alt'],m['framing'],m['caveat']))
        for size in ('thumbnail','detail'):
            a = m[size]
            db.execute('INSERT INTO reference_asset VALUES (?,?,?,?,?,?,?)', (m['id'],size,a['path'],a['width'],a['height'],a['bytes'],a['sha256']))
    db.commit()
    assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
    print(json.dumps({"equipment": db.execute("SELECT COUNT(*) FROM equipment").fetchone()[0],
                      "facts": db.execute("SELECT COUNT(*) FROM source_fact").fetchone()[0],
                      "parts": db.execute("SELECT COUNT(*) FROM parts").fetchone()[0],
                      "platforms": db.execute("SELECT COUNT(*) FROM platforms").fetchone()[0],
                      "pieceDefinitions": db.execute("SELECT COUNT(*) FROM piece_definition").fetchone()[0],
                      "components": db.execute("SELECT COUNT(*) FROM component").fetchone()[0],
                      "eligibleDistinctPieces2026": db.execute("SELECT COUNT(DISTINCT id) FROM lab_eligible_2026").fetchone()[0],
                      "referenceCards": db.execute("SELECT COUNT(*) FROM unit_reference").fetchone()[0], "integrity": "ok"}))
    db.close()
    path.replace(OUT / "equipment.sqlite")


if __name__ == "__main__":
    build()
