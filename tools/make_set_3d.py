"""Build the 3D equipment sets shown on /shop/ (CDJ x2 + one mixer) from the single-product .glb files.

usage:  python tools/make_set_3d.py <folder with CDJ-3000X.glb DJM-A9.glb DJM-S11.glb ...>
writes: assets/models/sets/set-cdj3000x-x2-<mixer>.glb   (geometry/textures are instanced: each product is stored once)
Layout (metres, true scale of the source models): mixer centred, one CDJ either side, GAP between bodies, centres aligned on depth.
"""
import os, sys
import trimesh

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "models", "sets")
GAP = 0.010
DECK = "CDJ-3000X"
MIXERS = {"djm-a9": "DJM-A9", "djm-s11": "DJM-S11"}


def load(name):
    s = trimesh.load(os.path.join(SRC, name + ".glb"), force="scene")
    b = s.bounds
    return s, (b[1][0] - b[0][0])


os.makedirs(OUT, exist_ok=True)
deck, dw = load(DECK)
for key, mx in MIXERS.items():
    mixer, mw = load(mx)
    scene = trimesh.Scene()
    for tag, src, dx in ((mx, mixer, 0.0), (DECK + "-L", deck, -(mw / 2 + GAP + dw / 2)), (DECK + "-R", deck, mw / 2 + GAP + dw / 2)):
        base = trimesh.transformations.translation_matrix([dx, 0, 0])
        for node in src.graph.nodes_geometry:
            t, gname = src.graph[node]
            # same geometry name for both decks -> stored once in the file
            scene.add_geometry(src.geometry[gname], geom_name=(mx if src is mixer else DECK) + ":" + gname, node_name=tag + ":" + node, transform=base @ t)
    dst = os.path.join(OUT, f"set-cdj3000x-x2-{key}.glb")
    scene.export(dst)
    b = scene.bounds
    print(f"{os.path.basename(dst)}  {os.path.getsize(dst) / 1e6:.2f} MB  {((b[1] - b[0]) * 1000).round(0)} mm")
