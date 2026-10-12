"""Prepare product 3D models for upload to the public `product-3d` bucket (Supabase, project vvtefgjseihadsmvuntd).

What it does (nothing is uploaded; it only reads the public `web_products` view with the same anon key /book/ uses):
  1. validates every .glb in a folder (glTF 2.0 binary header, length, size limit 30 MB, scene stats, big textures)
  2. matches each file to a shop product by NAME or SKU taken from the file name:
        "CDJ-3000X.glb"  ·  "DJM-A9.glb"  ·  "Pioneer DDJ-REV5.glb"   (case/space/dash-insensitive)
     optional side files with the same base name:  CDJ-3000X.webp|.jpg|.png = poster (shown while loading) · CDJ-3000X.txt = credit line
  3. writes an upload folder:  <out>/ <product-id>.glb  manifest.bin  REPORT.md
     -> upload ALL files of <out> into the bucket `product-3d` (Supabase dashboard > Storage > product-3d > Upload).
        The shop reads manifest.bin by itself; a "ดู 3D" button appears on those products. No website push needed.

Usage (from the website folder):
    python tools/prepare_3d.py <folder-with-glb> [--out <folder>] [--limit-mb 30]
Licensing: only upload models the shop owns or has the rights to (real Pioneer DJ / AlphaTheta models need the brand's permission).
"""
import argparse, io, json, os, re, shutil, struct, sys, unicodedata, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("--out", default=None)
ap.add_argument("--limit-mb", type=float, default=30.0)
A = ap.parse_args()
OUT = A.out or os.path.join(os.path.abspath(A.src), "_upload")


def norm(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = re.sub(r"^(pioneer\s*dj|pioneer|alphatheta)\s+", "", s)
    return re.sub(r"[^a-z0-9ก-๙]+", "", s)


def products():
    b = io.open(os.path.join(SITE, "book", "index.html"), encoding="utf-8").read()
    origin = re.search(r"const API='(https://[a-z0-9.-]+\.supabase\.co)", b).group(1)
    key = re.search(r"const KEY='([A-Za-z0-9._-]+)'", b).group(1)
    req = urllib.request.Request(origin + "/rest/v1/web_products?select=id,name,sku,brand,price&limit=1000",
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))


def inspect_glb(path):
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        head = f.read(12)
        if len(head) < 12:
            return None, "ไฟล์สั้นเกินไป"
        magic, ver, length = struct.unpack("<4sII", head)
        if magic != b"glTF":
            return None, "ไม่ใช่ไฟล์ .glb (header ไม่ใช่ glTF) — ส่งออกเป็น glTF Binary (.glb)"
        if ver != 2:
            return None, f"glTF เวอร์ชัน {ver} ไม่รองรับ (ต้อง 2.0)"
        if length != size:
            return None, f"ขนาดใน header ({length}) ไม่ตรงกับไฟล์ ({size}) — ไฟล์อาจเสียหายจากการอัปโหลด/แปลง"
        clen, ctype = struct.unpack("<II", f.read(8))
        if ctype != 0x4E4F534A:
            return None, "chunk แรกไม่ใช่ JSON"
        j = json.loads(f.read(clen).decode("utf-8"))
    info = {"size": size, "meshes": len(j.get("meshes", [])), "materials": len(j.get("materials", [])), "textures": len(j.get("textures", [])),
            "images": len(j.get("images", [])), "draco": "KHR_draco_mesh_compression" in (j.get("extensionsUsed") or []),
            "ktx2": "KHR_texture_basisu" in (j.get("extensionsUsed") or []), "animations": len(j.get("animations", []))}
    tris = 0
    acc = j.get("accessors", [])
    for m in j.get("meshes", []):
        for pr in m.get("primitives", []):
            if "indices" in pr and pr["indices"] < len(acc):
                tris += acc[pr["indices"]].get("count", 0) // 3
    info["triangles"] = tris
    return info, None


try:
    PRODS = products()
except Exception as e:
    sys.exit(f"อ่านรายการสินค้าจากฐานไม่ได้: {e}")
by_name, by_sku = {}, {}
for p in PRODS:
    by_name.setdefault(norm(p["name"]), []).append(p)
    if p.get("sku"):
        by_sku.setdefault(norm(p["sku"]), []).append(p)

os.makedirs(OUT, exist_ok=True)
manifest, rows, bad = {}, [], 0
limit = int(A.limit_mb * 1024 * 1024)
for fn in sorted(os.listdir(A.src)):
    if not fn.lower().endswith(".glb"):
        continue
    base = fn[:-4]
    path = os.path.join(A.src, fn)
    info, err = inspect_glb(path)
    notes = []
    if err:
        rows.append((fn, "✗", err, "", ""))
        bad += 1
        continue
    if info["size"] > limit:
        rows.append((fn, "✗", f"ใหญ่เกินเพดานถัง ({info['size'] / 1048576:.1f} MB > {A.limit_mb:.0f} MB) — บีบอัดก่อน (gltf-transform optimize / draco / texture webp)", "", ""))
        bad += 1
        continue
    if info["size"] > 10 * 1048576:
        notes.append(f"ไฟล์ {info['size'] / 1048576:.1f} MB ค่อนข้างหนักสำหรับมือถือ (แนะนำ ≤ 8 MB)")
    if info["triangles"] > 300000:
        notes.append(f"{info['triangles']:,} สามเหลี่ยม — มากเกินไปสำหรับมือถือ (แนะนำ ≤ 150,000)")
    if not (info["draco"] or info["ktx2"]) and info["size"] > 8 * 1048576:
        notes.append("ยังไม่ได้บีบอัด (ไม่มี draco/ktx2)")
    hit = by_sku.get(norm(base)) or by_name.get(norm(base)) or []
    if len(hit) != 1:
        why = "ไม่พบสินค้าชื่อ/SKU นี้ในร้าน" if not hit else "ชื่อซ้ำหลายสินค้า: " + ", ".join(h["name"] for h in hit)
        rows.append((fn, "?", why + " — เปลี่ยนชื่อไฟล์ให้ตรงชื่อรุ่นในหน้า 'ราคา / โปรโมชัน'", "", "; ".join(notes)))
        bad += 1
        continue
    prod = hit[0]
    pid = prod["id"]
    shutil.copyfile(path, os.path.join(OUT, f"{pid}.glb"))
    entry = {"file": f"{pid}.glb"}
    for ext in (".webp", ".jpg", ".png"):
        pp = os.path.join(A.src, base + ext)
        if os.path.exists(pp):
            if os.path.getsize(pp) > 600 * 1024:
                notes.append(f"โปสเตอร์ {base}{ext} ใหญ่ ({os.path.getsize(pp) // 1024} KB) — ควร ≤ 300 KB")
            shutil.copyfile(pp, os.path.join(OUT, f"{pid}{ext}"))
            entry["poster"] = f"{pid}{ext}"
            break
    tp = os.path.join(A.src, base + ".txt")
    if os.path.exists(tp):
        entry["credit"] = io.open(tp, encoding="utf-8").read().strip()[:140]
    manifest[pid] = entry
    rows.append((fn, "✓", f"→ {prod['name']} ({prod.get('brand') or '-'})", f"{info['size'] / 1048576:.1f} MB · {info['triangles']:,} tris · {info['textures']} tex", "; ".join(notes)))

# the bucket accepts only model/gltf-binary, model/gltf+json and application/octet-stream -> the list is a JSON text file called manifest.bin
# (posters are .webp/.jpg/.png, which the bucket rejects too, so they are NOT used until the bucket's allowed types are extended)
for _v in manifest.values():
    _v.pop("poster", None)
for _fn in os.listdir(OUT):
    if _fn.lower().endswith((".webp", ".jpg", ".png", ".json")):
        os.remove(os.path.join(OUT, _fn))
io.open(os.path.join(OUT, "manifest.bin"), "w", encoding="utf-8", newline="\n").write(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
rep = ["# รายงานเตรียมอัปโหลดโมเดล 3D", "", f"ต้นทาง: `{os.path.abspath(A.src)}`  ·  พร้อมอัปโหลด **{len(manifest)}** ไฟล์  ·  ต้องแก้ **{bad}** ไฟล์", "",
       "| ไฟล์ | สถานะ | ผลจับคู่/ปัญหา | ขนาด | ข้อสังเกต |", "|---|---|---|---|---|"]
rep += [f"| {a} | {b} | {c} | {d} | {e} |" for a, b, c, d, e in rows]
rep += ["", "## ขั้นตอนอัปโหลด",
        "1. เปิด Supabase › Storage › ถัง `product-3d` (โปรเจกต์ระบบร้าน)",
        f"2. อัปโหลด **ทุกไฟล์ในโฟลเดอร์** `{OUT}` (รวม `manifest.bin` — ไฟล์ข้อความ JSON นามสกุล .bin เพราะถังรับเฉพาะ .glb/.gltf/.bin)",
        "3. รีเฟรชหน้า https://djlabsiam.com/shop/ — ปุ่ม 'ดู 3D' ขึ้นที่สินค้าเหล่านั้นเอง ไม่ต้อง push เว็บ",
        "4. ถ้าแก้โมเดลภายหลัง: อัปโหลดทับไฟล์เดิม (ชื่อ = รหัสสินค้า) แล้วแก้ `manifest.bin`"]
io.open(os.path.join(OUT, "REPORT.md"), "w", encoding="utf-8", newline="\n").write("\n".join(rep) + "\n")
print(f"พร้อมอัปโหลด {len(manifest)} · ต้องแก้ {bad}\nโฟลเดอร์: {OUT}")
for r in rows:
    print(" ", r[1], r[0], "|", r[2], "|", r[3], "|", r[4])
