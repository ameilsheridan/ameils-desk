"""Compose MedUP phone screens into 16:10 boards for the portfolio."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1600, 1000
OUTLINE = (0, 0, 0, 28)


def load(name):
    return Image.open(SRC / name).convert("RGBA")


def phone(img, h):
    w = round(img.width * h / img.height)
    img = img.resize((w, h), Image.LANCZOS)
    r = round(w * 0.12)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    ImageDraw.Draw(out).rounded_rectangle((0, 0, w - 1, h - 1), r, outline=OUTLINE, width=3)
    return out, mask


def gradient(top, bottom):
    g = Image.new("RGB", (1, H))
    for y in range(H):
        t = y / (H - 1)
        g.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return g.resize((W, H)).convert("RGBA")


def board(names, out, h=780, gap=48, bg=((236, 250, 249), (214, 240, 239)), heights=None, yoff=None):
    canvas = gradient(*bg)
    phones = [phone(load(n), (heights or [h] * len(names))[i]) for i, n in enumerate(names)]
    total = sum(p.width for p, _ in phones) + gap * (len(phones) - 1)
    scale = min(1.0, (W - 120) / total)
    if scale < 1:
        phones = [phone(load(n), round((heights or [h] * len(names))[i] * scale)) for i, n in enumerate(names)]
        gap = round(gap * scale)
        total = sum(p.width for p, _ in phones) + gap * (len(phones) - 1)
    x = (W - total) // 2
    for i, (p, m) in enumerate(phones):
        y = (H - p.height) // 2 + ((yoff or [0] * len(phones))[i])
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        shadow = Image.new("RGBA", p.size, (10, 60, 62, 70))
        sh.paste(shadow, (x, y + 18), m)
        sh = sh.filter(ImageFilter.GaussianBlur(26))
        canvas = Image.alpha_composite(canvas, sh)
        canvas.paste(p, (x, y), p)
        x += p.width + gap
    canvas.convert("RGB").save(OUT / out, "WEBP", quality=88, method=6)
    print("wrote", out)


OUTLINE = (255, 255, 255, 150)
teal = ((44, 214, 210), (3, 160, 170))
board(["Splash Screen.png", "Homepage.png", "QR.png"], "medup-cover.webp",
      heights=[760, 880, 760], bg=teal, gap=64)
OUTLINE = (0, 0, 0, 28)
board(["Onboarding/02.png", "Onboarding/03.png", "Onboarding/04.png", "Onboarding/05.png"], "medup-onboarding.webp")
board(["Number.png", "OTP/03.png", "OTP/06.png"], "medup-signin.webp")
board(["Services.png", "Facility.png", "Slots.png", "Confirmation-1.png"], "medup-booking.webp")
board(["QR.png", "Appointments.png", "Medical History.png", "Medical History-1.png", "Medical History-3.png"], "medup-records.webp")
