"""Extract CENTCOM land rings from the pinned public-domain Natural Earth archive.

Usage: python3 scripts/import-centcom-terrain.py /path/to/ne_10m_land.zip
Python standard library only. The archive is checked before anything is written.
"""
import hashlib
import json
from pathlib import Path
import struct
import sys
import zipfile

EXPECTED_SHA256 = "e547d749445eaa0964aba76738090ec88f5e63c4585122170f98c67a7ea922dc"
REGIONS = {
    "hormuz": [54.4, 24.2, 58.5, 28.0],
    "bab-al-mandeb": [41.6, 10.7, 45.5, 14.3],
}


def clip_ring(points, bounds):
    # Sutherland-Hodgman clipping preserves ring winding, including holes.
    for axis, value, sign in [(0, bounds[0], 1), (0, bounds[2], -1),
                              (1, bounds[1], 1), (1, bounds[3], -1)]:
        output = []
        if not points:
            return []
        previous = points[-1]
        for current in points:
            inside = sign * (current[axis] - value) >= 0
            prior_inside = sign * (previous[axis] - value) >= 0
            if inside != prior_inside:
                t = (value - previous[axis]) / (current[axis] - previous[axis])
                output.append([previous[i] + t * (current[i] - previous[i]) for i in (0, 1)])
            if inside:
                output.append(current)
            previous = current
        points = output
    result = []
    for point in points:
        rounded = [round(v, 6) for v in point]
        if not result or rounded != result[-1]:
            result.append(rounded)
    if result and result[0] != result[-1]:
        result.append(result[0])
    return result if len(result) >= 4 else []


def main():
    archive = Path(sys.argv[1]).read_bytes()
    if hashlib.sha256(archive).hexdigest() != EXPECTED_SHA256:
        raise ValueError("Natural Earth archive hash differs; review provenance before updating the pin.")
    with zipfile.ZipFile(sys.argv[1]) as source:
        shape = source.read("ne_10m_land.shp")
        version = source.read("ne_10m_land.VERSION.txt").decode().strip()
    regions = {name: [] for name in REGIONS}
    offset = 100
    while offset < len(shape):
        _, words = struct.unpack_from(">2i", shape, offset)
        record = shape[offset + 8:offset + 8 + words * 2]
        offset += 8 + words * 2
        shape_type = struct.unpack_from("<i", record)[0]
        if shape_type == 0:
            continue
        if shape_type != 5:
            raise ValueError(f"Expected Polygon, got shape type {shape_type}")
        part_count, point_count = struct.unpack_from("<2i", record, 36)
        starts = list(struct.unpack_from(f"<{part_count}i", record, 44)) + [point_count]
        points = list(struct.iter_unpack("<2d", record[44 + part_count * 4:]))
        for start, end in zip(starts, starts[1:]):
            ring = points[start:end]
            xs, ys = zip(*ring)
            for name, bounds in REGIONS.items():
                if max(xs) < bounds[0] or min(xs) > bounds[2] or max(ys) < bounds[1] or min(ys) > bounds[3]:
                    continue
                clipped = clip_ring(ring, bounds)
                if clipped:
                    regions[name].append(clipped)
    result = {
        "source": {"name": "Natural Earth 1:10m land", "version": version,
                   "url": "https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip",
                   "license": "Public domain", "accessed": "2026-09-16",
                   "archiveSha256": EXPECTED_SHA256,
                   "processing": "Polygon rings clipped to padded regional bounds; coordinates rounded to 6 decimals. Even-odd fill retains holes."},
        "regions": regions,
    }
    target = Path(__file__).resolve().parents[1] / "src/centcom/coastlines.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"Wrote {target}: {target.stat().st_size:,} bytes")
    for name, rings in regions.items():
        print(f"  {name}: {len(rings)} rings, {sum(map(len, rings)):,} vertices")


if __name__ == "__main__":
    main()
