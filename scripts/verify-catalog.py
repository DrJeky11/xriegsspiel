"""Audit generated catalog artifacts and report coverage without claiming historical verification."""
import hashlib
import json
import sqlite3
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'catalog'
load = lambda name: json.loads((OUT / (name+'.json')).read_text())

def verify():
    equipment=load('equipment')['equipment']; pieces=load('pieces')['pieces']; components=load('components')['components']
    ids={e['id'] for e in equipment}
    assert len(ids)==len(equipment)==1607
    assert len(pieces)==len(ids) and {p['equipmentId'] for p in pieces}==ids
    assert all(c['equipmentId'] in ids for c in components)
    by_component={c['id']:c for c in components}
    assert len(by_component)==len(components)
    for c in components:
        if c['parentComponentId']:
            assert by_component[c['parentComponentId']]['equipmentId']==c['equipmentId']
        if c['sourceField']:
            e=next(e for e in equipment if e['id']==c['equipmentId'])
            assert e['sourceFields'][c['sourceField']]['value']==c['name']
    db=sqlite3.connect(f'file:{OUT / "equipment.sqlite"}?mode=ro',uri=True)
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    hashes=json.loads(db.execute("SELECT value FROM metadata WHERE key='input_sha256'").fetchone()[0])
    assert all(hashlib.sha256((OUT/(name+'.json')).read_bytes()).hexdigest()==digest for name,digest in hashes.items()),'SQLite is stale'
    assert db.execute('SELECT COUNT(*) FROM equipment').fetchone()[0]==len(ids)
    assert db.execute('SELECT COUNT(*) FROM piece_definition').fetchone()[0]==len(pieces)
    assert db.execute('SELECT COUNT(*) FROM component').fetchone()[0]==len(components)
    assert db.execute("SELECT COUNT(*) FROM lab_eligible_2026 l JOIN membership m ON m.equipment_id=l.equipment_id AND m.force=l.force WHERE m.basis!='odin-operator-filter'").fetchone()[0]==0
    report={
        'version':'catalog-verification/0.1.0','verifiedAt':'2026-09-15',
        'equipmentRecords':len(ids),'sourceFacts':db.execute('SELECT COUNT(*) FROM source_fact').fetchone()[0],
        'playableDefinitions':len(pieces),'definitionKinds':dict(Counter(p['kind'] for p in pieces)),
        'eligibleDistinctPieces2026':db.execute('SELECT COUNT(DISTINCT id) FROM lab_eligible_2026').fetchone()[0],
        'eligibleByForce2026':dict(db.execute('SELECT force,COUNT(*) FROM lab_eligible_2026 GROUP BY force').fetchall()),
        'componentRecords':len(components),'componentReview':dict(Counter(c['reviewStatus'] for c in components)),
        'integrity':'ok','foreignKeys':'ok','canonicalHashes':'match',
        'scope':'Data integrity and original laboratory behavior only. Historical force composition, component compatibility and real-world performance are not validated.'
    }
    (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':verify()
