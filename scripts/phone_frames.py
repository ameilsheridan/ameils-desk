"""Wrap exported phone screens in a simple device frame (transparent background) and
extract a white logo from a splash screen. Usage:
  python3 scripts/phone_frames.py <screens dir> <out dir>
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
S = 2  # supersample for smooth corners


def framed(name, out, height=1100):
    scr = Image.open(SRC / name).convert("RGBA")
    k = height / scr.height
    sw, sh = round(scr.width * k), height
    bez = round(sw * 0.035)
    W, H = sw + bez * 2, sh + bez * 2
    big = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    R = round(W * 0.16) * S
    d.rounded_rectangle((0, 0, W * S - 1, H * S - 1), R, fill=(22, 23, 26, 255))
    d.rounded_rectangle((3 * S, 3 * S, W * S - 3 * S, H * S - 3 * S), R - 3 * S, outline=(70, 72, 78, 255), width=2 * S)
    scr2 = scr.resize((sw * S, sh * S), Image.LANCZOS)
    m = Image.new("L", scr2.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, sw * S - 1, sh * S - 1), R - bez * S, fill=255)
    big.paste(scr2, (bez * S, bez * S), m)
    img = big.resize((W, H), Image.LANCZOS)
    img.save(OUT / out, "WEBP", quality=90, method=6)
    print("wrote", out, img.size)


def logo(name, out, box):
    im = Image.open(SRC / name).convert("RGB").crop(box)
    a = np.array(im).astype(float)
    # whiteness -> alpha, colour forced to white
    lum = a.min(axis=2)
    alpha = np.clip((lum - 150) / 90, 0, 1)
    rgba = np.zeros((*alpha.shape, 4), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(rgba).resize((im.width * 3, im.height * 3), Image.LANCZOS).save(OUT / out, "WEBP", quality=92)
    print("wrote", out)


if __name__ == "__main__":
    framed("Homepage.png", "medup-phone-home.webp")
    framed("Splash Screen.png", "medup-phone-splash.webp")
    framed("Slots.png", "medup-phone-slots.webp")
    framed("QR.png", "medup-phone-qr.webp")
    for src, out in [("Services.png", "services"), ("Facility.png", "facility"), ("Confirmation-1.png", "confirm"),
                     ("Medical History.png", "history"), ("Medical History-1.png", "records"), ("Appointments.png", "appointments"),
                     ("Number.png", "number"), ("OTP/03.png", "otp")]:
        framed(src, f"medup-phone-{out}.webp")
