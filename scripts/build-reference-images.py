"""Reproduce local WebP derivatives from pinned source assets. Requires Pillow (verified 12.2).
Run with --download to acquire missing originals, or --source-dir for a local archive.
Source imagery retains its own license; no generated imagery is accepted by this pipeline.
"""
import argparse
import hashlib
import io
import json
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]

def build(source_dir, download=False):
    path = ROOT / 'catalog/references.json'
    manifest = json.loads(path.read_text())
    output = ROOT / 'public/unit-references'
    output.mkdir(parents=True, exist_ok=True)
    source_dir.mkdir(parents=True, exist_ok=True)
    for record in manifest['records']:
        media = record['media']
        original = source_dir / (media['id'] + '.jpg')
        if not original.exists() and download:
            request = urllib.request.Request(media['sourceAssetUrl'], headers={'User-Agent': 'XRiegsspiel reference-card asset build'})
            original.write_bytes(urllib.request.urlopen(request, timeout=30).read())
        raw = original.read_bytes()
        if hashlib.sha256(raw).hexdigest() != media['sourceSha256']:
            raise ValueError(f"Source changed; review again: {media['id']}")
        with Image.open(io.BytesIO(raw)) as image:
            image = ImageOps.exif_transpose(image).convert('RGB')
            for size, dimensions, budget in [('thumbnail', (384, 256), 40_000), ('detail', (960, 640), 160_000)]:
                resized = ImageOps.contain(image, dimensions, Image.Resampling.LANCZOS)
                canvas = Image.new('RGB', dimensions, '#102630')
                canvas.paste(resized, ((dimensions[0]-resized.width)//2, (dimensions[1]-resized.height)//2))
                encoded = io.BytesIO()
                canvas.save(encoded, 'WEBP', quality=82, method=6)
                data = encoded.getvalue()
                if len(data) > budget:
                    raise ValueError(f"Image exceeds budget: {media['id']} {size}")
                digest = hashlib.sha256(data).hexdigest()
                name = f"{media['id']}-{size}.{digest[:16]}.webp"
                (output / name).write_bytes(data)
                media[size] = dict(path='/unit-references/'+name, width=dimensions[0], height=dimensions[1], bytes=len(data), sha256=digest)
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f"Prepared {len(manifest['records'])} reviewed reference cards.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--source-dir', type=Path, default=ROOT/'output/reference-originals')
    args = parser.parse_args()
    build(args.source_dir, args.download)
