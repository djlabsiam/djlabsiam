#!/usr/bin/env python3
"""Makes the pictures of the full-page pop-up (assets/img/popup/*.webp). Each picture is a full-bleed background: the products sit on one side and the other side is kept dark and empty,
because the slide's words and buttons float on top of it (the words come live from the database, so no text and no prices are baked into the pictures).

  python tools/make_popup_images.py

  landscape  1920x1080  <name>.webp     products on the right ~55%, empty dark space on the left for the text
  portrait   1080x1920  <name>-m.webp   (phones) products in the upper ~60%, empty dark space at the bottom for the text

Sources (shop's own prepared cut-outs + the official AlphaTheta asset already in assets/product-assets):
  Marketing Analytic/Agent Team/Content Creator/input/product-ready/*.png   (transparent cut-outs prepared for the October ads)
  assets/product-assets/AlphaTheta Product Assets/CDJ-3000X/img_cta_01.webp (official dark CDJ-3000X scene)
Only models the owner lets us advertise: Starter Pack = DDJ-FLX2 only (BT speakers/headphones are not in the set price); AlphaTheta Oct = XDJ-RR, DM-40D-BT, HDJ-CUE1BT (no CDJ-350 / DDJ-REV1 / DDJ-GRV6).
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(SITE))      # .../Project
CUT = os.path.join(ROOT, "Marketing Analytic", "Agent Team", "Content Creator", "input", "product-ready")
OFFICIAL = os.path.join(os.path.dirname(SITE), "assets", "product-assets", "AlphaTheta Product Assets", "CDJ-3000X", "img_cta_01.webp")
OUT = os.path.join(SITE, "assets", "img", "popup")
os.makedirs(OUT, exist_ok=True)
L, P = (1920, 1080), (1080, 1920)


def backdrop(size, glow, white=(1, 0)):
    W, H = size
    bg = Image.new("RGB", size, (15, 15, 15))
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    gx, gy = glow
    d.ellipse((gx - 640, gy - 440, gx + 640, gy + 440), fill=(190, 20, 32, 150))
    wx, wy = white
    d.ellipse((int(W * wx) - 500, int(H * wy) - 340, int(W * wx) + 500, int(H * wy) + 340), fill=(255, 255, 255, 24))
    layer = layer.filter(ImageFilter.GaussianBlur(170))
    bg.paste(layer, (0, 0), layer)
    return bg.convert("RGBA")


def put(canvas, name, x, y, height=None, width=None, shadow=True):
    im = Image.open(os.path.join(CUT, name + ".png")).convert("RGBA")
    if height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    else:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if shadow:
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        a = im.getchannel("A").point(lambda v: int(v * 0.55))
        blk = Image.new("RGBA", im.size, (0, 0, 0, 255)); blk.putalpha(a)
        sh.paste(blk, (x + 16, y + 30), blk)
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(30)))
    canvas.alpha_composite(im, (x, y))


def save(canvas, name):
    p = os.path.join(OUT, name)
    canvas.convert("RGB").save(p, "WEBP", quality=82, method=6)
    print(f"{name:34s} {canvas.size}  {os.path.getsize(p) / 1024:.0f} KB")


# ── Starter Pack: DDJ-FLX2 only ──
c = backdrop(L, (520, 900)); put(c, "ddj-flx2", 800, 300, width=1060); save(c, "promo-starter-pack.webp")
c = backdrop(P, (540, 1500), (0.5, 0)); put(c, "ddj-flx2", 120, 470, width=840); save(c, "promo-starter-pack-m.webp")

# ── AlphaTheta October: XDJ-RR + DM-40D-BT + HDJ-CUE1BT (black / white / red) ──
c = backdrop(L, (460, 900))
put(c, "dm-40d-bt", 1400, 40, width=470)
put(c, "xdj-rr", 820, 430, width=1040)
put(c, "hdj-cue1bt-k", 830, 30, height=400)
put(c, "hdj-cue1bt-w", 1040, 10, height=430)
put(c, "hdj-cue1bt-r", 1250, 50, height=380)
save(c, "promo-alphatheta-oct.webp")
c = backdrop(P, (540, 1500), (0.5, 0))
put(c, "dm-40d-bt", 660, 90, width=340)
put(c, "hdj-cue1bt-k", 90, 70, height=340)
put(c, "hdj-cue1bt-w", 250, 50, height=370)
put(c, "hdj-cue1bt-r", 400, 120, height=310)
put(c, "xdj-rr", 150, 450, width=780)
save(c, "promo-alphatheta-oct-m.webp")


# ── CDJ special + default: the official dark CDJ-3000X scene, moved so the player sits where the text is not ──
def official(size, center, product_w, feather):
    src = Image.open(OFFICIAL).convert("RGB")
    s = product_w / 730.0                      # the player is ~730 px wide in the source, centred near (750, 685)
    src = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
    W, H = size
    ox, oy = round(center[0] - 750 * s), round(center[1] - 685 * s)
    base = backdrop(size, (center[0] - 300, H - 100), (0.8, 0.0))
    m = Image.new("L", src.size, 255)
    d = ImageDraw.Draw(m)
    for i in range(feather):                   # feather the four edges of the source so it melts into the backdrop
        a = int(255 * i / feather)
        d.rectangle((i, i, src.width - 1 - i, src.height - 1 - i), outline=a)
    base.paste(src, (ox, oy), m)
    return base


c = official(L, (1360, 560), 1060, 220); save(c, "promo-cdj-special.webp"); save(c, "promo-default.webp")
c = official(P, (540, 700), 860, 220); save(c, "promo-cdj-special-m.webp"); save(c, "promo-default-m.webp")

# ── news / Facebook slides without a picture of their own: brand backdrop, no products ──
c = backdrop(L, (1500, 520), (0.85, 0.0)); save(c, "news-default.webp")
c = backdrop(P, (540, 520), (0.5, 0.0)); save(c, "news-default-m.webp")
