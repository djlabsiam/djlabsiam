"""Cut the CDJ-3000X (top view, pure-black background -> transparent) for the home-page demo.
Source: AlphaTheta product assets (dealer material). Usage: python make_cdj_demo_image.py <spec_01.webp>"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
src = Image.open(sys.argv[1]).convert("RGB")
a = np.asarray(src).astype(int)
bg_lab, _ = ndi.label(a.max(axis=2) <= 2)
border = set(np.unique(np.concatenate([bg_lab[0], bg_lab[-1], bg_lab[:, 0], bg_lab[:, -1]]))) - {0}
dev = ~np.isin(bg_lab, list(border))
dev = ndi.binary_opening(dev, iterations=1)
l2, n = ndi.label(dev)
dev = ndi.binary_fill_holes(l2 == 1 + int(np.argmax(ndi.sum(dev, l2, range(1, n + 1)))))
# the photo shows the tempo-fader cap at 0%: paint it out with clean track from just above (the demo draws its own moving cap)
src.paste(src.crop((1012, 1100, 1060, 1152)), (1012, 1160))
out = src.convert("RGBA")
out.putalpha(Image.fromarray((dev * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.7)))
ys, xs = np.where(dev)
box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
print("crop box", box)          # cdj_demo.OX/OY/DW/DH must match
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "img", "cdj-full.webp")
out.crop(box).save(dest, quality=88, method=6, alpha_quality=95)
