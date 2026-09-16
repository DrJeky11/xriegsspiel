"""Preserve component mentions without inventing compatibility or flattening section context."""
import hashlib
import json
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'catalog'

def build():
    equipment = json.loads((OUT / 'equipment.json').read_text())['equipment']
    inspections = json.loads((OUT / 'component-inspections.json').read_text())
    components = []
    for e in equipment:
        for field, fact in e['sourceFields'].items():
            kind = None
            if field in ('engine name', 'engine'): kind = 'engine'
            elif field in ('navigation radar', 'fire control radar', 'radar name', 'radar systems name', 'air search radar', 'radar warning receiver', 'sensors', 'sensor suite(s) available', 'fire control sensors') or (field.startswith('radar #') and field.endswith(' name')): kind = 'sensor'
            elif ('weapon system' in field and field.endswith(' name')) or field in ('main armament', 'armament'): kind = 'weapon'
            if kind is None or fact['value'] is None: continue
            value = fact['value']
            # Keep uncertain source assertions; omit placeholders, not negative facts.
            if value.lower().strip() in ('none', 'no', 'na', 'n/k') or value.lower().startswith('ina'): continue
            components.append({
                'id': 'mention-' + hashlib.sha256((e['id'] + '/' + field).encode()).hexdigest()[:20],
                'equipmentId': e['id'], 'parentComponentId': None, 'kind': kind,
                'name': value, 'quantity': None, 'linkedEquipmentId': None,
                'relationship': 'source-field-mention', 'reviewStatus': 'needs-section-review',
                'sourceUrl': e['sourceUrl'], 'accessed': '2026-09-15',
                'locator': 'CSV field: ' + field, 'sourceField': field, 'provenance': e['sources'],
                'fields': {}, 'note': 'Flattened source mention. Exact component variant, quantity and installed compatibility are not established.'
            })
    lookup = {e['id']: e for e in equipment}
    for r in inspections['records']:
        e = lookup[r['equipmentId']]
        components.append({**r, 'linkedEquipmentId': None, 'relationship': 'source-section-assertion',
            'reviewStatus': 'section-inspected-not-independently-verified', 'sourceUrl': e['sourceUrl'],
            'accessed': inspections['accessed'], 'sourceField': None, 'provenance': []})
    ids = {c['id'] for c in components}
    assert len(ids) == len(components)
    assert all(c['parentComponentId'] is None or c['parentComponentId'] in ids for c in components)
    result = {'version':'components/0.1.0', 'scope':'Reference relationships only; mentions and inspected assertions may overlap. No automatic mount, loadout or combat behavior.', 'components':components}
    (OUT / 'components.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'componentRecords':len(components),'status':dict(Counter(c['reviewStatus'] for c in components))}))

if __name__ == '__main__': build()
