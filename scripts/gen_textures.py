"""Procedural, tileable textures for the material library (no downloads, all original).
Run: python3 -I scripts/gen_textures.py  ->  public/textures/*.webp
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "textures")
os.makedirs(OUT, exist_ok=True)


def pnoise(w, h, cx, cy, seed):
    """Periodic value noise (tiles seamlessly)."""
    rng = np.random.default_rng(seed)
    g = rng.random((cy, cx))
    ys = np.linspace(0, cy, h, endpoint=False)
    xs = np.linspace(0, cx, w, endpoint=False)
    y0 = np.floor(ys).astype(int)
    x0 = np.floor(xs).astype(int)
    fy = ys - y0
    fx = xs - x0
    fy = fy * fy * (3 - 2 * fy)
    fx = fx * fx * (3 - 2 * fx)
    y1 = (y0 + 1) % cy
    x1 = (x0 + 1) % cx
    a = g[np.ix_(y0, x0)]
    b = g[np.ix_(y0, x1)]
    c = g[np.ix_(y1, x0)]
    d = g[np.ix_(y1, x1)]
    fx = fx[None, :]
    fy = fy[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(w, h, cx, cy, octaves, seed, gain=0.5):
    out = np.zeros((h, w))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        out += amp * pnoise(w, h, cx * 2 ** o, cy * 2 ** o, seed + o)
        tot += amp
        amp *= gain
    return out / tot


def save(name, arr, quality=88):
    arr = np.clip(arr, 0, 1)
    if arr.ndim == 2:
        img = Image.fromarray((arr * 255).astype(np.uint8), "L")
    else:
        img = Image.fromarray((arr * 255).astype(np.uint8), "RGB")
    img.save(os.path.join(OUT, name), "WEBP", quality=quality, method=6)


def height_to_normal(hm, strength):
    gy, gx = np.gradient(hm)
    nx = -gx * strength
    ny = gy * strength
    nz = np.ones_like(hm)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5, nz / ln * 0.5 + 0.5], -1)


def lerp3(a, b, t):
    a = np.array(a)[None, None, :]
    b = np.array(b)[None, None, :]
    return a + (b - a) * t[..., None]


S = 1024

# --- walnut / caramel wood (grain runs along U) -------------------------------
warp = fbm(S, S, 2, 4, 4, 1)
fine = fbm(S, S, 6, 160, 3, 2)
rings = np.sin((np.linspace(0, 1, S)[:, None] * 64 + warp * 1.6 + fbm(S, S, 1, 24, 3, 5) * 0.8) * np.pi * 2) * 0.5 + 0.5
rings = rings ** 3.0
streak = fbm(S, S, 1, 96, 4, 3)
t = np.clip(0.38 * rings + 0.42 * streak + 0.2 * fine, 0, 1)
wood = lerp3((0.25, 0.15, 0.09), (0.46, 0.3, 0.19), t)
pores = (fbm(S, S, 64, 256, 2, 4) > 0.72).astype(float) * 0.08
wood *= (1 - pores)[..., None]
blotch = fbm(S, S, 2, 2, 3, 9)
wood *= (0.9 + 0.18 * blotch)[..., None]
save("wood_albedo.webp", wood)
save("wood_rough.webp", 0.5 + 0.25 * rings * 0.6 + 0.15 * fine + pores)
save("wood_normal.webp", height_to_normal(rings * 0.25 + fine * 0.3 - pores * 2, 2.0))

# --- floor planks: darker, plank seams along U --------------------------------
fw = fbm(S, S, 3, 10, 5, 21)
frings = (np.sin((np.linspace(0, 1, S)[:, None] * 50 + fw * 8) * np.pi * 2) * 0.5 + 0.5) ** 2
plank = np.floor(np.linspace(0, 6, S, endpoint=False))[:, None] * np.ones((1, S))
tone = (np.sin(plank * 12.9898) * 43758.5453) % 1
floor = lerp3((0.12, 0.065, 0.035), (0.28, 0.15, 0.075), np.clip(0.5 * frings + 0.3 * tone + 0.2 * fw, 0, 1))
seam = (np.abs((np.linspace(0, 6, S, endpoint=False) % 1) - 0.0) < 0.006)[:, None] * np.ones((1, S))
floor *= (1 - 0.6 * seam)[..., None]
save("floor_albedo.webp", floor)

# --- warm plaster ---------------------------------------------------------------
pl = fbm(S, S, 4, 4, 6, 31)
plaster = lerp3((0.42, 0.28, 0.19), (0.56, 0.4, 0.28), pl)
save("plaster_albedo.webp", plaster)
save("plaster_normal.webp", height_to_normal(fbm(S, S, 16, 16, 5, 32), 6.0))

# --- ribbed knit (sleeve cuff) + jersey (sleeve) ----------------------------------
x = np.linspace(0, 1, 512, endpoint=False)
rib = np.abs(np.sin(x * np.pi * 40))[None, :] * np.ones((512, 1))
loops = np.abs(np.sin(np.linspace(0, 1, 512, endpoint=False) * np.pi * 120))[:, None]
knit = rib * 0.75 + 0.25 * rib * loops + 0.08 * fbm(512, 512, 32, 32, 2, 41)
save("knit_normal.webp", height_to_normal(knit, 5.0))
twill = (np.sin((np.arange(512)[:, None] + np.arange(512)[None, :]) * np.pi * 2 / 6) * 0.5 + 0.5)
save("jersey_normal.webp", height_to_normal(twill * 0.6 + 0.4 * fbm(512, 512, 64, 64, 2, 42), 2.0))

# --- brushed metal (horizontal streaks) -------------------------------------------
br = fbm(512, 512, 2, 400, 3, 51) * 0.7 + 0.3 * fbm(512, 512, 8, 256, 2, 52)
save("brushed_normal.webp", height_to_normal(br, 1.4))
save("brushed_rough.webp", 0.32 + br * 0.18)

# --- linen (notebook cover) ---------------------------------------------------------
wv = (np.sin(np.arange(512)[None, :] * np.pi * 2 / 5) * np.sin(np.arange(512)[:, None] * np.pi * 2 / 5))
save("linen_normal.webp", height_to_normal(wv * 0.5 + 0.5 * fbm(512, 512, 40, 40, 2, 61), 2.5))

# --- paper fibres + cork --------------------------------------------------------------
save("paper_normal.webp", height_to_normal(fbm(512, 512, 48, 48, 4, 71), 2.0))
ck = fbm(512, 512, 64, 64, 3, 81)
cork = lerp3((0.42, 0.28, 0.16), (0.7, 0.52, 0.34), ck)
cork *= (1 - (fbm(512, 512, 90, 90, 2, 82) > 0.7) * 0.35)[..., None]
save("cork_albedo.webp", cork)

# --- night window: dusk gradient + out-of-focus city lights -------------------------
W, H = 1024, 816
grad = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
win = lerp3((0.13, 0.16, 0.3), (0.32, 0.2, 0.22), grad ** 1.6)
rng = np.random.default_rng(5)
yy, xx = np.mgrid[0:H, 0:W]
for _ in range(70):
    cx, cy = rng.uniform(0, W), rng.uniform(H * 0.45, H)
    r = rng.uniform(10, 34)
    col = np.array(rng.choice([(1.0, 0.72, 0.4), (1.0, 0.85, 0.6), (0.6, 0.75, 1.0), (1.0, 0.55, 0.35)]))
    disk = np.clip(1 - (np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) - r) / 2.5, 0, 1)
    win += disk[..., None] * col[None, None, :] * rng.uniform(0.15, 0.45)
save("night_window.webp", win)

print("textures written to", os.path.abspath(OUT))
for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, "KB")
