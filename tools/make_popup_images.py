#!/usr/bin/env python3
"""Makes the promotion pictures for the pop-up (assets/img/popup/promo-*.webp, 1600x900, no text and no prices — the words come from the database).

  python tools/make_popup_images.py

Sources (shop's own prepared cut-outs + the official AlphaTheta asset already in assets/product-assets):
  Marketing Analytic/Agent Team/Content Creator/input/product-ready/*.png   (transparent cut-outs prepared for the October ads)
  assets/product-assets/AlphaTheta Product Assets/CDJ-3000X/img_cta_01.webp (official dark CDJ-3000X scene)
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(SITE))      # .../Project
CUT = os.path.join(ROOT, "Marketing Analytic", "Agent Team", "Content Creator", "input", "product-ready")
OFFICIAL = os.path.join(os.path.dirname(SITE), "assets", "product-assets", "AlphaTheta Product Assets", "CDJ-3000X", "img_cta_01.webp")
OUT = os.path.join(SITE, "assets", "img", "popup")
W, H = 1600, 900
os.makedirs(OUT, exist_ok=True)


def backdrop(glow_x, glow_y):
    bg = Image.new("RGB", (W, H), (15, 15, 15))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((glow_x - 520, glow_y - 360, glow_x + 520, glow_y + 360), fill=(190, 20, 32, 150))
    d.ellipse((W - 520, -260, W + 160, 260), fill=(255, 255, 255, 22))
    layer = layer.filter(ImageFilter.GaussianBlur(150))
    bg.paste(layer, (0, 0), layer)
    return bg.convert("RGBA")


def put(canvas, name, height=None, width=None, x=0, y=0, shadow=True):
    im = Image.open(os.path.join(CUT, name + ".png")).convert("RGBA")
    if height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    else:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if shadow:
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        a = im.getchannel("A").point(lambda v: int(v * 0.55))
        blk = Image.new("RGBA", im.size, (0, 0, 0, 255)); blk.putalpha(a)
        sh.paste(blk, (x + 14, y + 26), blk)
        canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    canvas.alpha_composite(im, (x, y))


def save(canvas, name):
    p = os.path.join(OUT, name)
    canvas.convert("RGB").save(p, "WEBP", quality=84, method=6)
    print(f"{name}  {os.path.getsize(p) / 1024:.0f} KB")


# Starter Pack: only the controller of the set (the set is DDJ-FLX2/FLX4 + wired HDJ-CUE1 or DM-40D; the BT versions are not in the set price, so they are not shown)
c = backdrop(560, 640)
put(c, "ddj-flx2", width=1240, x=180, y=190)
save(c, "promo-starter-pack.webp")

# AlphaTheta October: only models that the owner allows to be advertised (XDJ-RR, DM-40D-BT, HDJ-CUE1BT W/K/R) — no CDJ-350, DDJ-REV1 or DDJ-GRV6
c = backdrop(420, 640)
put(c, "xdj-rr", width=980, x=40, y=290)
put(c, "dm-40d-bt", width=520, x=1040, y=60)
put(c, "hdj-cue1bt-k", height=420, x=960, y=440)
put(c, "hdj-cue1bt-w", height=470, x=1120, y=390)
put(c, "hdj-cue1bt-r", height=400, x=1300, y=470)
save(c, "promo-alphatheta-oct.webp")

# CDJ / all-in-one special + default: the official dark CDJ-3000X scene, 16:9
im = Image.open(OFFICIAL).convert("RGB")
cw = 1380                                   # a closer crop around the player (it sits left of centre in the source)
ch = round(cw * 9 / 16)
left, top = 60, (im.height - ch) // 2
im = im.crop((left, top, left + cw, top + ch)).resize((W, H), Image.LANCZOS)
im.save(os.path.join(OUT, "promo-cdj-special.webp"), "WEBP", quality=84, method=6)
print("promo-cdj-special.webp", os.path.getsize(os.path.join(OUT, "promo-cdj-special.webp")) // 1024, "KB")
im.save(os.path.join(OUT, "promo-default.webp"), "WEBP", quality=84, method=6)
print("promo-default.webp", os.path.getsize(os.path.join(OUT, "promo-default.webp")) // 1024, "KB")
