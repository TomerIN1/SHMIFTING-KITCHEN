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
    node scripts/optimize-assets.mjs      # then PNG → WebP
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design_book" / "golden_reference" / "02.png"
OUT = ROOT / "public" / "assets"

# Measured off 02.png (1536x1024).
REGIONS = {
    # Bottom keeps the drips but stops before the tagline underneath.
    "wordmark-shmifting": (405, 70, 1220, 224),
    # The tagline arcs, so its box has to clear the high point of the O in OR
    # and the low point of the G in GIFT at once. The original box was 48px
    # tall and sliced the bottom off every glyph — the ink ran to all four
    # edges of the crop, which is the tell. Ink actually spans y 219–278.
    "wordmark-tagline": (630, 214, 972, 284),
}

# The floating eye above the wordmark overlaps the crop's top edge. Measuring
# the ink profile shows no letterform reaches this high in the centre, so the
# region can be cleared without touching a glyph. Coordinates are relative to
# each crop.
ERASE = {
    # …and a sliver of the ringed planet clips the top-right corner.
    "wordmark-shmifting": [(285, 0, 435, 14), (778, 0, 815, 32)],
    # A small orange leaf-tip rests ON the F of SHMIFT. It is the one intruder
    # CREAM_ONLY cannot remove, because it physically touches the glyph and so
    # joins that letter's component, and its base is the same pale peach as the
    # lettering. The letters below it start at y=22 and the leaf stops at y=20,
    # so this rectangle lands in the empty row between them.
    "wordmark-tagline": [(281, 0, 297, 22)],
}

# Regions whose lettering is uniformly cream, so anything coloured is not part
# of the mark. NOT the wordmark itself — that one is pink-to-lavender by
# design, and colour is the last thing we may strip from it.
CREAM_ONLY = {"wordmark-tagline"}

# Luminance below LO is fully transparent, above HI fully opaque.
LO, HI = 34, 96

# A component counts as lettering if its mean saturation is under MEAN_SAT.
# Measured on 02.png: the thirteen glyphs land between 47 and 62, while the
# heart, the drips and the sun's rays sit between 101 and 122.
MEAN_SAT = 80

# Big shapes only need to be roughly cream; small ones must be convincingly
# cream. That split is what keeps the dot of the question mark — 30px, mean
# saturation 40 — while dropping the decorative mauve dot below the T, which
# is a near-identical 52px but reads 67.
BIG_AREA, SMALL_AREA, SMALL_SAT = 100, 20, 55


def saturation(rgb: Image.Image) -> Image.Image:
    """Per-pixel max(R,G,B) - min(R,G,B). Cream is low, pink and orange high."""
    r, g, b = rgb.split()
    hi = ImageChops.lighter(ImageChops.lighter(r, g), b)
    lo = ImageChops.darker(ImageChops.darker(r, g), b)
    return ImageChops.subtract(hi, lo)


def lettering_mask(alpha: Image.Image, sat: Image.Image) -> Image.Image:
    """Keep only the connected blobs that are actually cream lettering.

    Rectangles cannot do this job here: the tagline is surrounded by a heart,
    a sun, stars and drips that interleave with the glyphs' bounding boxes. So
    the ink is grouped into components and each is judged on its own colour,
    which leaves the letters bit-for-bit untouched — unlike a per-pixel colour
    key, which eats their warm grain and turns them grey.
    """
    width, height = alpha.size
    a, s = alpha.load(), sat.load()
    seen = [[False] * width for _ in range(height)]
    mask = Image.new("L", (width, height), 0)
    m = mask.load()

    for y in range(height):
        for x in range(width):
            if a[x, y] <= 40 or seen[y][x]:
                continue

            queue = deque([(x, y)])
            seen[y][x] = True
            blob = []

            while queue:
                cx, cy = queue.popleft()
                blob.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if (
                            0 <= nx < width
                            and 0 <= ny < height
                            and not seen[ny][nx]
                            and a[nx, ny] > 40
                        ):
                            seen[ny][nx] = True
                            queue.append((nx, ny))

            area = len(blob)
            mean = sum(s[p] for p in blob) / area
            keep = (area >= BIG_AREA and mean < MEAN_SAT) or (
                area >= SMALL_AREA and mean < SMALL_SAT
            )
            if keep:
                for cx, cy in blob:
                    m[cx, cy] = 255

    # The components were found on a hard threshold; grow the mask by a pixel
    # so each glyph keeps its own soft antialiased edge.
    return mask.filter(ImageFilter.MaxFilter(3))


def extract(name: str, box: tuple[int, int, int, int]) -> None:
    src = Image.open(SRC).convert("RGB")
    crop = src.crop(box)
    grey = crop.convert("L")

    alpha = grey.point(
        lambda v: 0 if v <= LO else (255 if v >= HI else int((v - LO) / (HI - LO) * 255))
    )

    if name in CREAM_ONLY:
        alpha = ImageChops.multiply(alpha, lettering_mask(alpha, saturation(crop)))

    for x0, y0, x1, y1 in ERASE.get(name, []):
        alpha.paste(0, (x0, y0, x1, y1))

    out = crop.convert("RGBA")
    out.putalpha(alpha)

    # Trim to the real ink so layout has no invisible padding to fight.
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)

    # If ink still reaches an edge of the crop, the box is clipping a glyph —
    # the exact bug that shipped a tagline with its descenders sheared off.
    #
    # Only meaningful once the component mask has thrown the scenery away. The
    # wordmark's crop keeps its riso grain and stray specks, which sit against
    # all four edges by nature, so the check would cry wolf on every run there.
    touching = [
        side
        for side, hit in (
            ("left", bbox[0] == 0),
            ("top", bbox[1] == 0),
            ("right", bbox[2] == box[2] - box[0]),
            ("bottom", bbox[3] == box[3] - box[1]),
        )
        if hit and name in CREAM_ONLY
    ]

    path = OUT / f"{name}.png"
    out.save(path)
    print(f"{name}: {out.size[0]}x{out.size[1]} → {path.relative_to(ROOT)}")
    if touching:
        print(f"  WARNING: ink touches the {', '.join(touching)} edge — widen the box")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, box in REGIONS.items():
        extract(name, box)


if __name__ == "__main__":
    main()
