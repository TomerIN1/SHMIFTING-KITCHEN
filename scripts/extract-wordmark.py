#!/usr/bin/env python3
"""
Extract the SHMIFTING wordmark and the GIFT OR SHMIFT? lockup straight out of
Golden Reference 02.

CLAUDE.md §11 (REUSE BEFORE INVENTION) and §12 (Golden Screens are matched
closely, not loosely): the approved lettering already exists. Regenerating an
approximation of it would produce a second, slightly-wrong wordmark — so the
real one is cut out of the key art instead.

The letters sit directly on charcoal with no outline, so alpha is keyed from
luminance: dark stays transparent, ink stays opaque, with a soft ramp between
so the drips and the riso grain survive.

    python3 scripts/extract-wordmark.py
"""

from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design_book" / "golden_reference" / "02.png"
OUT = ROOT / "public" / "assets"

# Measured off 02.png (1536x1024).
REGIONS = {
    # Bottom keeps the drips but stops before the tagline underneath.
    "wordmark-shmifting": (405, 70, 1220, 224),
    "wordmark-tagline": (624, 224, 990, 272),
}

# The floating eye above the wordmark overlaps the crop's top edge. Measuring
# the ink profile shows no letterform reaches this high in the centre, so the
# region can be cleared without touching a glyph. Coordinates are relative to
# the wordmark crop.
ERASE = {
    # …and a sliver of the ringed planet clips the top-right corner.
    "wordmark-shmifting": [(285, 0, 435, 14), (778, 0, 815, 32)],
    # A small decorative heart sits just under the tagline's baseline.
    "wordmark-tagline": [(142, 38, 182, 48)],
}

# Luminance below LO is fully transparent, above HI fully opaque.
LO, HI = 34, 96


def extract(name: str, box: tuple[int, int, int, int]) -> None:
    src = Image.open(SRC).convert("RGB")
    crop = src.crop(box)
    grey = crop.convert("L")

    alpha = grey.point(
        lambda v: 0 if v <= LO else (255 if v >= HI else int((v - LO) / (HI - LO) * 255))
    )

    for x0, y0, x1, y1 in ERASE.get(name, []):
        alpha.paste(0, (x0, y0, x1, y1))

    out = crop.convert("RGBA")
    out.putalpha(alpha)

    # Trim to the real ink so layout has no invisible padding to fight.
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)

    path = OUT / f"{name}.png"
    out.save(path)
    print(f"{name}: {out.size[0]}x{out.size[1]} → {path.relative_to(ROOT)}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, box in REGIONS.items():
        extract(name, box)


if __name__ == "__main__":
    main()
