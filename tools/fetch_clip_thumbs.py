#!/usr/bin/env python3
"""Keeps the /content/ clip pictures INSIDE the site (owner, 3 Nov 2026: visitors' browsers must never load pictures from YouTube).

Reads the clips the page can show (the same public function the page calls: web_content_videos, which already leaves out hidden / removed
clips), downloads each one's YouTube thumbnail ON THIS MACHINE, converts it to a small webp and writes

    assets/img/yt/<video_id>.webp     video + podcast  480x270 (16:9) · short 270x480 (9:16)
    assets/img/yt/manifest.json       {"v": 1, "ids": {"<video_id>": "w" | "p"}}   (w = wide, p = portrait) · the page reads this to know which clips have a picture

A clip with no file keeps working: the card shows the brand placeholder. Idempotent: a clip that already has its file is skipped, so a re-run only
fetches new clips. Needs Pillow.  Network: i.ytimg.com (YouTube's thumbnail host) and the shop's Supabase (read-only function).

    python tools/fetch_clip_thumbs.py                 # newest 24 per kind (+ every podcast episode)
    python tools/fetch_clip_thumbs.py --per-kind 60   # deeper
    python tools/fetch_clip_thumbs.py --prune         # also delete files of clips that are hidden / removed now
    python tools/fetch_clip_thumbs.py --dry           # show what would happen, write nothing
"""
import argparse, io, json, os, re, sys, urllib.request

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(SITE, "assets", "img", "yt")
MAX_BYTES = 15000
UA = {"User-Agent": "Mozilla/5.0 (DJ LAB SIAM site tool)"}

ap = argparse.ArgumentParser()
ap.add_argument("--per-kind", type=int, default=24)
ap.add_argument("--prune", action="store_true")
ap.add_argument("--dry", action="store_true")
A = ap.parse_args()

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is needed:  pip install pillow")


def backend():
    b = io.open(os.path.join(SITE, "book", "index.html"), encoding="utf-8").read()
    api = re.search(r"const API='(https://[a-z0-9.-]+\.supabase\.co/rest/v1/rpc/)'", b)
    key = re.search(r"const KEY='([A-Za-z0-9._-]+)'", b)
    if not (api and key):
        sys.exit("cannot read the Supabase address / anon key from book/index.html")
    return api.group(1), key.group(1)


API, KEY = backend()


def rpc(args):
    req = urllib.request.Request(API + "web_content_videos", data=json.dumps(args).encode(),
                                 headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    j = json.load(urllib.request.urlopen(req, timeout=20))
    if not (j and j.get("ok") is True and isinstance(j.get("items"), list)):
        sys.exit("web_content_videos gave an unexpected answer")
    return j


def listed(kind, limit):
    """newest first, up to `limit` clips (None = all)"""
    out, args = [], {"p_limit": 50, "p_kind": kind}
    while True:
        j = rpc(args)
        out += [v for v in j["items"] if re.fullmatch(r"[A-Za-z0-9_-]{11}", str(v.get("id", "")))]
        if not j.get("next") or (limit and len(out) >= limit):
            break
        args = {"p_limit": 50, "p_kind": kind, "p_before": j["next"]["before"], "p_before_id": j["next"]["before_id"]}
    return out[:limit] if limit else out


def get(url):
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read()
    except Exception:
        return None


def cover(im, w, h):
    """scale + centre-crop to exactly w x h"""
    s = max(w / im.width, h / im.height)
    im = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def shrink(im):
    for q in (80, 72, 64, 56, 48, 40, 32, 26, 20):
        b = io.BytesIO()
        im.save(b, "WEBP", quality=q, method=6)
        if b.tell() <= MAX_BYTES:
            return b.getvalue()
    return b.getvalue()   # best effort: still the smallest tried


def make(vid, kind):
    """returns (webp bytes, 'w'|'p') or None when YouTube has no usable picture"""
    if kind == "short":
        for name in ("oar2", "maxresdefault", "hqdefault"):
            d = get(f"https://i.ytimg.com/vi/{vid}/{name}.jpg")
            if d:
                im = Image.open(io.BytesIO(d)).convert("RGB")
                if name == "hqdefault":                       # 4:3 with black bars: keep the central 16:9 band first
                    im = im.crop((0, 45, im.width, im.height - 45))
                return shrink(cover(im, 270, 480)), "p"
        return None
    for name in ("maxresdefault", "sddefault", "hqdefault"):
        d = get(f"https://i.ytimg.com/vi/{vid}/{name}.jpg")
        if d:
            im = Image.open(io.BytesIO(d)).convert("RGB")
            if name in ("sddefault", "hqdefault"):             # 4:3 with black bars top and bottom
                bar = round(im.height * (1 - (im.width * 9 / 16) / im.height) / 2)
                im = im.crop((0, bar, im.width, im.height - bar))
            return shrink(cover(im, 480, 270)), "w"
    return None


want = {}
for kind, limit in (("podcast", None), ("video", A.per_kind), ("short", A.per_kind)):
    for v in listed(kind, limit):
        want[v["id"]] = kind

os.makedirs(OUT, exist_ok=True)
mf_path = os.path.join(OUT, "manifest.json")
try:
    old = json.load(io.open(mf_path, encoding="utf-8")).get("ids", {})
except Exception:
    old = {}

ids, added, failed = {}, 0, []
for vid, kind in want.items():
    f = os.path.join(OUT, vid + ".webp")
    if os.path.exists(f) and vid in old:
        ids[vid] = old[vid]
        continue
    if A.dry:
        print("would fetch", vid, kind)
        continue
    r = make(vid, kind)
    if not r:
        failed.append(vid)
        continue
    io.open(f, "wb").write(r[0])
    ids[vid] = r[1]
    added += 1
    print(f"  + {vid} {kind} {len(r[0])} B")

stale = sorted(f[:-5] for f in os.listdir(OUT) if f.endswith(".webp") and f[:-5] not in want)
if A.prune and not A.dry:
    for s in stale:
        os.remove(os.path.join(OUT, s + ".webp"))
        print("  - pruned", s)
    stale = []
if not A.dry:
    for s in stale:   # kept on disk (and in the manifest) unless --prune; they are no longer in the list, so only report them
        if s in old:
            ids[s] = old[s]
    io.open(mf_path, "w", encoding="utf-8", newline="\n").write(json.dumps({"v": 1, "ids": dict(sorted(ids.items()))}, ensure_ascii=False, indent=1) + "\n")

print(f"clips listed: {len(want)} · new pictures: {added} · no picture from YouTube: {len(failed)} {failed}")
if stale:
    print(f"files of clips no longer listed (hidden / removed / older than --per-kind): {len(stale)} — run with --prune to delete them")
