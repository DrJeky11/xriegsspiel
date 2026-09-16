#!/usr/bin/env python3
"""Rebuild Pacific terrain assets from pinned Natural Earth and saved OSM extracts.
Standard-library only. Does not fetch data or import political boundaries.
"""
import argparse
import hashlib
import gzip
import json
from pathlib import Path
import xml.etree.ElementTree as ET

BBOX = (111, 6, 129, 29)
VERSION = 'pacific-geography/0.1.0'

def inside(point, ring):
    x, y = point
    result = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            result = not result
    return result

def clip(ring):
    points = ring[:-1]
    for axis, edge, sign in [(0, BBOX[0], 1), (0, BBOX[2], -1), (1, BBOX[1], 1), (1, BBOX[3], -1)]:
        out = []
        for a, b in zip(points[-1:]+points[:-1], points):
            ai, bi = sign*(a[axis]-edge) >= 0, sign*(b[axis]-edge) >= 0
            if ai != bi:
                t = (edge-a[axis])/(b[axis]-a[axis])
                out.append([round(a[i]+t*(b[i]-a[i]), 7) for i in range(2)])
            if bi:
                out.append(b)
        points = out
        if not points:
            return []
    return points+[points[0]] if len(points) >= 3 else []

def source_bytes(path):
    return gzip.decompress(path.read_bytes()) if path.suffix == ".gz" else path.read_bytes()

def source(path, url, license_name):
    return {'url': url, 'license': license_name, 'sha256': hashlib.sha256(source_bytes(path)).hexdigest(), 'accessed': '2026-09-16'}

def osm(path):
    root = ET.fromstring(source_bytes(path))
    nodes = {n.get('id'): [float(n.get('lon')), float(n.get('lat'))] for n in root.findall('node')}
    ways = {w.get('id'): w for w in root.findall('way')}
    def tags(w):
        return {t.get('k'): t.get('v') for t in w.findall('tag')}
    def refs(w):
        return [n.get('ref') for n in w.findall('nd')]
    def coords(ids):
        if any(i not in nodes for i in ids):
            raise ValueError('Incomplete OSM way; retrieve all referenced nodes')
        return [nodes[i] for i in ids]
    # Assemble only coastline ways, preserving their actual node connectivity.
    pending = [refs(w) for w in ways.values() if tags(w).get('natural') == 'coastline']
    rings = []
    while pending:
        ring = pending.pop()
        while ring[0] != ring[-1]:
            for i, other in enumerate(pending):
                if other[0] == ring[-1]:
                    ring += other[1:]; pending.pop(i); break
                if other[-1] == ring[-1]:
                    ring += other[-2::-1]; pending.pop(i); break
            else:
                raise ValueError('Open coastline at extract boundary; enlarge the source bounds')
        rings.append(coords(ring))
    reefs, lagoons = [], []
    for rel in root.findall('relation'):
        if tags(rel).get('natural') != 'reef':
            continue
        outer, inner = [], []
        for member in rel.findall('member'):
            way = ways.get(member.get('ref'))
            if member.get('type') != 'way' or way is None:
                raise ValueError('Incomplete reef relation')
            ids = refs(way)
            if ids[0] != ids[-1]:
                raise ValueError('This importer requires closed reef rings')
            (inner if member.get('role') == 'inner' else outer).append(coords(ids))
        for ring in outer:
            holes = [h for h in inner if inside(h[0], ring)]
            reefs.append([ring]+holes)
        lagoons.extend([[h] for h in inner])
    landmarks = []
    for wid, way in ways.items():
        if tags(way).get('name') == 'BRP Sierra Madre' or tags(way).get('name:en') == 'BRP Sierra Madre':
            ring = coords(refs(way))[:-1]
            landmarks.append({'id': 'sierra-madre', 'name': 'BRP Sierra Madre', 'position': [round(sum(p[i] for p in ring)/len(ring),7) for i in range(2)], 'source': f'https://www.openstreetmap.org/way/{wid}'})
    return {'land': [[r] for r in rings], 'reefs': reefs, 'lagoons': lagoons, 'landmarks': landmarks}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--land', type=Path, required=True)
    parser.add_argument('--shoal', type=Path, required=True)
    parser.add_argument('--senkaku', type=Path, required=True)
    parser.add_argument('--out', type=Path, default=Path('public/terrain/pacific'))
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    j = json.loads(args.land.read_text())
    land = []
    for f in j['features']:
        polygons = f['geometry']['coordinates'] if f['geometry']['type'] == 'MultiPolygon' else [f['geometry']['coordinates']]
        for poly in polygons:
            # Replace the generalized western Senkaku outlines with the saved OSM layer.
            if all(123.4 <= p[0] <= 123.72 and 25.68 <= p[1] <= 25.96 for p in poly[0]):
                continue
            outer = clip(poly[0])
            if outer:
                land.append([outer]+[c for h in poly[1:] if (c := clip(h))])
    files = {'regional-land.json': {'land': land, 'reefs': [], 'lagoons': [], 'landmarks': [], 'sources': [source(args.land, 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_land.geojson', 'Public domain')]}}
    for name, path, bounds in [('shoal-detail', args.shoal, '115.78,9.60,115.98,9.95'), ('senkaku-detail', args.senkaku, '123.40,25.68,123.72,25.96')]:
        files[name+'.json'] = {**osm(path), 'sources': [source(path, 'https://api.openstreetmap.org/api/0.6/map?bbox='+bounds, 'ODbL-1.0')]}
    for name, data in files.items():
        data = {'version': VERSION, **data}
        dest = args.out/name
        dest.write_text(json.dumps(data, separators=(',', ':'))+'\n')
        print(f'{dest}: {dest.stat().st_size:,} bytes; {len(data["land"])} land / {len(data["reefs"])} reef polygons')

if __name__ == '__main__':
    main()
