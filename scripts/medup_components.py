"""Clean Figma component exports (drop the purple component-set outline) and export web sizes.
Usage: python3 scripts/medup_components.py <Component dir> <out dir>"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])


def clean(name):
    a = np.array(Image.open(SRC / name).convert("RGBA")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    purple = (b > 200) & (r > 110) & (r < 190) & (g < 120) & (b - g > 120)
    a[purple, 3] = 0
    im = Image.fromarray(a.astype(np.uint8))
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def save(im, out, maxw=1200):
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(OUT / out, "WEBP", quality=90, method=6)
    print("wrote", out, im.size)


logos = clean("Logos.png")
h = logos.height
save(logos.crop((0, 0, logos.width, h // 2 - 20)).crop(logos.crop((0, 0, logos.width, h // 2 - 20)).getbbox()), "medup-logo-color.webp", 900)
white = logos.crop((0, h // 2, logos.width, h))
save(white.crop(white.getbbox()), "medup-logo.webp", 900)
for src, out in [("Button.png", "medup-ui-buttons.webp"), ("Category.png", "medup-ui-icons.webp"), ("tab click.png", "medup-ui-nav.webp"),
                 ("Progress Bar.png", "medup-ui-progress.webp"), ("Cards-1.png", "medup-ui-facility.webp"), ("Add.png", "medup-ui-fab.webp"),
                 ("book appointment.png", "medup-ui-menu.webp")]:
    save(clean(src), out)
