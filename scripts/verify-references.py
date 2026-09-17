"""Validate reviewed content, local images, budgets and additive database records."""
import hashlib
import json
import sqlite3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def verify():
    data = json.loads((ROOT/'catalog/references.json').read_text())
    equipment = {r['id']:r for r in json.loads((ROOT/'catalog/equipment.json').read_text())['equipment']}
    ids = set()
    totals = {'thumbnail':0, 'detail':0}
    maximum = {'thumbnail':0, 'detail':0}
    for r in data['records']:
        assert r['equipmentId'] in equipment and r['equipmentId'] not in ids
        ids.add(r['equipmentId'])
        assert r['reviewStatus'] == 'reviewed' and r['reviewed']
        assert r['role'] and r['roleLabel'] and len(r['recognition']) <= 2 and r['sources']
        for source in r['sources']:
            assert all(source.get(k) for k in ('label','url','locator','dated','accessed'))
            assert source['url'].startswith('https://')
        media = r['media']
        assert media['relationship'] in ('exact variant','class example')
        assert all(media.get(k) for k in ('subject','photoDate','caveat','sourcePage','originalUrl','creator','credit','license','licenseUrl','rightsEvidence','attribution','sourceSha256','sourceAssetUrl','alt','framing'))
        for size, dimensions, budget in [('thumbnail',(384,256),40_000),('detail',(960,640),160_000)]:
            a = media[size]
            path = (ROOT/'public'/a['path'].lstrip('/')).resolve()
            assert path.is_relative_to(ROOT/'public/unit-references')
            raw = path.read_bytes()
            assert len(raw) == a['bytes'] <= budget
            assert hashlib.sha256(raw).hexdigest() == a['sha256'] and a['sha256'][:16] in path.name
            with Image.open(path) as image:
                image.load()
                assert image.format == 'WEBP' and image.size == dimensions == (a['width'],a['height'])
            totals[size] += len(raw)
            maximum[size] = max(maximum[size],len(raw))
    with sqlite3.connect(ROOT/'catalog/equipment.sqlite') as db:
        assert db.execute('SELECT COUNT(*) FROM unit_reference').fetchone()[0] == len(ids)
        assert db.execute('SELECT COUNT(*) FROM reference_asset').fetchone()[0] == len(ids)*2
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        for r in data['records']:
            assert db.execute('SELECT role FROM unit_reference WHERE equipment_id=?',(r['equipmentId'],)).fetchone()[0] == r['role']
    print(json.dumps({'reviewedPhotos':len(ids),'reviewedRoles':len(ids),'seaRecords':sum(r['domain']=='sea' for r in equipment.values()),'totalBytes':totals,'maxAssetBytes':maximum,'integrity':'ok'}))
if __name__ == '__main__':
    verify()
