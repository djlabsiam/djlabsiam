#!/usr/bin/env python3
"""Checks the generated pages (courses/, teachers/*/, content/) before they are pushed.  Exit code 1 = at least one check failed.

  python tools/check_pages.py [--courses PATH]

What it proves: every page was built from the courses.json that is on disk NOW (md5), every price / hour / name / teacher / audience / prerequisite /
track on the pages matches that file, the visible FAQ equals the JSON-LD FAQ, nothing is loaded from another domain, no banned words, no "coming soon"
placeholders, every image has width/height/alt, the privacy policy covers YouTube if any page can load a video, and the sitemap lists exactly the
indexable pages.  Standard library only.
"""
import argparse, glob, hashlib, html, io, json, os, re, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ap = argparse.ArgumentParser()
ap.add_argument("--courses", default=os.path.join(os.path.dirname(SITE), "bots", "bot", "shared", "courses.json"))
A = ap.parse_args()

fails, passes = [], 0


def ok(cond, msg):
    global passes
    if cond:
        passes += 1
    else:
        fails.append(msg)


def read(p):
    with io.open(p, encoding="utf-8") as f:
        return f.read()


def text_of(s):
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


raw = io.open(A.courses, "rb").read()
md5 = hashlib.md5(raw).hexdigest()
D = json.loads(raw.decode("utf-8"))
COURSES, TEACHERS = D["items"], D["instructors"]["items"]

pages = {"courses": os.path.join(SITE, "courses", "index.html"), "content": os.path.join(SITE, "content", "index.html")}
_hp = os.path.join(SITE, "next", "index.html")
pages["home"] = _hp if os.path.exists(_hp) else os.path.join(SITE, "index.html")
_sp = os.path.join(SITE, "next", "shop", "index.html")
pages["shop"] = _sp if os.path.exists(_sp) else os.path.join(SITE, "shop", "index.html")   # /next/ = draft · / = live (after cut-over)
for t in TEACHERS:
    pages["teacher:" + t["name"]] = os.path.join(SITE, "teachers", slug(t["name"]), "index.html")
SRC = {}
for k, p in pages.items():
    ok(os.path.exists(p), f"{k}: file missing ({os.path.relpath(p, SITE)})")
    if os.path.exists(p):
        SRC[k] = read(p)

BANNED = [r"DJplus", r"DJZLEX", r"ZX24", r"Group Class", r"รีวิว", r"★", r"เร็ว ?ๆ ?นี้", r"coming soon"]
ALLOWED_RES_HOSTS = ("djlabsiam.com",)

for k, s in SRC.items():
    # 1. built from the courses.json that is on disk now
    m = re.search(r"courses\.json \(md5 ([0-9a-f]{32})\)", s)
    ok(bool(m) and m.group(1) == md5, f"{k}: built from a different courses.json (page {m.group(1) if m else 'no stamp'} vs now {md5}) — run tools/build_pages.py")
    # 2. structure
    ok(s.count("<h1") == 1, f"{k}: expected exactly one <h1>")
    ok(bool(re.search(r'<html lang="th"[ >]', s)), f"{k}: missing lang=th")
    ok('rel="canonical"' in s, f"{k}: missing canonical")
    ok('class="skip"' in s and 'id="main"' in s, f"{k}: missing skip link / main landmark")
    _lim = 90 if k == "home" else 82 if k == "courses" else 80   # courses 82: the menu links (member, game) pushed it 20 bytes past 80 · home carries the demo markup + Sunday Live slides (its CSS/JS are external files); gzip ~ a quarter of this
    ok(len(s.encode("utf-8")) < _lim * 1024, f"{k}: page is {len(s.encode('utf-8')) // 1024} KB (limit {_lim} KB)")
    # 3. banned words / placeholders (visible text only)
    vis = text_of(s)
    for b in BANNED:
        ok(not re.search(b, vis, re.I), f"{k}: banned phrase {b!r} on the page")
    # 4. nothing loaded from another domain (img / script / iframe / stylesheet / preload / icon)
    for tag, attr in (("img", "src"), ("script", "src"), ("iframe", "src"), ("link", "href")):
        for t in re.findall(rf"<{tag}\b[^>]*>", s):
            if tag == "link" and not re.search(r'rel="(stylesheet|preload|icon|apple-touch-icon)"', t):
                continue
            v = re.search(rf'\b{attr}="([^"]*)"', t)
            if v and re.match(r"https?://", v.group(1)):
                ok(any(v.group(1).startswith("https://" + h) for h in ALLOWED_RES_HOSTS), f"{k}: loads {v.group(1)} from another domain")
            elif v and v.group(1).startswith("//"):
                ok(False, f"{k}: protocol-relative resource {v.group(1)}")
    # 5. images: width/height/alt + the file exists
    for t in re.findall(r"<img\b[^>]*>", s):
        ok("width=" in t and "height=" in t and "alt=" in t, f"{k}: <img> without width/height/alt: {t[:80]}")
        for u in re.findall(r'(?:src|srcset)="([^"]*)"', t):
            for part in u.split(","):
                path = part.strip().split(" ")[0]
                if path.startswith("/"):
                    ok(os.path.exists(os.path.join(SITE, path.lstrip("/").replace("/", os.sep))), f"{k}: image {path} does not exist")

# ---- courses page: every fact comes from courses.json ----
cs = text_of(SRC.get("courses", ""))
for c in COURSES:
    ok(c["title"] in cs, f"courses: title {c['title']!r} missing")
    ok(c["price"] in cs, f"courses: price {c['price']!r} missing for {c['title']}")
    h = re.search(r"(\d+)\s*ครั้ง\s*\((\d+)\s*ชม", c["hours"])
    L = re.search(r"เรียน\s*(\d+)\s*ชม", c["hours"])
    ok(bool(h and L) and f"{h.group(1)} ครั้ง × {h.group(2)} ชม. = {L.group(1)} ชม." in cs, f"courses: hours line of {c['title']} missing/different")
    ok(c["audience"] in cs, f"courses: audience of {c['title']} missing")
    if c.get("prerequisite"):
        ok(c["prerequisite"] in cs, f"courses: prerequisite of {c['title']} missing")
    for tr in c.get("tracks") or []:
        ok(tr["name"] in cs and (tr.get("detail") or "") in cs, f"courses: track {tr['name']!r} of {c['title']} missing")
    for b in c["bullets"]:
        if not b.startswith("เวลารวม"):
            ok(b in cs, f"courses: bullet missing for {c['title']}: {b[:40]}")
    for t in c["instructors"]:
        block = re.search(rf'<article class="course" id="{slug(c["title"].replace(" Class", ""))}">(.*?)</article>', SRC.get("courses", ""), re.S)
        ok(bool(block) and f'href="/teachers/{slug(t)}/"' in block.group(1), f"courses: {t} is not linked in the {c['title']} row")
    ok("ตัวต่อตัว" in cs, "courses: no 'ตัวต่อตัว'")
ok(all(("กลุ่ม" not in c["title"]) for c in COURSES), "courses.json has a course whose title mentions a group")

# ---- no stray numbers: every price / hours line anywhere in a page (visible text AND meta tags) must be one that courses.json produces ----
valid_prices = {c["price"] for c in COURSES}
valid_hours = set()
for c in COURSES:
    h = re.search(r"(\d+)\s*ครั้ง\s*\((\d+)\s*ชม", c["hours"])
    L = re.search(r"เรียน\s*(\d+)\s*ชม", c["hours"])
    if h and L:
        valid_hours.add((h.group(1), h.group(2), L.group(1)))
for k, s in SRC.items():
    blob = html.unescape(s)
    for pr in re.findall(r"\d{1,3}(?:,\d{3})+ บาท", blob):
        ok(pr in valid_prices, f"{k}: stray price {pr!r} (courses.json has {sorted(valid_prices)})")
    for t3 in re.findall(r"(\d+) ครั้ง × (\d+) ชม\. = (\d+) ชม\.", blob):
        ok(t3 in valid_hours, f"{k}: stray hours line {t3} (courses.json has {sorted(valid_hours)})")
raw_courses = SRC.get("courses", "")
for c in COURSES:
    block = re.search(rf'<article class="course" id="{slug(c["title"].replace(" Class", ""))}">(.*?)</article>', raw_courses, re.S)
    if block:
        pr = re.search(r'<b class="price">(.*?)</b>', block.group(1))
        ok(bool(pr) and html.unescape(pr.group(1)) == c["price"], f"courses: the price shown in the {c['title']} row is {pr.group(1) if pr else None!r}, courses.json says {c['price']!r}")

# ---- teacher pages ----
profiles = json.loads(read(os.path.join(SITE, "data", "teacher-profiles.json")))
for t in TEACHERS:
    k = "teacher:" + t["name"]
    s = SRC.get(k, "")
    prof = profiles.get(t["name"], {})
    taught = [c["title"] for c in COURSES if t["name"] in c["instructors"]]
    chips = re.findall(r'class="cchip" href="/courses/#([a-z-]+)"', s)
    ok(chips == [slug(x.replace(" Class", "")) for x in taught], f"{k}: course chips {chips} != courses that list {t['name']}")
    ok(f"<h1>{html.escape(t['name'])}</h1>" in s, f"{k}: h1 is not the teacher's name")
    if t.get("social"):
        ok(html.escape(t["social"]) in s, f"{k}: social link missing")
    ok(("เกี่ยวกับ " + t["name"] in s) == bool(prof.get("bio")), f"{k}: bio section shown/hidden wrongly (bio data {'present' if prof.get('bio') else 'empty'})")
    ok(("<h2>ผลงาน</h2>" in s) == bool(prof.get("highlights")), f"{k}: highlights section shown/hidden wrongly")
    ok(("data-vid=" in s) == bool(prof.get("video_id")), f"{k}: video block shown/hidden wrongly")
    ok(("data-pfs" in s) == bool(prof.get("portfolio")), f"{k}: portfolio slider shown/hidden wrongly")
    ok("ให้ร้านจัดอาจารย์ให้" in s, f"{k}: main CTA missing")

    # live profile script (data from view web_teacher_profiles): fixed address, per-field fallback hooks, DOM written with textContent only, link/video/image guards present
    tp = re.findall(r"<script>\s*\(function\(\)\{\s*/\* live teacher profile.*?</script>", s, re.S)
    ok(len(tp) == 1, f"{k}: expected exactly one live-profile script, found {len(tp)}")
    js = tp[0] if tp else ""
    ok("@@" not in js, f"{k}: live-profile script has an unfilled placeholder")
    ok(f"var SLUG='{slug(t['name'])}'" in js, f"{k}: live-profile script SLUG is not '{slug(t['name'])}'")
    ok(re.search(r"REST='https://[a-z0-9]+\.supabase\.co/rest/v1/web_teacher_profiles'", js) is not None, f"{k}: live-profile script must read only the view web_teacher_profiles")
    ok(re.search(r"IMG='https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/teacher-portfolio/'", js) is not None, f"{k}: live-profile image base must be the public teacher-portfolio bucket")
    ok(not re.search(r"innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function|srcdoc|setAttribute\('(on[a-z]+|style|href|src)'", js), f"{k}: live-profile script must not use innerHTML/outerHTML/insertAdjacentHTML/document.write/eval/inline handlers")
    ok("textContent" in js, f"{k}: live-profile script must write text with textContent")
    ok(all(h in js for h in ("instagram.com", "facebook.com", "tiktok.com", "youtube.com")) and "a.protocol!=='https:'" in js and "a.username||a.password||a.port" in js
       and "rel='noopener noreferrer'" in js, f"{k}: live-profile script lost the social-link host / https / rel guard")
    ok(r"/^[A-Za-z0-9_-]{11}$/.test(v)" in js and "youtube-nocookie.com/embed/" in js, f"{k}: live-profile video id guard (11 chars) or nocookie embed missing")
    ok(r"'^'+SLUG+'/[A-Za-z0-9_-]{1,60}\\.(jpg|webp)$'" in js, f"{k}: live-profile image path must be pinned to the page's own slug folder and jpg/webp")
    ok(s.count('<template id="tp-note">') == 1 and "fc-priv" in s, f"{k}: video privacy note template missing (needed when the video comes from the database)")
    hooks = re.findall(r'<section data-tp="([a-z]+)"', s)
    ok(hooks == [x for x in ("bio", "hl", "pf", "vid", "soc") if x in hooks], f"{k}: data-tp section hooks out of order or unknown: {hooks}")
    for hk, cond in (("bio", prof.get("bio")), ("hl", prof.get("highlights")), ("pf", prof.get("portfolio")), ("vid", prof.get("video_id")), ("soc", t.get("social"))):
        ok((hk in hooks) == bool(cond), f"{k}: static section '{hk}' hook shown/hidden wrongly (the static fallback must stay intact)")
    ok(s.rfind('<div class="stick">') > s.rfind('<section data-tp='), f"{k}: sticky CTA must come after every profile section")

# ---- FAQ: visible == JSON-LD ----
s = SRC.get("courses", "")
vis_faq = [(html.unescape(re.sub(r"<[^>]+>", "", q)), html.unescape(re.sub(r"<[^>]+>", "", a))) for q, a in re.findall(r'<details class="q"[^>]*><summary>(.*?)</summary><p>(.*?)</p></details>', s, re.S)]
ld = [json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)]
faq_ld = next((x for x in ld if x.get("@type") == "FAQPage"), None)
ok(faq_ld is not None, "courses: no FAQPage JSON-LD")
if faq_ld:
    ld_pairs = [(e["name"], e["acceptedAnswer"]["text"]) for e in faq_ld["mainEntity"]]
    ok(vis_faq == ld_pairs, f"courses: visible FAQ ({len(vis_faq)}) differs from JSON-LD FAQ ({len(ld_pairs)})")
    ok(len(vis_faq) == len(json.loads(read(os.path.join(SITE, "data", "faq.json")))["items"]), "courses: FAQ count differs from data/faq.json")
ok(sum("ชำระเงิน" in q for q, _ in vis_faq) == 1, "courses: the FAQ must have exactly one payment question")
for q, a in vis_faq:
    ok("{" not in a and "}" not in a, f"courses: unfilled placeholder in FAQ answer: {a[:50]}")
    if "ชำระเงิน" in q:
        ok("ยังไม่มีบริการผ่อนชำระ" in a and "LINE @djlabsiam เท่านั้น" in a, f"courses: the payment answer must say 'no installments yet' and that the account number is given on LINE only: {a[:60]}")
        ok(not any(len(re.sub(r"\D", "", m)) >= 10 for m in re.findall(r"\d[\d\- ]*\d", a)), f"courses: the payment answer must not contain a bank account number (a run of 10+ digits): {a[:60]}")
    if "เลื่อน" in q:
        ok("อย่างน้อย 3 วัน" in a and not re.search(r"(?<!\d)[12](?!\d)\s*(?:[–-]\s*[12]\s*)?วัน", a), f"courses: the reschedule answer must say 'at least 3 days' and never a 1–2 day case: {a[:60]}")

# ---- home page (generated): same single sources as /courses/, one FAQ for both the visible list and the JSON-LD ----
if "home" in SRC:
    hs = SRC["home"]
    hcfg = json.loads(read(os.path.join(SITE, "data", "faq-home.json")))
    ok(len(re.findall(r'<details class="q"', hs)) == len(hcfg["ids"]) + len(hcfg["extra"]), "home: FAQ count differs from data/faq-home.json")
    hvis = [(html.unescape(re.sub(r"<[^>]+>", "", q)), html.unescape(re.sub(r"<[^>]+>", "", a))) for q, a in re.findall(r'<details class="q"[^>]*><summary>(.*?)</summary><p>(.*?)</p></details>', hs, re.S)]
    hld = [json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>', hs, re.S)]
    hfaq = next((x for x in hld if x.get("@type") == "FAQPage"), None)
    ok(hfaq is not None and hvis == [(e["name"], e["acceptedAnswer"]["text"]) for e in hfaq["mainEntity"]], "home: visible FAQ differs from JSON-LD FAQPage")
    for _, a in hvis:
        ok("{" not in a and "}" not in a, f"home: unfilled placeholder in FAQ answer: {a[:40]}")
    graph = next((x for x in hld if "@graph" in x), {"@graph": []})["@graph"]
    types = [n.get("@type") for n in graph]
    ok("Organization" in types and ["MusicSchool", "Store"] in types and "WebSite" in types, "home: JSON-LD Organization / MusicSchool+Store / WebSite missing")
    ok("02-252-5868" in hs and "https://maps.google.com/?cid=14947686714332238791" in hs, "home: phone / map link missing")
    ok(hs.count("<h1") == 1 and "ซื้อ เรียน ซ้อม พร้อม DJ" in hs, "home: h1 missing")

# ---- shop: prices come live from the web view only; DB text is never HTML; no 3D files; VAT wording ----
sh = SRC.get("shop", "")
if sh:
    scr = "\n".join(re.findall(r"<script>(.*?)</script>", sh, re.S))
    vis_sh = text_of(sh)
    ok("/rest/v1/web_products" in scr and "bot_products" not in sh, "shop: must read web_products and never bot_products")
    ok("service_role" not in sh, "shop: a service key must never be on a public page")
    ok(not re.search(r"innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function", scr), "shop: the page script must never turn database text into HTML")
    ok("รวม VAT 7%" in vis_sh, "shop: the VAT wording is missing")
    ok("product-images" in scr, "shop: product photos come from the public bucket")
    # 3D: the viewer is only loaded on click from a self-hosted file; the page itself must not reference any real model file, a CDN viewer or an inline <model-viewer>
    ok(not re.search(r"https?://[^'\"]*\.glb|<model-viewer|unpkg\.com|cdn\.jsdelivr|ajax\.googleapis", sh), "shop: a 3D model file or CDN viewer is hard-coded on the page")
    ok(not re.search(r'<script[^>]+src="https?://', sh), "shop: no third-party script tags")
    ok("/assets/vendor/model-viewer.min.js" in scr and "product-3d/" in scr, "shop: the 3D viewer must be the self-hosted file and models must come from the product-3d bucket")
    ok(os.path.exists(os.path.join(SITE, "assets", "vendor", "model-viewer.min.js")) and os.path.exists(os.path.join(SITE, "assets", "vendor", "LICENSE-model-viewer.txt")), "shop: self-hosted model-viewer or its licence file is missing")
    ok(sh.count("<h1") == 1 and "สอบถามโปรโมชัน" in vis_sh, "shop: h1 / promotion note missing")
    _bk = read(os.path.join(SITE, "book", "index.html"))
    b_key2 = re.search(r"const KEY='([^']+)'", _bk)
    ok(bool(b_key2) and f"KEY='{b_key2.group(1)}'" in scr, "shop: the anon key must be the one /book/ uses")

# ---- course pictures: shown exactly for the courses listed in data/course-images.json ----
cimg = json.loads(read(os.path.join(SITE, "data", "course-images.json")))
for c in COURSES:
    block = re.search(rf'<article class="course" id="{slug(c["title"].replace(" Class", ""))}">(.*?)</article>', SRC.get("courses", ""), re.S)
    has = bool(block) and "<figure" in block.group(1)
    ok(has == bool(cimg.get(c["title"])), f"courses: picture of {c['title']} is {'shown' if has else 'hidden'} but data/course-images.json says otherwise")

# ---- images: every /assets/img file a generated page points at exists; the teacher cut-outs are transparent (the dark panel + red glow need the alpha) ----
for k, s in SRC.items():
    for u in sorted(set(re.findall(r"/assets/img/[\w.\-]+\.(?:webp|png|jpe?g|svg)", s))):
        ok(os.path.exists(os.path.join(SITE, u.lstrip("/").replace("/", os.sep))), f"{k}: image {u} does not exist")


def webp_has_alpha(p):
    with open(p, "rb") as fh:
        h = fh.read(32)
    return h[:4] == b"RIFF" and h[8:12] == b"WEBP" and h[12:16] == b"VP8X" and bool(h[20] & 0x10)


for t in TEACHERS:
    for w in (320, 640):
        p = os.path.join(SITE, "assets", "img", f"teacher-{slug(t['name'])}-cut-{w}.webp")
        ok(os.path.exists(p) and webp_has_alpha(p), f"teacher:{t['name']}: assets/img/teacher-{slug(t['name'])}-cut-{w}.webp is missing or has no transparency")
        ok(f"/assets/img/teacher-{slug(t['name'])}-cut-{w}.webp" in SRC.get("teacher:" + t["name"], ""), f"teacher:{t['name']}: page does not use the {w}px cut-out")

# ---- YouTube ↔ privacy policy ----
if any("youtube-nocookie" in s for s in SRC.values()):
    for pol in ("privacy.html", "privacy-en.html"):
        ok("youtube-nocookie" in read(os.path.join(SITE, pol)), f"a page can load a YouTube video but {pol} does not mention youtube-nocookie")

# ---- sitemap == indexable pages ----
sm = read(os.path.join(SITE, "sitemap.xml"))
locs = re.findall(r"<loc>([^<]+)</loc>", sm)
for k, s in SRC.items():
    path = "/" + os.path.relpath(pages[k], SITE).replace(os.sep, "/").replace("index.html", "")
    listed = ("https://djlabsiam.com" + path) in locs
    noindex = bool(re.search(r'name="robots" content="[^"]*noindex', s))
    ok(listed != noindex, f"{k}: sitemap listing ({listed}) must be the opposite of noindex ({noindex})")

# ---- artist names (owner-approved 6 Oct) only inside Maniac's own list of achievements: never elsewhere, never in <head>, headings, alt text ----
ARTISTS = ["Blackpink", "Lisa", "Jennie", "Dajim", "Zentyarb", "K.aglet"]
for k, s in SRC.items():
    head = s.split("</head>")[0]
    heads = " ".join(re.findall(r"<h[1-4][^>]*>.*?</h[1-4]>", s, re.S))
    alts = " ".join(re.findall(r'alt="([^"]*)"', s))
    for n in ARTISTS:
        if k != "teacher:Maniac":
            ok(n not in s, f"{k}: artist name {n!r} appears outside Maniac's page")
        else:
            ok(n not in head, f"{k}: artist name {n!r} in <head> (title/meta/og)")
            ok(n not in heads, f"{k}: artist name {n!r} in a heading")
            ok(n not in alts, f"{k}: artist name {n!r} in image alt text")

# ---- personal data must not sit in the public data files ----
for fp in sorted(glob.glob(os.path.join(SITE, "data", "*.json"))):
    fn = os.path.basename(fp)
    s = read(fp)
    ok(not re.search(r"\b0\d{2}[- ]?\d{3}[- ]?\d{4}\b|\+66\d{8,9}|[\w.]+@[\w.]+\.\w{2,}", s.replace("02-252-5868", "").replace("@djlabsiam", "").replace("@DJLABSIAM", "")), f"data/{fn}: looks like a phone number or e-mail address")

# ---- Meta Pixel: one ID in one file · never on /book/ · every page that carries the script has the off switch · policies cover it when it can run ----
PX = os.path.join(SITE, "assets", "js", "meta-pixel.js")
ok(os.path.exists(PX), "assets/js/meta-pixel.js is missing")
px = read(PX) if os.path.exists(PX) else ""
ids = re.findall(r'var PIXEL_ID = "([^"]*)"', px)
ok(len(ids) == 1 and re.fullmatch(r"(\d{15,16})?", ids[0]) is not None, "meta-pixel.js: PIXEL_ID must be set exactly once, to 15–16 digits or empty")
PIXEL_ID = ids[0] if len(ids) == 1 else ""
site_html = [f for f in glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True) if not any(os.sep + x + os.sep in f for x in ("design-system", "node_modules", ".git", "vendor"))]
site_text = site_html + [f for ext in ("js", "json", "xml") for f in glob.glob(os.path.join(SITE, "**", "*." + ext), recursive=True) if f != PX and not any(os.sep + x + os.sep in f for x in ("design-system", "node_modules", ".git", "vendor"))]
for f in site_text:
    s = read(f)
    rel = os.path.relpath(f, SITE)
    ok("fbq(" not in s and "connect.facebook.net" not in s, f"{rel}: Pixel code outside assets/js/meta-pixel.js")
    ok(not PIXEL_ID or PIXEL_ID not in s, f"{rel}: the Pixel ID must appear only in assets/js/meta-pixel.js")
for f in site_html:
    s = read(f)
    rel = os.path.relpath(f, SITE).replace(os.sep, "/")
    has_script, has_switch = "/assets/js/meta-pixel.js" in s, "data-pixel-toggle" in s and "data-pixel-row" in s
    ok(has_script == has_switch, f"{rel}: carries the Pixel script ({has_script}) but the off switch is {'there' if has_switch else 'missing'} (both or neither)")
    if rel.startswith("book/"):
        ok(not has_script and not has_switch, f"{rel}: the booking page must not carry the Pixel (it holds customers' names and phone numbers)")
for rel in ("index.html", "privacy.html", "privacy-en.html"):
    s = read(os.path.join(SITE, rel))
    ok("/assets/js/meta-pixel.js" in s, f"{rel}: Pixel script missing")
for k, s in SRC.items():
    ok("/assets/js/meta-pixel.js" in s and "data-pixel-toggle" in s, f"{k}: Pixel script or off switch missing")
tracked = re.findall(r'fbq\("track", "(\w+)"(?:, \{([^}]*)\})?', px)
ok({n for n, _ in tracked} == {"PageView", "ViewContent", "Contact"}, f"meta-pixel.js tracks {sorted({n for n, _ in tracked})}, expected exactly PageView, ViewContent, Contact")
sent = {k for _, body in tracked for k in re.findall(r"(\w+):", body)}
ok(sent <= {"content_name", "content_category", "channel"}, f"meta-pixel.js sends parameters {sorted(sent)}: only content_name, content_category, channel are allowed")
ok(px.find('fbq("set", "autoConfig", false, PIXEL_ID)') != -1 and px.find('fbq("set", "autoConfig", false, PIXEL_ID)') < px.find('fbq("init", PIXEL_ID);'), "meta-pixel.js: autoConfig must be switched off before init, and init must pass no user data")
if PIXEL_ID:
    th, en = read(os.path.join(SITE, "privacy.html")), read(os.path.join(SITE, "privacy-en.html"))
    ok("Meta Pixel" in th and "ปิดการวัดผลโฆษณา" in th, "the Pixel can run but privacy.html does not describe Meta Pixel and the off switch")
    ok("Meta Pixel" in en and "Turn off ad measurement" in en, "the Pixel can run but privacy-en.html does not describe Meta Pixel and the off switch")
    ok("ไม่มีสคริปต์วัดผลหรือติดตามการเข้าชม" not in th, "privacy.html still says there is no tracking script while the Pixel can run")
    ok("no shop analytics or tracking scripts run" not in en, "privacy-en.html still says there are no tracking scripts while the Pixel can run")
# teacher profile pages publish what each teacher wrote: both policies carry the owner-approved line (always, not only when the Pixel can run)
th, en = read(os.path.join(SITE, "privacy.html")), read(os.path.join(SITE, "privacy-en.html"))
ok("<p>เนื้อหาในหน้าโปรไฟล์อาจารย์ (ประวัติ ผลงาน ลิงก์ และรูปภาพ) เป็นข้อมูลที่อาจารย์แต่ละท่านเลือกเผยแพร่ด้วยตนเอง</p>" in th, "privacy.html lost the owner-approved line about teacher profile content (teachers publish it themselves)")
ok("<p>The content on each teacher's profile page (biography, achievements, links and images) is information that each teacher has chosen to publish themselves.</p>" in en, "privacy-en.html lost the owner-approved line about teacher profile content (teachers publish it themselves)")

# ---- slide pop-up (assets/js/popup.js + data/popup.json): on every generated page, never on /book/, fed only by the admin file + the public promotions function, DOM via textContent ----
pj = read(os.path.join(SITE, "assets", "js", "popup.js"))
pcss = read(os.path.join(SITE, "assets", "css", "popup.css"))
bk = read(os.path.join(SITE, "book", "index.html"))
bk_api, bk_key = re.search(r"const API='(https://[a-z0-9.-]+\.supabase\.co/rest/v1/rpc/)'", bk), re.search(r"const KEY='([A-Za-z0-9._-]+)'", bk)
ok(bool(bk_api and bk_key) and f"var RPC = '{bk_api.group(1)}bot_promotions'" in pj and f"KEY = '{bk_key.group(1)}'" in pj, "popup.js: the database address / anon key differ from book/index.html (or are missing)")
ok(not re.search(r"innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|srcdoc", pj), "popup.js must not use innerHTML/outerHTML/insertAdjacentHTML/document.write/eval")
ok("textContent" in pj and "a.protocol === 'https:'" in pj and "!a.username && !a.password && !a.port" in pj and "rel = 'noopener noreferrer'" in pj, "popup.js lost its link guard (https + allowed host + rel)")
ok("/^[A-Za-z0-9_-]{1,60}\\.(webp|jpg|png)$/" in pj and "'/assets/img/popup/'" in pj, "popup.js: slide images must come only from /assets/img/popup/ with a plain file name")
ok("sessionStorage" in pj and "prefers-reduced-motion" in pj and "e.key === 'Escape'" in pj and "e.key !== 'Tab'" in pj, "popup.js: once-per-session, reduced-motion, Esc and focus-trap handling must stay")
ok("aria-modal" in pj and ".inert = true" in pj and "de.style.overflow = 'hidden'" in pj and "n.inert = false" in pj, "popup.js: the pop-up is a full-page gate — aria-modal, inert page behind it, scroll lock, and everything given back on close")
ok(r"/^\/book\//.test(location.pathname)" in pj, "popup.js must stay off /book/")
ok(not re.search(r"฿|baht|promoPrice|regularPrice|\.products|\.conditions|\.gift|gifts|\.price", pj), "popup.js must not read or show prices, products, gifts or conditions of a promotion (owner: name + end date only)")
ok("pic(images[typeof p.id === 'string' ? p.id : '']) || pic(images['default'])" in pj, "popup.js: every promotion slide must get its own picture (by promotion id) or the default picture")
ok("str(p.name, 140)" in pj and "str(it.title, 90)" in pj, "popup.js: promotion names from the database allow 140 characters (long names are real), admin titles 90")
ok("localStorage.setItem(SKIP" in pj and "localStorage.removeItem(SKIP)" in pj and "hidden.indexOf(keyOf(s)) >= 0" in pj and "ไม่ต้องแสดงอีกในครั้งต่อไป" in pj, "popup.js: the 'don't show again' tick must remember the slides seen and show the pop-up again when a slide is new")
ok("facebook.com/plugins/video.php?href=" in pj and "pl.addEventListener('click', function () { playVideo(i, false); })" in pj and "FBEMBED.test(it.embed)" in pj and "s.autoplay) playVideo(i, true)" in pj, "popup.js: a Facebook video is embedded only after a press (or muted when the admin sets autoplay), and only for a valid facebook.com video address")
ok("ไม่เรียกข้อมูลใดจาก Facebook" not in pj and "ก่อนกดเล่น หน้านี้ไม่เรียก" not in pj, "popup.js: must not claim the page calls nothing from Facebook before a press (the Meta Pixel runs on every page) — say only that the Facebook player loads on press")
ok(r"var SPEMBED = /^https:\/\/open\.spotify\.com\/embed\/episode\/([A-Za-z0-9]{22})$/;" in pj and pj.count("open.spotify.com") == 1 and pj.count("document.createElement('iframe')") == 1 and "autoplay: !!embed && !sp && it.autoplay === true" in pj
   and "f.setAttribute('sandbox'," in pj and "s.spotify ? 'encrypted-media; fullscreen" in pj and "pb.addEventListener('click', function () { playVideo(i, false); })" in pj,
   "popup.js: the Spotify player must be one exact open.spotify.com/embed/episode/<22 characters> address, created in one place only after a press (no iframe before), sandboxed, never autoplay")
ok("ตัวเล่นของ Spotify จะโหลดเมื่อกดเท่านั้น" in pj and "ไม่เรียกข้อมูลใดจาก Spotify" not in pj and "ไม่เรียกข้อมูลจากบุคคลที่สาม" not in pj, "popup.js: the Spotify note must say only that the Spotify player loads when pressed (the Meta Pixel runs on every page — never claim nothing third-party is called before a press)")
ok(".dpop-s.bare .dpop-b h2" in pcss and "clip:rect(0 0 0 0)" in pcss and ".dpop-v.sp iframe" in pcss, "popup.css: a bare slide must hide the words on the picture visually (not from screen readers) and size the Spotify player")
ok("(max-width: 700px)" in pj and "<picture>" not in pj and "createElement('picture')" in pj, "popup.js: slides must use a portrait picture on phones (picture/source)")
ok("position:fixed;inset:0;z-index:200" in pcss and "@media (prefers-reduced-motion:reduce)" in pcss and "@media (max-width:700px)" in pcss, "popup.css missing the pop-up styles / reduced-motion rule")
pv = hashlib.md5(io.open(os.path.join(SITE, "assets", "js", "popup.js"), "rb").read() + io.open(os.path.join(SITE, "assets", "css", "popup.css"), "rb").read()).hexdigest()[:8]
for k, s in SRC.items():
    if k in ("home-next",):
        continue
    ok(s.count('<script src="/assets/js/popup.js?v=' + pv + '" defer></script>') == 1, f"{k}: popup script must be on the page exactly once with the current version {pv}")
pop = json.loads(read(os.path.join(SITE, "data", "popup.json")))
ok(isinstance(pop.get("items"), list) and len(pop["items"]) <= 8 and isinstance(pop.get("enabled"), bool) and isinstance(pop.get("autoPromotions"), bool), "data/popup.json: need enabled/autoPromotions booleans and items[] with at most 8 entries")
POP_HOSTS = {"facebook.com", "www.facebook.com", "fb.watch", "instagram.com", "www.instagram.com", "youtube.com", "www.youtube.com", "youtu.be", "tiktok.com", "www.tiktok.com", "line.me", "lin.ee", "djlabsiam.com", "www.djlabsiam.com", "console.djlabsiam.com"}
pim = pop.get("promoImages", {})
ok(isinstance(pim, dict) and "default" in pim, "data/popup.json: promoImages must exist and have a \"default\" picture (every promotion needs one)")
for pk, pv in (pim.items() if isinstance(pim, dict) else []):
    ok(isinstance(pv, dict) and re.fullmatch(r"[A-Za-z0-9_-]{1,60}\.(webp|jpg|png)", str(pv.get("img", ""))) is not None and os.path.exists(os.path.join(SITE, "assets", "img", "popup", str(pv.get("img", "")))) and bool(str(pv.get("alt", "")).strip()),
       f"data/popup.json promoImages[{pk}]: img must be a plain file name that exists in assets/img/popup/ and needs alt text")
for who, pv in [("newsImage", pop.get("newsImage"))] + [(f"promoImages[{k}]", v) for k, v in (pim.items() if isinstance(pim, dict) else [])]:
    ok(isinstance(pv, dict) and re.fullmatch(r"[A-Za-z0-9_-]{1,60}-m\.(webp|jpg|png)", str(pv.get("imgM", ""))) is not None and os.path.exists(os.path.join(SITE, "assets", "img", "popup", str(pv.get("imgM", "")))),
       f"data/popup.json {who}: imgM (portrait picture for phones, file name ending -m) must exist in assets/img/popup/")
ok(isinstance(pop.get("newsImage"), dict) and os.path.exists(os.path.join(SITE, "assets", "img", "popup", str(pop["newsImage"].get("img", "")))), "data/popup.json: newsImage (backdrop for slides without their own picture) must exist")
from PIL import Image as _PI
for pv in [pop.get("newsImage")] + list(pim.values() if isinstance(pim, dict) else []) + [it for it in pop.get("items", []) if isinstance(it, dict) and it.get("img")]:
    for fk, want in (("img", (1920, 1080)), ("imgM", (1080, 1920))):
        fp = os.path.join(SITE, "assets", "img", "popup", str((pv or {}).get(fk, "")))
        if os.path.exists(fp):
            with _PI.open(fp) as _im:
                ok(_im.size == want, f"popup picture {os.path.basename(fp)} is {_im.size[0]}x{_im.size[1]}, expected {want[0]}x{want[1]}")
for _pg in SRC.values():
    ok("open.spotify.com/embed" not in _pg, "a page must not carry a Spotify player address before a press (Spotify is loaded by popup.js only after a press)")
for i, it in enumerate(pop.get("items", [])):
    w = f"data/popup.json item {i + 1}"
    ok(isinstance(it, dict) and 1 <= len(str(it.get("title", "")).strip()) <= 90, f"{w}: title is required (1-90 characters)")
    if not isinstance(it, dict):
        continue
    ok(it.get("type", "news") in ("news", "promo", "facebook", "podcast", "update"), f"{w}: type must be news | promo | facebook | podcast | update")
    if it.get("embed"):
        ok(re.fullmatch(r"https://(www\.)?facebook\.com/(reel/\d{5,25}|watch/?\?v=\d{5,25}|[A-Za-z0-9.\-]{5,60}/videos/\d{5,25})/?", it["embed"]) is not None
           or re.fullmatch(r"https://open\.spotify\.com/embed/episode/[A-Za-z0-9]{22}", it["embed"]) is not None, f"{w}: embed must be a facebook.com reel / watch?v= / videos address or an open.spotify.com/embed/episode/<22 characters> address")
        ok("autoplay" not in it or it["autoplay"] is False or "spotify" not in it["embed"], f"{w}: a Spotify embed must never autoplay")
    ok(it.get("bare") in (None, True, False) and (not it.get("bare") or bool(it.get("img"))), f"{w}: bare needs a picture (img)")
    ok(it.get("autoplay") in (None, True, False), f"{w}: autoplay must be true or false")
    ok(len(str(it.get("text", ""))) <= 220 and len(str(it.get("cta", ""))) <= 30 and len(str(it.get("alt", ""))) <= 120, f"{w}: text ≤ 220, cta ≤ 30, alt ≤ 120 characters")
    for dk in ("from", "until"):
        ok(dk not in it or re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(it[dk])) is not None, f"{w}: {dk} must be YYYY-MM-DD")
    if it.get("link"):
        u = urllib.parse.urlparse(it["link"])
        ok((it["link"].startswith("/") and not it["link"].startswith("//") and "\\" not in it["link"]) or (u.scheme == "https" and u.hostname in POP_HOSTS and not u.username and not u.port), f"{w}: link must be a site path or https on an allowed host")
    if it.get("img"):
        ok(re.fullmatch(r"[A-Za-z0-9_-]{1,60}\.(webp|jpg|png)", it["img"]) is not None and os.path.exists(os.path.join(SITE, "assets", "img", "popup", it["img"])), f"{w}: img must be a plain file name that exists in assets/img/popup/")
        ok(bool(str(it.get("alt", "")).strip()), f"{w}: an image needs alt text")

# ---- /content/: the clip list comes from the database through one public function; YouTube is touched only after a press; nothing from the database is ever treated as HTML ----
for k, s in SRC.items():
    ok(s.count("/assets/js/meta-pixel.js") == 1, f"{k}: the Pixel script must be on the page exactly once")
c = SRC.get("content", "")
cs = "\n".join(re.findall(r"<script>(.*?)</script>", c, re.S))            # inline page scripts only (the Pixel and JSON-LD tags have attributes)
book = read(os.path.join(SITE, "book", "index.html"))
b_api, b_key = re.search(r"const API='([^']+)'", book), re.search(r"const KEY='([^']+)'", book)
ok(bool(b_api and b_key) and f"API='{b_api.group(1)}'" in cs and f"KEY='{b_key.group(1)}'" in cs, "content: the Supabase address / anon key must be the ones /book/ uses")
ok("fetch(API+'web_content_videos'" in cs, "content: the page must call web_content_videos")
ok("args.p_before=g.next.before" in cs and "args.p_before_id=g.next.before_id" in cs, "content: loading more must send both before and before_id")
ok(all(f"['{k_}'," in cs for k_ in ("podcast", "video", "short")), "content: the list must be split into podcast / video / short")
ok(bool(cs) and not re.search(r"innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function", cs), "content: the page script must never turn database text into HTML (innerHTML / outerHTML / insertAdjacentHTML / document.write / eval)")
ok("service_role" not in c, "content: a service key must never be on a public page")
ok("<iframe" not in c, "content: no iframe may exist in the page before a press (it is created on click)")
ok("youtube-nocookie.com/embed" not in re.sub(r"<script>.*?</script>", "", c, flags=re.S), "content: the YouTube player address may only appear in the click handler script, not in the page itself")
ok(re.search(r"el\('button','btn pri sm'", cs) is not None and "btn.addEventListener('click',function(){play(li,v,btn)})" in cs and "f.src='https://www.youtube-nocookie.com/embed/'" in cs, "content: the player must be created by the play button's click handler")
ok("role','alert'" in cs and "ลองใหม่" in cs, "content: the failed-to-load state (red banner with a retry button) is missing")
ok("https://www.youtube.com/@DJLABSIAM" in c and "ตอนนี้ยังไม่มีคลิปแสดงที่หน้านี้" in cs, "content: the empty state (message + link to the YouTube channel) is missing")
ok('href="https://open.spotify.com/show/15ihoWgHK0fzmoyvvVqA2a" target="_blank" rel="noopener"' in c, "content: the Spotify button is missing or is not the owner's show")
ok("#clips [hidden]{display:none!important}" in c, "content: the CSS rule that makes the hidden attribute win over .btn is missing (the 'load more' and play buttons would show when they should not)")
ok("ytcta" not in c and "<h2>คลิปบน YouTube</h2>" not in c, "content: the old bottom 'YouTube clips' block must stay removed (the channel button at the top and the empty state already link to the channel)")

# ---- /member/: member sign-in. Not linked, noindex, no Meta Pixel, no pop-up; talks only to the shop's Supabase (member-auth function · web_member_me · token refresh); never shows an e-mail ----
mp = os.path.join(SITE, "member", "index.html")
ok(os.path.exists(mp), "member/index.html is missing (run tools/build_pages.py)")
if os.path.exists(mp):
    mh, mj = read(mp), read(os.path.join(SITE, "assets", "js", "member.js"))
    ok(bool(re.search(r'name="robots" content="noindex,nofollow"', mh)) and "/member/" not in read(os.path.join(SITE, "sitemap.xml")), "member: must be noindex,nofollow and absent from sitemap.xml")
    ok("meta-pixel.js" not in mh and "data-pixel" not in mh and "popup.js" not in mh and "fbq(" not in mh, "member: no Meta Pixel and no pop-up on the sign-in page (member codes / phone numbers are typed here)")
    ok(mh.count("<h1") == 1 and 'id="mem"' in mh, "member: expected one <h1> and the #mem container")
    _mv = hashlib.md5(io.open(os.path.join(SITE, "assets", "js", "member.js"), "rb").read()).hexdigest()[:8]
    ok(mh.count(f'<script src="/assets/js/member.js?v={_mv}" defer></script>') == 1, f"member: member.js must be on the page once with the current version {_mv} (run tools/build_pages.py)")
    ok(re.search(r'data-fn="https://[a-z0-9]+\.supabase\.co/functions/v1/member-auth"', mh) is not None, "member: data-fn must be the shop's member-auth function address")
    ok(not re.search(r"innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function", mj), "member.js must not use innerHTML/outerHTML/insertAdjacentHTML/document.write/eval")
    ok(not re.search(r"signInWithOtp|resetPasswordForEmail|signUp|getUser|user\.email|\.email\b|supabase-js|jsdelivr|unpkg|cdnjs", mj), "member.js: never show or request an e-mail, never use the standard Supabase e-mail sign-in calls, never load a library")
    ok(mj.count("static.line-scdn.net") == 1 and "function loadLiff" in mj and mj.count("loadLiff()") == 3, "member.js: the LINE script address must appear once and be loaded only through loadLiff() after a press")
    ok("localStorage.setItem(STORE, JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || 0 }))" in mj, "member.js: the only thing kept in the browser is the session tokens (never password / phone / member code)")
    ok(all(a in mj for a in ("'request_otp'", "'verify_otp'", "'login'", "'link_line'", "'me'")) and "p.length < 10" in mj and "> 72" in mj and "grant_type=refresh_token" in mj, "member.js: it must use the five member-auth actions and check the password rules (>= 10 characters, <= 72 bytes, not digits only / one repeated character) before sending")
    ok("'ขอรหัสใหม่ได้ในอีก '" in mj and "n = 60" in mj, "member.js: the resend button must stay closed for 60 seconds")
    ok("ส่งไปที่" not in mj and "ไม่พบสมาชิก" not in mj, "member.js: never say where the code was sent or that the member was not found (the server answers with one generic message)")
    ok("เปิด 12:00–20:00" in mh and "ตรวจกล่องสแปม" in mh, "member: the help line (staff hours + spam folder) must sit under the code forms")
    _ml, _bl = re.search(r'data-liff="([0-9]+-[A-Za-z0-9]+)"', mh), re.search(r"const LIFF_ID='([0-9]+-[A-Za-z0-9]+)'", read(os.path.join(SITE, "book", "index.html")))
    ok(bool(_ml and _bl) and _ml.group(1) == "2010938781-AaiycM1b" and _ml.group(1) != _bl.group(1), "member: /member/ must use its own LIFF app (2010938781-AaiycM1b, endpoint /member/, scope openid), different from the booking page's LIFF_ID")
    ok(all(f'id="v-{v}"' in mh for v in ("boot", "login", "first", "verify", "line", "profile")), "member: one of the six screens is missing")

print(f"check_pages: {passes} passed, {len(fails)} failed · courses.json md5 {md5}")
for f in fails:
    print("  FAIL", f)
sys.exit(1 if fails else 0)
