"""Build the 3D equipment sets shown on /shop/ (CDJ x2 + one mixer, every player x every mixer) from the single-product .glb files.

usage:  python tools/make_set_3d.py <assets/product-assets/3D Model>   (reads <model>/<folder>/<file>.glb, see DECKS / MIXERS)
writes: assets/models/sets/set-<deck>-x2-<mixer>.glb   and prints the items for data/shop-sets.json   (geometry/textures are instanced: each product is stored once)
Layout (metres, true scale of the source models): mixer centred, one CDJ either side, GAP between bodies, centres aligned on depth.
"""
import os, sys
import trimesh

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "models", "sets")
GAP = 0.010
DECKS = {"cdj3000x": ("CDJ-3000X", "CDJ-3000x/cdj_3000x"), "cdj1500x": ("CDJ-1500X", "CDJ-1500X/cdj_1500x")}
MIXERS = {"djm-a9": ("DJM-A9", "DJM-A9/djm_a9"), "djm-s11": ("DJM-S11", "DJM-S11/djm_s11"), "djm-s7": ("DJM-S7", "DJM-S7/djm_s7"),
          "djm-v10": ("DJM-V10", "DJM-V10/djm_v10"), "djm-v5": ("DJM-V5", "DJM-V5/djm_v5")}


def load(rel):
    s = trimesh.load(os.path.join(SRC, rel + ".glb"), force="scene")
    b = s.bounds
    return s, (b[1][0] - b[0][0])


os.makedirs(OUT, exist_ok=True)
for dkey, (DECK, drel) in DECKS.items():
    deck, dw = load(drel)
    for key, (mx, mrel) in MIXERS.items():
        mixer, mw = load(mrel)
        scene = trimesh.Scene()
        for tag, src, dx in ((mx, mixer, 0.0), (DECK + "-L", deck, -(mw / 2 + GAP + dw / 2)), (DECK + "-R", deck, mw / 2 + GAP + dw / 2)):
            base = trimesh.transformations.translation_matrix([dx, 0, 0])
            for node in src.graph.nodes_geometry:
                t, gname = src.graph[node]
                # same geometry name for both decks -> stored once in the file
                scene.add_geometry(src.geometry[gname], geom_name=(mx if src is mixer else DECK) + ":" + gname, node_name=tag + ":" + node, transform=base @ t)
        dst = os.path.join(OUT, f"set-{dkey}-x2-{key}.glb")
        scene.export(dst)
        b = scene.bounds
        print(f"{os.path.basename(dst)}  {os.path.getsize(dst) / 1e6:.2f} MB  {((b[1] - b[0]) * 1000).round(0)} mm")
