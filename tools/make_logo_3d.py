"""Builds assets/models/djlabsiam-logo.glb : the DJ LAB SIAM logo extruded into a 3D object (red bar + black "D" + ink-black wordmark).
Traces logo_full.png colour regions -> polygons -> extrude (trimesh). Run from the website folder:  python tools/make_logo_3d.py"""
import os, sys
import numpy as np
from PIL import Image
from skimage import measure
import shapely.geometry as sg
from shapely.ops import unary_union
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
im = Image.open(os.path.join(ROOT, "logo_full.png")).convert("RGBA")
SC = 3                                   # trace at 1/3 resolution
im = im.resize((im.width // SC, im.height // SC), Image.LANCZOS)
a = np.asarray(im).astype(int)
R, G, B, A = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
opaque = A > 128
red = opaque & (R > 140) & (G < 90) & (B < 90)
white = opaque & (R > 200) & (G > 200) & (B > 200)
black = opaque & (R < 70) & (G < 70) & (B < 70)
H, W = R.shape
# metres: logo 0.30 m wide
S = 0.30 / W


def polys(mask, simplify=0.8, min_area=6):
    pad = np.pad(mask.astype(float), 1)
    out = []
    for c in measure.find_contours(pad, 0.5):
        c = c - 1
        if len(c) < 4:
            continue
        p = sg.Polygon([(x, H - y) for y, x in c]).buffer(0)
        if p.area >= min_area:
            out.append(p.simplify(simplify))
    # contours of holes come as separate rings: rebuild with even-odd nesting
    out.sort(key=lambda p: -p.area)
    shapes = []
    for p in out:
        for i, s in enumerate(shapes):
            if s.contains(p.representative_point()):
                shapes[i] = s.difference(p)
                break
        else:
            shapes.append(p)
    return shapes


def mesh_for(mask, depth, z0, color):
    parts = []
    for shp in polys(mask):
        for g in (shp.geoms if hasattr(shp, "geoms") else [shp]):
            if g.is_empty or g.area < 6:
                continue
            m = trimesh.creation.extrude_polygon(g, depth)
            m.apply_scale([S, S, 1.0])
            m.apply_translation([-0.15, 0.0, z0])
            parts.append(m)
    if not parts:
        return None
    m = trimesh.util.concatenate(parts)
    m.visual.face_colors = np.tile(np.array(color, dtype=np.uint8), (len(m.faces), 1))
    return m


# depths in metres (z up from the plate)
scene = trimesh.Scene()
# the white wordmark of logo_full.png is the dark-background version; on the shop's light stage it is built in ink black (same as logo-ink)
meshes = [("red", mesh_for(red, 0.030, 0.0, (190, 36, 41, 255))),
          ("black", mesh_for(black, 0.022, 0.0, (14, 14, 16, 255))),
          ("wordmark", mesh_for(white, 0.016, 0.0, (22, 22, 25, 255)))]
for n, m in meshes:
    if m is not None:
        scene.add_geometry(m, node_name=n)
# stand it up: model faces +Z; rotate so the logo faces the viewer (+Z towards camera) and stands on its bottom edge
out = os.path.join(ROOT, "assets", "models")
os.makedirs(out, exist_ok=True)
scene.export(os.path.join(out, "djlabsiam-logo.glb"))
print("ok", os.path.getsize(os.path.join(out, "djlabsiam-logo.glb")) // 1024, "KB")
