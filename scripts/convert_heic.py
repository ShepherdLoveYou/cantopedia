"""Convert all HEIC files in cwd to web-friendly JPEGs (max 1024px wide)."""
from pathlib import Path
from PIL import Image
import pillow_heif

pillow_heif.register_heif_opener()

OUT_DIR = Path("previews")
OUT_DIR.mkdir(exist_ok=True)

for heic in sorted(Path(".").glob("*.HEIC")):
    img = Image.open(heic)
    img.thumbnail((1024, 1024))
    out = OUT_DIR / (heic.stem + ".jpg")
    img.convert("RGB").save(out, "JPEG", quality=82)
    print(f"{heic.name} -> {out}  ({img.size[0]}x{img.size[1]})")
