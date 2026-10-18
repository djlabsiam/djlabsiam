#!/usr/bin/env python3
"""Builds the static pages  /courses/  ·  /teachers/<name>/ (x6)  ·  /content/  from the shop's single source of truth.

  courses.json   bots/bot/shared/courses.json   (courses, prices, hours, audience, prerequisite, tracks, teachers)   <- NEVER retyped here
  data/teacher-profiles.json   per-teacher bio / video (empty = that section is not shown at all)
  data/faq.json                FAQ (numbers are {placeholders} filled from courses.json) - the visible FAQ and the JSON-LD both come from it
  data/programs.json           regular programmes of /content/

Each generated file carries the md5 of the courses.json it was built from; tools/check_pages.py compares that with the current file before every push.
Standard library only.  Usage (from anywhere):  python tools/build_pages.py [--courses PATH] [--profiles PATH] [--out DIR]
"""
import argparse, hashlib, html, io, json, os, re, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cdj_demo, siam_skyline

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ORIGIN = "https://djlabsiam.com"
LINE_ADD = "https://line.me/ti/p/@djlabsiam"
LINE_MSG = "https://line.me/R/oaMessage/%40djlabsiam/?"   # the message goes straight after "?" (not "?text=")
E = html.escape


def die(msg):
    sys.exit("build_pages: " + msg)


ap = argparse.ArgumentParser()
ap.add_argument("--courses", default=os.path.join(os.path.dirname(SITE), "bots", "bot", "shared", "courses.json"))
ap.add_argument("--profiles", default=os.path.join(SITE, "data", "teacher-profiles.json"))
ap.add_argument("--faq", default=os.path.join(SITE, "data", "faq.json"))
ap.add_argument("--programs", default=os.path.join(SITE, "data", "programs.json"))
ap.add_argument("--course-images", default=os.path.join(SITE, "data", "course-images.json"))
ap.add_argument("--out", default=SITE)
ap.add_argument("--home", default="/next/", help="where the home page is written: /next/ = draft (noindex) · / = live home")
ap.add_argument("--home-faq", default=os.path.join(SITE, "data", "faq-home.json"))
ap.add_argument("--shop", default="/next/shop/", help="where the shop page is written: /next/shop/ = draft (noindex) · /shop/ = live")
A = ap.parse_args()


def load(p):
    with io.open(p, encoding="utf-8") as f:
        return json.load(f)


RAW = io.open(A.courses, "rb").read()
MD5 = hashlib.md5(RAW).hexdigest()
D = json.loads(RAW.decode("utf-8"))
COURSES = D["items"]
TEACHERS = D["instructors"]["items"]
PROFILES = load(A.profiles)
FAQ = load(A.faq)["items"]
_PROG = load(A.programs)
PROGRAMS = _PROG["items"]
LISTEN = _PROG["listen"]
CIMG = load(A.course_images) if os.path.exists(A.course_images) else {}   # per-course picture: {file, w, h, alt} or null = no picture, no empty space


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def short(title):
    return title.replace(" Class", "")


def cid(title):
    return slug(short(title))


# ───────── consistency of the inputs (stop instead of publishing something half-true) ─────────
names = [t["name"] for t in TEACHERS]
pk = [k for k in PROFILES if not k.startswith("_")]
if sorted(pk) != sorted(names):
    die(f"teacher-profiles.json keys {sorted(pk)} != teachers in courses.json {sorted(names)}")
for c in COURSES:
    for t in c["instructors"]:
        if t not in names:
            die(f"{c['title']} lists instructor {t!r} who is not in instructors.items")
    for k in ("title", "price", "hours", "audience", "bullets", "instructors"):
        if k not in c:
            die(f"{c['title']} has no {k!r}")
for t, im in CIMG.items():
    if t.startswith("_") or not im:
        continue
    if t not in [c["title"] for c in COURSES]:
        die(f"course-images.json: {t!r} is not a course in courses.json")
    if not all(im.get(k) for k in ("base", "widths", "w", "h", "alt")):
        die(f"course-images.json: {t!r} needs base, widths, w, h and alt")
    for w in im["widths"]:
        if not os.path.exists(os.path.join(SITE, "assets", "img", f"{im['base']}-{w}.webp")):
            die(f"course-images.json: assets/img/{im['base']}-{w}.webp does not exist")
for n, p in PROFILES.items():
    if n.startswith("_"):
        continue
    if bool(p.get("video_id")) != bool(p.get("poster")):
        die(f"{n}: video_id and poster must be given together")
    if p.get("video_id") and not re.fullmatch(r"[A-Za-z0-9_-]{11}", p["video_id"]):
        die(f"{n}: video_id is not an 11-character YouTube id")
    if p.get("poster") and not os.path.exists(os.path.join(SITE, "assets", "img", p["poster"])):
        die(f"{n}: poster assets/img/{p['poster']} does not exist")


# ───────── facts derived from the JSON text ─────────
def facts(c):
    h = c["hours"]
    m = re.search(r"เรียน\s*(\d+)\s*ชม", h)
    s = re.search(r"(\d+)\s*ครั้ง\s*\((\d+)\s*ชม", h)
    if not (m and s):
        die(f"cannot read hours of {c['title']}: {h!r}")
    pr = re.search(r"ห้องซ้อมและอุปกรณ์\s*(\d+)\s*ชม", h)
    equip_b = next((b for b in c["bullets"] if b.startswith("เลือกอุปกรณ์ได้:") or b.startswith("เลือกเรียนได้") or b.startswith("Turntable only")), "")
    if equip_b.startswith("Turntable only"):
        equip = equip_b.split("—", 1)[0].strip().replace(" only", " เท่านั้น")
    else:
        equip = equip_b.split(":", 1)[1].strip() if ":" in equip_b else ""
    content = next((b for b in c["bullets"] if b.startswith("เนื้อหา:")), "")
    if not content and equip_b.startswith("Turntable only") and "—" in equip_b:
        content = equip_b.split("—", 1)[1].strip()
    life = next((b for b in c["bullets"] if "อายุคอร์ส" in b), "")
    return dict(learn=int(m.group(1)), sessions=int(s.group(1)), per=int(s.group(2)), practice=int(pr.group(1)) if pr else 0,
                price=c["price"], equip=equip, content=content.replace("เนื้อหา:", "").strip(), life=life,
                weekly=any("เรียนอย่างน้อยสัปดาห์ละครั้ง" in b for b in c["bullets"]))


F = {c["title"]: facts(c) for c in COURSES}
teaches = {t["name"]: [c["title"] for c in COURSES if t["name"] in c["instructors"]] for t in TEACHERS}
SHARED_ALL = all(len({str(F[t][k]) for t in F}) == 1 for k in ("learn", "sessions", "per", "price"))
F0 = F[COURSES[0]["title"]]
PRACTICE_COURSE = next((c["title"] for c in COURSES if F[c["title"]]["practice"]), None)
FP = F[PRACTICE_COURSE] if PRACTICE_COURSE else None
needle = ""
for c in COURSES:
    m = re.search(r"\(([^)]*ปลายเข็ม[^)]*)\)", F[c["title"]]["equip"])
    if m:
        needle = m.group(1)
        break


def faq_text(a):
    life_m = re.search(r"\d+\s*เดือน", F0["life"])
    if not life_m or len({f["life"] for f in F.values()}) != 1:
        die("the payment FAQ states one course life (e.g. '3 เดือน') for all courses, but courses.json has none or differing ones")
    vals = dict(
        course_names=", ".join(short(c["title"]) for c in COURSES), price=F0["price"], learn=F0["learn"], sessions=F0["sessions"], per=F0["per"],
        practice_course=PRACTICE_COURSE or "", practice=FP["practice"] if FP else 0, total=(FP["learn"] + FP["practice"]) if FP else 0,
        needle_note=needle, life=F0["life"], life_months=life_m.group(0), teacher_count=len(TEACHERS),
        weekly_courses=" และ ".join(short(c["title"]) for c in COURSES if F[c["title"]]["weekly"]),
        equip_sentence=" · ".join(f"{short(c['title'])}: {F[c['title']]['equip']}" for c in COURSES if F[c["title"]]["equip"]))
    try:
        return a.format_map(vals)
    except KeyError as e:
        die(f"faq.json uses an unknown placeholder {e}")


FAQ_RENDERED = [(it["q"], faq_text(it["a"])) for it in FAQ]


# ───────── small helpers ─────────
def line_url(text):
    return LINE_MSG + urllib.parse.quote(text, safe="")


def line_btn(text, label, cls="pri"):
    return f'<a class="btn {cls}" href="{line_url(text)}" rel="noopener"><span class="dot"></span>{E(label)}</a>'


ICON = {
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "play": '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    "ext": '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    "alert": '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16.2v.1"/>',
}


def ic(n, s=20):
    return (f'<svg class="ico" width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[n]}</svg>')


def photo(name, w, size_attr, cls=""):
    s = slug(name)
    return (f'<img{(" class=" + chr(34) + cls + chr(34)) if cls else ""} src="/assets/img/teacher-{s}-cut-640.webp" '
            f'srcset="/assets/img/teacher-{s}-cut-320.webp 320w, /assets/img/teacher-{s}-cut-640.webp 640w" sizes="{size_attr}" '
            f'width="640" height="800" alt="" loading="lazy" decoding="async">')


# ───────── page shell ─────────
def fonts_css():
    book = io.open(os.path.join(SITE, "book", "index.html"), encoding="utf-8").read()
    faces = re.findall(r"@font-face\{[^}]*\}", book)
    if len(faces) != 10:
        die(f"expected 10 @font-face rules in book/index.html, found {len(faces)}")
    return "\n".join(f.replace("url(fonts/", "url(/book/fonts/") for f in faces)


TOKENS = io.open(os.path.join(SITE, "design-system", "build", "tokens.inline.css"), encoding="utf-8").read()
FONTS = fonts_css()

CSS = r"""
:root{color-scheme:light;scrollbar-color:#bbb #fff;--lab-tint:#FBE9EA;--lab-paper:#F5F4F0;--lab-line:#E2DFD6}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-padding-top:90px}
body{margin:0;background-color:#fff;color:var(--text-primary);font:400 16px/1.7 var(--font-family-body);-webkit-font-smoothing:antialiased;overflow-x:clip;
  background-image:linear-gradient(rgba(15,15,15,.085) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,.085) 1px,transparent 1px),linear-gradient(rgba(15,15,15,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,.04) 1px,transparent 1px);
  background-size:140px 140px,140px 140px,28px 28px,28px 28px;background-position:-1px -1px}
h1,h2,h3,h4{font-family:var(--font-family-display);font-weight:800;margin:0;letter-spacing:0;text-wrap:balance}
h1{font-size:34px;line-height:1.3}
h2{font-size:26px;line-height:1.3}
h3{font-size:18px;line-height:1.4;font-weight:700}
p{margin:0}
a{color:inherit}
img{display:block;max-width:100%;height:auto}
::selection{background:var(--brand-base);color:#fff}
:focus-visible{outline:3px solid var(--brand-base);outline-offset:3px;border-radius:4px}
.skip{position:absolute;left:12px;top:-80px;z-index:60;background:#0F0F0F;color:#fff;padding:12px 16px;font:700 16px/1.25 var(--font-family-display);border-radius:var(--radius-sm)}
.skip:focus{top:12px}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ico{flex:0 0 auto}
.dot{width:10px;height:10px;border-radius:50%;background:#06C755;flex:0 0 auto;box-shadow:0 0 0 2px rgba(255,255,255,.9)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:6px 24px;font:700 16px/1.3 var(--font-family-display);text-align:center;text-decoration:none;border:1px solid transparent;border-radius:var(--radius-pill);cursor:pointer;background:none;color:inherit;transition:transform .25s cubic-bezier(.16,1,.3,1),background .2s,box-shadow .25s}
.btn:hover{transform:translateY(-2px)}
.btn:active{transform:translateY(1px)}
.btn.pri{background:var(--brand-base);color:var(--brand-on);box-shadow:0 2px 0 var(--brand-press),0 10px 18px rgba(15,15,15,.14)}
.btn.pri:hover{background:var(--brand-hover)}
.btn.sec{border-color:var(--text-primary);color:var(--text-primary);background:#fff}
.btn.sec:hover{background:var(--text-primary);color:#fff}
.btn.sm{min-height:44px;padding:4px 18px;font-size:15px}
.chip{display:inline-flex;align-items:center;min-height:28px;padding:0 12px;font:700 14px/1.25 var(--font-family-display);border:1px solid var(--lab-line);border-radius:var(--radius-pill);background:#fff}
.chip.rec{background:var(--lab-tint);color:#981C21;border-color:var(--lab-tint)}
/* black strip + header */
.topbar{background:#0F0F0F;color:#E8E6DF;font-size:13.5px;line-height:1.5}
.topbar>div{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 24px;padding:7px 24px}
.topbar b{color:#fff;font-weight:600}
.topbar span+span{color:#BDBAB1}
.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:12px;padding:10px 24px;min-height:68px;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--lab-line)}
.logo{display:inline-flex;align-items:center;min-height:44px}
.logo img{width:126px;height:42px}
.tnav{display:none}
.top>.btn{margin-left:auto;white-space:nowrap}.top>.btn.sm{padding:4px 16px}
.xf{position:absolute;left:0;right:0;bottom:-1px;height:3px;background:transparent;pointer-events:none}
.xf i{position:absolute;top:-6px;left:0;width:22px;height:15px;margin-left:-11px;border-radius:3px;background:var(--brand-base);box-shadow:0 2px 0 var(--brand-press),0 4px 8px rgba(0,0,0,.2)}
.xf i::after{content:"";position:absolute;left:50%;top:3px;bottom:3px;width:2px;margin-left:-1px;background:#fff;opacity:.85}
.mnav>summary{list-style:none;display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border:1.5px solid var(--lab-line);border-radius:var(--radius-pill);background:#fff;font:700 15px/1 var(--font-family-display);cursor:pointer}
.mnav>summary::-webkit-details-marker{display:none}
.mnav nav{position:absolute;left:0;right:0;top:100%;z-index:10;display:grid;padding:4px 24px 14px;background:#fff;border-bottom:1px solid var(--lab-line);box-shadow:0 18px 30px rgba(15,15,15,.12)}
.mnav nav a{display:flex;align-items:center;min-height:52px;text-decoration:none;font:700 18px/1.3 var(--font-family-display);border-bottom:1px solid var(--lab-line)}
.mnav nav a:last-child{border-bottom:0}
/* footer: black */
.foot{margin-top:24px;background:#0F0F0F;color:#CFCCC3;font-size:15px}
.foot-in{padding:36px 24px 40px;max-width:1360px;margin:0 auto}
.foot-cta{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center;justify-content:space-between;color:#fff;padding-bottom:6px}
.foot-cta b{font:800 24px/1.4 var(--font-family-display)}
.rackband{padding-top:28px;overflow:hidden}
.rack{display:block;width:100%;height:auto;max-height:200px}
.rack *{stroke:#F4F2EC;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;fill:#0F0F0F}
.rack path{fill:none}
.rack .rk-g{fill:none}
.rack .rk-r{stroke:#DD464C}
.rack .rk-rf{fill:#DD464C;stroke:#DD464C}
.rack text{stroke:none;fill:#F4F2EC;font:700 15px Arial,Helvetica,sans-serif;letter-spacing:.06em}
.rack text.rk-s{font-size:10px;letter-spacing:.14em}
.rack text.rk-m{font-size:17px;letter-spacing:.1em}
.rack text.rk-t{fill:#fff;font-size:12px}
.foot-cols{display:grid;gap:20px;padding-top:24px}
.foot b{font:800 18px/1.4 var(--font-family-display);color:#fff}
.foot a{display:inline-flex;align-items:center;min-height:44px;color:#fff}
.credit{margin-top:20px;font-size:13px;line-height:1.6;color:#9A978E;max-width:90ch}
/* rhythm */
.pgm{padding:0 24px;position:relative}
.pgm>section{padding:56px 0 0}
.pgm>section:last-child{padding-bottom:64px}
.hero{padding-top:44px!important;position:relative}
.hero>*:not(.gear){position:relative;z-index:2}
.hero h1{max-width:18ch}
.hero h1 .lab{display:inline-block;background:var(--brand-base);color:#fff;padding:0 .14em;border-radius:.16em;transform:rotate(-2.5deg);margin:0 .04em;white-space:nowrap}
.lede{margin-top:16px;max-width:56ch;color:var(--text-secondary);font-size:17px}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.cta .btn{width:100%}
.shared{margin-top:28px;padding-top:18px;border-top:1px solid var(--lab-line);color:var(--text-secondary);max-width:70ch}
.shared b{color:var(--text-primary)}
/* gear decor + motion */
.gear{position:absolute;z-index:1;pointer-events:none;will-change:transform;transform:translate3d(var(--mx,0px),calc(var(--sy,0px) + var(--my,0px)),0) rotate(var(--sr,0deg))}
.gear img{width:100%;height:auto;display:block;filter:drop-shadow(0 26px 22px rgba(15,15,15,.26)) drop-shadow(0 2px 0 rgba(15,15,15,.14));animation:gfloat 6s ease-in-out infinite;animation-delay:var(--fd,0s)}
@keyframes gfloat{0%,100%{translate:0 0;rotate:var(--r0,0deg)}50%{translate:0 -12px;rotate:calc(var(--r0,0deg) + 1.2deg)}}
.gear[data-drop] img{opacity:0;scale:.9;translate:0 -40px;animation:none}
.gear[data-drop].in img{opacity:1;scale:1;translate:0 0;transition:opacity .5s ease,scale .9s cubic-bezier(.34,1.56,.64,1),translate .9s cubic-bezier(.34,1.56,.64,1);animation:gfloat 6s ease-in-out 1s infinite}
.g-hero{display:none}
/* chooser */
.choose h2{font-size:22px}
.choose ul{list-style:none;margin:16px 0 0;padding:0;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);overflow:hidden}
.choose li{display:grid;padding:12px 18px 6px;border-bottom:1px solid var(--lab-line)}
.choose li:last-child{border-bottom:0}
.choose li span{color:var(--text-secondary)}
.choose li a{display:inline-flex;align-items:center;gap:8px;min-height:44px;font:700 17px/1.25 var(--font-family-display);text-decoration:none}
.choose li a:hover{color:var(--brand-base)}
/* course rows = cards */
.courses{padding-top:24px!important;display:grid;gap:24px}
.course{display:grid;gap:22px;padding:24px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-lg);box-shadow:0 18px 36px rgba(15,15,15,.06)}
.course h2{font-size:30px;line-height:1.25;display:inline}
.course .chip{margin-left:12px;vertical-align:middle}
.fit{margin-top:12px;color:var(--text-primary);font-size:17px}
.c-t{margin:0 0 14px}
.cimg{margin:0 0 20px}
.cimg img{width:100%;height:auto;border-radius:var(--radius-md)}
.spec{display:grid;grid-template-columns:1fr 1fr;margin-top:20px;border:1px solid var(--lab-line);border-radius:var(--radius-md);background:var(--lab-paper);overflow:hidden}
.spec>div{padding:12px 16px;display:flex;flex-direction:column;gap:2px}
.spec .s1{order:1;border-right:1px solid var(--lab-line)}
.spec .s3{order:2}
.spec .s2{order:3;grid-column:1/-1;border-top:1px solid var(--lab-line)}
.spec .k{font-size:14px;color:var(--text-muted)}
.spec b{font:700 18px/1.4 var(--font-family-display)}
.spec .price{font-size:24px;line-height:1.3;font-weight:800;white-space:nowrap}
.plus{margin-top:12px;font-size:15px;color:var(--text-secondary)}
.plus b{color:var(--text-primary)}
.pre{margin:0 0 20px;padding:14px 16px;border:1px solid var(--lab-line);border-radius:var(--radius-md);background:var(--lab-tint)}
.pre b{display:block;font:700 15px/1.4 var(--font-family-display);margin-bottom:4px}
.bl,.tracks{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:10px}
.bl li,.tracks li{padding-left:20px;position:relative;color:var(--text-secondary)}
.bl li::before,.tracks li::before{content:"";position:absolute;left:0;top:.7em;width:8px;height:8px;border-radius:50%;background:var(--brand-base)}
.tracks{margin-bottom:18px}
.tracks b{color:var(--text-primary);font-family:var(--font-family-display);font-weight:700}
.tpick{margin:6px 0 14px;color:var(--text-secondary)}
.own{margin:22px 0 0;font:700 15px/1.4 var(--font-family-display);color:var(--text-secondary)}
.faces{display:grid;grid-template-columns:repeat(2,1fr);gap:10px 12px;margin:14px 0 0}
.face{display:flex;align-items:center;gap:10px;min-height:52px;text-decoration:none;font:600 15px/1.25 var(--font-family-display)}
.face:hover span:last-child{text-decoration:underline;text-underline-offset:3px}
.av{display:block;width:52px;height:52px;overflow:hidden;background:var(--lab-tint);border-radius:50%;flex:0 0 auto}
.av img{width:52px;height:52px;object-fit:cover;object-position:50% 8%}
.c-c .btn{width:100%}
.c-c .btn+.btn,.stick .btn+.btn{margin-top:10px}
/* compare */
.cmpsec h2,.team h2,.faq h2,.endcta h2{font-size:26px}
.same{margin-top:14px;color:var(--text-secondary);max-width:70ch}
.same b{color:var(--text-primary)}
.tbl-wrap{margin-top:20px}
.cmp{width:100%;border-collapse:collapse;font-size:15px;line-height:1.6;display:block}
.cmp tbody,.cmp tr{display:block}
.cmp thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.cmp tr{padding:20px 0;border-top:1px solid var(--lab-line)}
.cmp th,.cmp td{padding:0;text-align:left;vertical-align:top}
.cmp tbody th{display:block;padding-bottom:10px;font:700 18px/1.6 var(--font-family-display);color:var(--text-primary)}
.cmp td{display:grid;grid-template-columns:112px 1fr;gap:12px;padding:6px 0;color:var(--text-secondary)}
.cmp td::before{content:attr(data-label);font:700 14px/1.7 var(--font-family-display);color:var(--text-muted)}
/* team */
.lede2{margin-top:10px;color:var(--text-secondary);max-width:70ch}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:16px 12px;margin-top:24px}
.tile{display:flex;flex-direction:column;gap:8px;text-decoration:none;padding:8px 8px 10px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .3s}
.tile:hover{transform:translateY(-4px) rotate(-1deg);box-shadow:0 16px 28px rgba(15,15,15,.12)}
.tile .tp{display:block;aspect-ratio:4/5;overflow:hidden;background:var(--lab-tint);border-radius:var(--radius-sm)}
.tile .tp img{width:100%;height:100%;object-fit:cover}
.tp img,.pph img{filter:drop-shadow(0 10px 10px rgba(15,15,15,.22))}
.tile b{font:700 18px/1.3 var(--font-family-display);padding:0 4px}
.tile .tc{font-size:14px;line-height:1.5;color:var(--text-secondary);padding:0 4px}
.team .tiles{margin-top:64px}
.tile:not(.sm){overflow:visible}
.tile:not(.sm) .tp{position:relative;overflow:visible}
.tile:not(.sm) .tp img{transform:scale(1.16);transform-origin:50% 100%;transition:transform .35s cubic-bezier(.16,1,.3,1)}
.tile:not(.sm):hover .tp img{transform:scale(1.2)}
.tile.sm .tp{aspect-ratio:1/1}
.tile.sm .tp img{object-position:50% 10%}
/* faq */
.qs{margin-top:20px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);padding:0 20px}
.q{border-bottom:1px solid var(--lab-line)}
.q:last-child{border-bottom:0}
.q summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:56px;padding:10px 0;font:700 17px/1.45 var(--font-family-display)}
.q summary::-webkit-details-marker{display:none}
.q summary::after{content:"";flex:0 0 auto;width:10px;height:10px;border-right:2px solid var(--brand-base);border-bottom:2px solid var(--brand-base);transform:rotate(45deg);margin-right:6px;transition:transform var(--motion-duration-fast) var(--motion-easing-base)}
.q[open] summary::after{transform:rotate(-135deg)}
.q p{padding:0 0 18px;color:var(--text-secondary);max-width:72ch}
.endcta{margin:0 -24px;padding:48px 24px!important;background:var(--lab-tint)}
.endcta .cta{margin-top:20px}
/* profile */
.crumb{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding-top:20px!important;font-size:15px;color:var(--text-muted)}
.crumb a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;color:var(--text-secondary)}
.pg2{display:grid;gap:28px;padding-top:8px}
.pph{margin:0;background:var(--lab-tint);aspect-ratio:4/5;overflow:hidden;align-self:start;border-radius:var(--radius-lg)}
.pph img{width:100%;height:100%;object-fit:cover}
.pbody{display:grid;gap:36px;align-content:start}
.pname{display:grid;gap:4px}
.pbody h1{font-size:40px}
.role{color:var(--text-secondary);font-size:17px}
.pbody section{display:grid;gap:12px}
.pbody h2{font-size:22px}
.cchips{display:flex;flex-wrap:wrap;gap:10px}
.cchip{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:1.5px solid var(--text-primary);border-radius:var(--radius-pill);background:#fff;text-decoration:none;font:700 16px/1.25 var(--font-family-display)}
.cchip:hover{background:var(--text-primary);color:#fff}
.one{color:var(--text-secondary)}
.bio{color:var(--text-secondary);max-width:62ch}
.stick{display:grid;gap:0;justify-items:start}
.stick .btn{width:100%}
.others h2{font-size:26px}
/* video: click-to-load (stays dark) */
.fc{display:grid;gap:8px}
.fc-box{position:relative;aspect-ratio:16/9;background:var(--surface-sunken);overflow:hidden;border:1px solid var(--lab-line);border-radius:var(--radius-md)}
.fc-box>img,.fc-box>iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.fc-box>img{object-fit:cover}
.fc-btn{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;width:100%;border:0;background:linear-gradient(0deg,rgba(0,0,0,.55),rgba(0,0,0,.05) 60%);color:#fff;cursor:pointer}
.fc-btn svg{width:56px;height:56px;padding:14px;background:var(--brand-base);color:#fff;border-radius:50%}
.fc-btn:hover svg{background:var(--brand-hover)}
.fc-msg{position:absolute;inset:0;display:none;place-content:center;justify-items:center;gap:12px;padding:16px;text-align:center;background:rgba(0,0,0,.82);color:#E8E6DF;font-size:15px}
.fc-msg .btn.sec{background:transparent;border-color:#fff;color:#fff}
.fc-box.loading .fc-msg.l,.fc-box.failed .fc-msg.e{display:grid}
.fc-box.loading .fc-btn,.fc-box.failed .fc-btn{display:none}
#clips [hidden]{display:none!important}
.cl-group{margin-top:32px}
.cl-group h3{font-size:22px;line-height:1.3}
.cl-list{list-style:none;margin:12px 0 0;padding:0;max-width:760px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);overflow:hidden}
.cl-i{display:grid;gap:8px;padding:18px 20px;border-top:1px solid var(--lab-line)}
.cl-i:first-child{border-top:0}
.cl-title{margin:0;font:700 18px/1.5 var(--font-family-display);overflow-wrap:anywhere}
.cl-meta{margin:0;font-size:15px;color:var(--text-secondary)}
.cl-actions{display:flex;flex-wrap:wrap;gap:10px}
.cl-frame{position:relative;aspect-ratio:16/9;background:var(--surface-sunken);border:1px solid var(--lab-line);border-radius:var(--radius-sm);overflow:hidden}
.cl-frame.short{aspect-ratio:9/16;max-width:300px}
.cl-frame>iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.cl-fail{position:absolute;left:0;right:0;bottom:0;margin:0;padding:10px 14px;background:rgba(0,0,0,.84);color:#fff;font-size:15px}
.cl-note{margin:8px 0 0;font-size:15px;color:var(--text-secondary)}
.cl-group .btn.sec:not(.sm){margin-top:12px}
.cl-err,.cl-empty{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;padding:16px 18px;max-width:760px;border-radius:var(--radius-md)}
.cl-err p,.cl-empty p{margin:0;flex:1 1 260px}
.cl-err{border:1px solid var(--brand-base);background:var(--lab-tint)}
.cl-empty{border:1px solid var(--lab-line);background:#fff}
.fc-priv{font-size:14px}
.fc-priv summary{display:inline-flex;align-items:center;min-height:44px;cursor:pointer;list-style:none;font:600 14px/1.4 var(--font-family-display);color:var(--text-secondary);text-decoration:underline;text-underline-offset:4px}
.fc-priv summary::-webkit-details-marker{display:none}
.fc-priv p{margin:0 0 8px;max-width:64ch;color:var(--text-secondary)}
/* content page */
.listen{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.slgrid{display:grid;gap:16px;margin-top:20px}
.slc{display:grid;gap:12px;justify-items:start;align-content:start;padding:28px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-lg);box-shadow:0 18px 36px rgba(15,15,15,.06)}
.slc:first-child{background:#0F0F0F;border-color:#0F0F0F;color:#fff}
.slc:first-child p{color:#D8D6CF}
.slc:first-child .when{color:#fff}
.slc h3{font-size:30px;line-height:1.25}
.slc p{color:var(--text-secondary);max-width:52ch}
.slc .when{color:var(--text-primary)}
@media (min-width:960px){
  h1{font-size:44px}
  .topbar>div{padding:7px 80px}
  .top{padding:10px 80px}
  .top>.btn{margin-left:0}
  .tnav{display:flex;gap:4px;margin-left:12px}
  .tnav a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:var(--radius-pill);text-decoration:none;font:600 16px/1 var(--font-family-display);color:var(--text-secondary)}
  .tnav a:hover{color:var(--brand-base)}
  .tnav a.on{color:var(--brand-base);background:var(--lab-tint)}
  .tnav+.btn{margin-left:auto}
  .mnav{display:none}
  .foot-in{padding:44px 80px 48px}
  .foot-cols{grid-template-columns:2fr 2fr 1fr}
  .pgm{padding:0 80px}
  .pgm>section{padding:88px 0 0}
  .pgm>section:last-child{padding-bottom:96px}
  .hero{padding-top:72px!important}
  .pgm>.hero{padding-right:min(34vw,460px)}
  .hero h1{font-size:56px;line-height:1.3;max-width:20ch}
  .g-hero{display:block;top:56px;right:0;width:min(33vw,440px)}
  .lede{font-size:19px}
  .cta .btn{width:auto}
  .choose{max-width:760px}
  .choose li{grid-template-columns:1fr auto;align-items:center;gap:24px;padding:4px 20px}
  .course{grid-template-columns:5fr 4fr 3fr;gap:44px;padding:40px}
  .course h2{font-size:42px}
  .cmpsec h2,.team h2,.faq h2,.endcta h2{font-size:34px}
  .tbl-wrap{margin-top:24px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);padding:8px 20px}
  .cmp{display:table}
  .cmp tbody{display:table-row-group}
  .cmp tr{display:table-row;padding:0;border:0}
  .cmp thead{position:static;width:auto;height:auto;overflow:visible;clip:auto;display:table-header-group}
  .cmp th,.cmp td{display:table-cell;padding:14px 16px 14px 0;border-bottom:1px solid var(--lab-line)}
  .cmp thead th{font:800 17px/1.3 var(--font-family-display);border-bottom:1px solid var(--text-primary)}
  .cmp tbody th{width:150px;padding-bottom:14px;font-size:15px;color:var(--text-secondary)}
  .cmp td::before{content:none}
  .tiles{grid-template-columns:repeat(6,1fr);gap:16px}
  .tiles.s{grid-template-columns:repeat(5,1fr)}
  .qs{max-width:860px}
  .endcta{margin:0 -80px;padding:64px 80px!important}
  .pg2{grid-template-columns:5fr 7fr;gap:72px;padding-top:24px}
  .pph{position:sticky;top:96px}
  .pbody h1{font-size:64px;line-height:1.3}
  .stick .btn{width:auto;min-width:340px}
  .slgrid{grid-template-columns:1fr 1fr;gap:24px}
  .slc{padding:40px}
}
@media (max-width:700px){.topbar>div span+span{display:none}}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .q summary::after,.btn,.tile{transition:none}
  .gear img{animation:none!important}
  .gear[data-drop] img{opacity:1;scale:1;translate:0 0}
}
"""


# Meta Pixel (assets/js/meta-pixel.js holds the only Pixel ID; empty = nothing loads and this row stays hidden). Never on /book/.
PIXEL_ROW = '<div data-pixel-row hidden><button type="button" data-pixel-toggle>ปิดการวัดผลโฆษณา</button><span data-pixel-state aria-live="polite"></span></div>'
PIXEL_SCRIPT = '<script src="/assets/js/meta-pixel.js" defer></script>\n'



def minify_css(c):
    """strip comments and line breaks (inline tokens are big; every generated page must stay under the 80 KB check)"""
    c = re.sub(r"/\*.*?\*/", "", c, flags=re.S)
    c = re.sub(r"\s*\n\s*", "", c)
    return re.sub(r"\s*([{};])\s*", r"\1", c)


RACK = siam_skyline.svg()   # footer band: Siam Square line art (MBK · Lido Connect · BTS Siam)
CREDIT = ('ภาพเครื่อง DJ ตกแต่งเรนเดอร์จากโมเดล 3D: คอนโทรลเลอร์ "3D_DJ_Mixer0011" โดย Pravin 9271 (CC BY 4.0, ดัดแปลง) '
          'และโมเดลรูปทรงตามสเปก ไม่ใช่รูปสินค้าจริง')
NAV = [("คอร์สเรียน", "/courses/", "courses"), ("ทีมครู", "/courses/#teachers", "teachers"), ("จองห้องซ้อม", "/book/", "book")]  # Shop is appended below when --shop /shop/ ; Members when that page exists
if A.shop == "/shop/":
    NAV.insert(1, ("SHOP🛒", "/shop/", "shop"))
GEAR_HERO = ('<div class="gear g-hero" data-gear data-drop data-speed=".06" data-depth="14">'
             '<img src="/assets/img/gear-controller.webp" width="647" height="359" alt="" decoding="async"></div>')


def shell(path, title, desc, body, robots=None, ld=None, script="", active="", css_extra="", head_extra=""):
    li = "".join(f'<a href="{h}"{" class=on aria-current=page" if k == active else ""}>{t}</a>' for t, h, k in NAV)
    strip = ('<div class="topbar"><div><span><b>ตัวแทนจำหน่ายอย่างเป็นทางการ</b> Pioneer DJ · AlphaTheta · NEO by OYAIDE</span>'
             '<span>Lido Connect ชั้น 2 สยามสแควร์ · เปิดทุกวัน 12:00–20:00</span></div></div>')
    top = (f'<a class="skip" href="#main">ข้ามไปเนื้อหาหลัก</a>{strip}'
           f'<header class="top"><a class="logo" href="/"><img src="/assets/img/logo-ink-252.png" srcset="/assets/img/logo-ink-252.png 1x, /assets/img/logo-ink-504.png 2x" '
           f'width="126" height="42" alt="DJ LAB SIAM — หน้าแรก"></a>'
           f'<nav class="tnav" aria-label="เมนูหลัก">{li}</nav>'
           f'<a class="btn pri sm" href="{LINE_ADD}" rel="noopener"><span class="dot"></span>ติดต่อ LINE</a>'
           f'<details class="mnav"><summary>เมนู</summary><nav aria-label="เมนูหลักบนมือถือ">{li}</nav></details>'
           f'<span class="xf" aria-hidden="true"><i></i></span></header>')
    foot = ('<footer class="foot"><div class="foot-in">'
            '<div class="foot-cta"><b>อยากได้เครื่อง หรืออยากเริ่มเรียน ทักมาคุยได้เลย</b>'
            f'<a class="btn pri" href="{LINE_ADD}" rel="noopener"><span class="dot"></span>ทักหาเราทาง LINE</a></div>'
            f'<div class="rackband">{RACK}</div>'
            '<div class="foot-cols"><div><b>DJ LAB SIAM</b><p>Lido Connect ชั้น 2, Siam Square Soi 3<br>ปทุมวัน กรุงเทพฯ 10330</p></div>'
            '<div><p>เปิด 12:00–20:00 น. ทุกวัน<br>02-252-5868 · 088-656-0464<br>LINE @djlabsiam</p></div>'
            '<div><a href="/privacy.html">นโยบายความเป็นส่วนตัว</a></div></div>' + PIXEL_ROW +
            f'<p class="credit">{CREDIT}</p></div></footer>')
    ldj = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False).replace("</", "<" + chr(92) + "/")}</script>' for x in (ld or []))
    og = (f'<meta property="og:type" content="website"><meta property="og:url" content="{ORIGIN}{path}"><meta property="og:title" content="{E(title)}">'
          f'<meta property="og:description" content="{E(desc)}"><meta property="og:image" content="{ORIGIN}/og_image.png"><meta property="og:locale" content="th_TH">'
          f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{E(title)}"><meta name="twitter:description" content="{E(desc)}">'
          f'<meta name="twitter:image" content="{ORIGIN}/og_image.png">')
    fader = ("<script>(function(){var k=document.querySelector('.xf i');if(!k)return;function u(){var m=document.documentElement.scrollHeight-innerHeight;"
             "k.style.left=(m>0?Math.min(1,Math.max(0,scrollY/m))*100:0)+'%'}addEventListener('scroll',u,{passive:true});addEventListener('resize',u);u()})();</script>\n")
    return (f'<!DOCTYPE html>\n<!-- generated by tools/build_pages.py from bots/bot/shared/courses.json (md5 {MD5}) — do not edit by hand -->\n'
            f'<html lang="th" data-surface="light">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            f'<title>{E(title)}</title>\n<meta name="description" content="{E(desc)}">\n'
            + (f'<meta name="robots" content="{robots}">\n' if robots else '')
            + f'<link rel="canonical" href="{ORIGIN}{path}">\n{og}\n<meta name="theme-color" content="#FFFFFF">\n'
            f'<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" href="/favicon-512.png" type="image/png" sizes="512x512">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
            f'<link rel="preload" href="/book/fonts/noto-sans-thai-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
            f'<link rel="preload" href="/book/fonts/noto-sans-thai-thai.woff2" as="font" type="font/woff2" crossorigin>\n'
            f'<style>\n{minify_css(FONTS + TOKENS + CSS + css_extra)}\n</style>\n{head_extra}{ldj}\n</head>\n<body>\n{top}\n<main id="main" class="pgm">{body}</main>\n{foot}\n{PIXEL_SCRIPT}'
            f'{fader}<script src="/assets/js/decor.js" defer></script>\n{script}</body>\n</html>\n')


# ───────── /courses/ ─────────
def cimg(c):
    im = CIMG.get(c["title"])
    if not im:
        return ""
    ws = sorted(int(w) for w in im["widths"])
    srcset = ", ".join(f"/assets/img/{im['base']}-{w}.webp {w}w" for w in ws)
    return (f'<figure class="cimg"><img src="/assets/img/{im["base"]}-{int(im["w"])}.webp" srcset="{srcset}" sizes="(min-width:960px) 424px, 92vw" '
            f'width="{int(im["w"])}" height="{int(im["h"])}" alt="{E(im["alt"])}" loading="lazy" decoding="async"></figure>')


def course_row(c, i):
    f = F[c["title"]]
    extra = ""
    if f["practice"]:
        extra = (f'<p class="plus"><b>รวมห้องซ้อมและอุปกรณ์ {f["practice"]} ชม.</b> · เวลารวม {f["learn"] + f["practice"]} ชม. '
                 f'(เรียน {f["learn"]} + ซ้อม {f["practice"]})</p>')
    bullets = "".join(f"<li>{E(b)}</li>" for b in c["bullets"] if not b.startswith("เวลารวม"))
    rec = '<span class="chip rec">สำหรับผู้เริ่มต้น</span>' if "ผู้เริ่มต้น" in c["audience"] else ""
    faces = "".join(f'<a class="face" href="/teachers/{slug(t)}/" aria-label="โปรไฟล์ {E(t)}"><span class="av">{photo(t, 52, "52px")}</span><span>{E(t)}</span></a>' for t in c["instructors"])
    pre = f'<div class="pre"><b>ก่อนเรียน</b><p>{E(c["prerequisite"])}</p></div>' if c.get("prerequisite") else ""
    tracks = ""
    if c.get("tracks"):
        items = "".join(f'<li><b>{E(t["name"])}</b>{(" — " + E(t["detail"])) if t.get("detail") else ""}</li>' for t in c["tracks"])
        tracks = f'<h3>สายที่เลือกเรียนได้</h3><ul class="tracks">{items}</ul>'
    return (f'<article class="course" id="{cid(c["title"])}">'
            f'<div class="c-a"><div class="c-t"><h2>{E(c["title"])}</h2>{rec}</div>{cimg(c)}<p class="fit">{E(c["audience"])}</p>'
            f'<div class="spec"><div class="s1"><span class="k">เรียน</span><b>ตัวต่อตัว</b></div>'
            f'<div class="s2"><span class="k">เวลาเรียน</span><b>{f["sessions"]} ครั้ง × {f["per"]} ชม. = {f["learn"]} ชม.</b></div>'
            f'<div class="s3"><span class="k">ราคา</span><b class="price">{E(f["price"])}</b></div></div>{extra}</div>'
            f'<div class="c-b">{pre}{tracks}<h3>รายละเอียดคอร์ส</h3><ul class="bl">{bullets}</ul></div>'
            f'<div class="c-c"><h3>อาจารย์ผู้สอน</h3><p class="tpick">ไม่ต้องเลือกก็ได้ ร้านจัดอาจารย์ที่เหมาะกับคอร์สและเวลาว่างให้</p>'
            f'{line_btn("สนใจคอร์ส " + c["title"] + " ให้ร้านจัดอาจารย์ให้", "ทัก LINE · ให้ร้านจัดอาจารย์ให้")}'
            f'<h4 class="own">อยากเลือกอาจารย์เอง ดูโปรไฟล์ได้</h4><div class="faces">{faces}</div></div></article>')


def compare_table():
    heads = [short(c["title"]) for c in COURSES]
    ft = [F[c["title"]] for c in COURSES]
    rows_all = [
        ("ราคา", [E(f["price"]) for f in ft]),
        ("เวลาเรียน", [f'{f["sessions"]} ครั้ง × {f["per"]} ชม. = {f["learn"]} ชม.' for f in ft]),
        ("อายุคอร์ส", [E(f["life"].replace("อายุคอร์ส", "").strip()) for f in ft]),
        ("ก่อนเรียน", [E(c["prerequisite"]) if c.get("prerequisite") else "ไม่มี" for c in COURSES]),
        ("ห้องซ้อมและอุปกรณ์", [(f'รวม {f["practice"]} ชม.' if f["practice"] else "ไม่รวม") for f in ft]),
        ("เรียนบนอุปกรณ์", [E(f["equip"]) for f in ft]),
        ("สายที่เลือกเรียนได้", [(" · ".join((t.get("detail", "") if t["name"].startswith("เลือก") else t["name"]) for t in c.get("tracks") or []) or "—") for c in COURSES]),
        ("เนื้อหา", [E(f["content"]) if f["content"] else "ดูสายที่เลือกเรียนได้" for f in ft]),
        ("อาจารย์", [" · ".join(E(t) for t in c["instructors"]) for c in COURSES]),
    ]
    same, rows = [], []
    for label, cells in rows_all:
        if len(set(cells)) == 1:
            same.append((label, cells[0]))
        else:
            tds = "".join(f'<td data-label="{E(h)}"><span>{x}</span></td>' for h, x in zip(heads, cells))
            rows.append(f'<tr><th scope="row">{label}</th>{tds}</tr>')
    same_txt = " · ".join(["ตัวต่อตัว"] + [f"{l} {v}" for l, v in same])
    th = "".join(f'<th scope="col">{E(h)}</th>' for h in heads)
    return (f'<p class="same"><b>เหมือนกันทุกคอร์ส:</b> {same_txt}</p>'
            f'<div class="tbl-wrap"><table class="cmp"><caption class="vh">ข้อที่ต่างกันระหว่างคอร์ส</caption>'
            f'<thead><tr><th scope="col"><span class="vh">หัวข้อ</span></th>{th}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def tiles(cls="", small=False, exclude=None):
    out = ""
    for t in TEACHERS:
        n = t["name"]
        if n == exclude:
            continue
        tc = "" if small else f'<span class="tc">สอน: {E(" · ".join(short(x) for x in teaches[n]))}</span>'
        out += (f'<a class="tile{" sm" if small else ""}" href="/teachers/{slug(n)}/"><span class="tp">{photo(n, 320, "(min-width:960px) 16vw, 45vw")}</span>'
                f'<b>{E(n)}</b>{tc}</a>')
    return f'<div class="tiles{cls}">{out}</div>'


COURSE_VIDEOS = [i for i in (load(os.path.join(SITE, "data", "course-videos.json")).get("items") or [])
                  if str(i.get("src", "")).startswith("/assets/video/") and str(i["src"]).endswith(".mp4")] if os.path.exists(os.path.join(SITE, "data", "course-videos.json")) else []
CVID_CSS = """
.cvid{margin-top:22px;aspect-ratio:16/9;border-radius:var(--radius-lg);overflow:hidden;background:#0F0F0F;box-shadow:0 24px 48px rgba(15,15,15,.22)}
.cvid video{display:block;width:100%;height:100%;object-fit:cover}
@media (min-width:960px){.pgm>.hero.hasvid{padding-right:calc(min(46vw,840px) + min(7vw,140px) + 40px);min-height:calc(min(46vw,840px) * .5625 + 190px);display:flex;flex-direction:column;justify-content:center;align-items:flex-start}.hero.hasvid .shared{max-width:36em}.hero .cvid{position:absolute;top:104px;right:min(7vw,140px);margin:0;width:min(46vw,840px)}}
"""
CVID_JS = """<script>
(function(){var v=document.querySelector('.cvid video');if(!v)return;
var L=JSON.parse(v.getAttribute('data-list')||'[]'),i=0,rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function go(n){i=(n+L.length)%L.length;v.src=L[i];if(!rm){var p=v.play();if(p&&p.catch)p.catch(function(){})}}
v.muted=true;v.addEventListener('ended',function(){go(i+1)});go(0);
if('IntersectionObserver' in window&&!rm)new IntersectionObserver(function(e){if(e[0].isIntersecting){var p=v.play();if(p&&p.catch)p.catch(function(){})}else v.pause()}).observe(v)})();
</script>"""


def courses_page():
    chooser = "".join(f'<li><span>{E(GOAL.get(c["title"], c["audience"]))}</span><a href="#{cid(c["title"])}">{E(c["title"])} {ic("arrow", 18)}</a></li>' for c in COURSES)
    shared = ""
    if SHARED_ALL:
        shared = (f'<p class="shared"><b>ทุกคอร์สเรียนตัวต่อตัว</b> · {F0["sessions"]} ครั้ง × {F0["per"]} ชม. = {F0["learn"]} ชม. · {E(F0["price"])} '
                  f'· เลือกวัน/เวลาเรียนได้ตามสะดวก</p>')
    faq = "".join(f'<details class="q"{" open" if i == 0 else ""}><summary>{E(q)}</summary><p>{E(a)}</p></details>' for i, (q, a) in enumerate(FAQ_RENDERED))
    cvid = ""
    if COURSE_VIDEOS:
        cvid = ('<div class="cvid"><video muted playsinline preload="metadata"' + (" loop" if len(COURSE_VIDEOS) == 1 else "") + ' aria-label="วิดีโอแนะนำคอร์สเรียนของ DJ LAB SIAM" '
                f'data-list=\'{json.dumps([i["src"] for i in COURSE_VIDEOS])}\'' + (f' poster="{E(COURSE_VIDEOS[0]["poster"])}"' if COURSE_VIDEOS[0].get("poster") else "") + '></video></div>')
    body = (f'<section class="hero{" hasvid" if cvid else ""}">{"" if cvid else GEAR_HERO}<h1>คอร์สเรียน DJ ตัวต่อตัว</h1>'
            f'<p class="lede">เรียน DJ จากมืออาชีพตัวจริง เลือกวัน เลือกเวลา เลือกอุปกรณ์ได้ตามสะดวก</p>'
            f'<div class="cta">{line_btn("ขอคำแนะนำเลือกคอร์ส", "ทักหา LINE ให้ทีมช่วยเลือกคอร์ส")}<a class="btn sec" href="#compare">ดูตารางเทียบคอร์ส</a></div>{shared}{cvid}</section>'
            f'<section class="choose" aria-labelledby="ch"><h2 id="ch">ไม่แน่ใจว่าเริ่มที่คอร์สไหน</h2><ul>{chooser}</ul></section>'
            f'<section class="courses" aria-label="คอร์สทั้งหมด">{"".join(course_row(c, i) for i, c in enumerate(COURSES))}</section>'
            f'<section class="cmpsec" id="compare"><h2>เทียบคอร์สทีละข้อ</h2>{compare_table()}</section>'
            f'<section class="team" id="teachers"><h2>ทีมครูผู้สอน</h2><p class="lede2">{E(D["instructors"]["intro"])} ไม่ต้องเลือกก็ได้ ร้านจัดอาจารย์ที่เหมาะกับคอร์สและเวลาว่างให้ · อยากเรียนกับท่านใด ดูโปรไฟล์แล้วเลือกได้</p>{tiles()}</section>'
            f'<section class="faq" id="faq"><h2>คำถามที่พบบ่อยเรื่องคอร์ส</h2><div class="qs">{faq}</div></section>'
            f'<section class="endcta"><h2>ยังไม่แน่ใจ? ทักมาคุยก่อนได้</h2><div class="cta">{line_btn("ขอคำแนะนำเลือกคอร์ส", "ทักหา LINE @djlabsiam")}'
            f'<a class="btn sec" href="tel:022525868">{ic("phone", 18)} โทร 02-252-5868</a></div></section>')
    names_ = ", ".join(short(c["title"]) for c in COURSES)
    desc = (f'คอร์สเรียน DJ ตัวต่อตัว {len(COURSES)} คอร์ส ({names_}) ราคา {F0["price"]} เรียน {F0["learn"]} ชั่วโมง เลือกวันและเวลาเรียนได้ '
            f'ที่ DJ LAB SIAM สยามสแควร์') if SHARED_ALL else "คอร์สเรียน DJ ตัวต่อตัว ที่ DJ LAB SIAM สยามสแควร์"
    ld = [{"@context": "https://schema.org", "@type": "FAQPage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ_RENDERED]}]
    return shell("/courses/", "คอร์สเรียน DJ ตัวต่อตัว — DJ LAB SIAM สยามสแควร์", desc, body, ld=ld, active="courses",
                 script=CVID_JS if cvid else "", css_extra=CVID_CSS if cvid else "")


# the chooser's short labels: my own abbreviation of each audience text (the owner sees them in the wording list); falls back to the full audience text
GOAL = {"Basic DJ Class": "เริ่มจาก 0 ก็เรียนได้", "Advance DJ Class": "DJ ที่ต้องการพัฒนาทักษะของตัวเอง",
        "Basic Scratch Class": "สนใจการสแครช", "Advance Scratch Class": "มีพื้นฐานการสแครชแล้ว"}


# ───────── /teachers/<name>/ ─────────
VIDEO_JS = """<script>
(function(){document.querySelectorAll('.fc-box[data-vid]').forEach(function(box){var b=box.querySelector('.fc-btn');if(!b)return;
b.addEventListener('click',function(){var id=box.getAttribute('data-vid');if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
box.classList.add('loading');var f=document.createElement('iframe');
f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';f.title=box.getAttribute('data-title');
f.allow='autoplay; encrypted-media; picture-in-picture';f.referrerPolicy='strict-origin-when-cross-origin';f.setAttribute('allowfullscreen','');
var t=setTimeout(function(){box.classList.remove('loading');box.classList.add('failed')},10000);
f.addEventListener('load',function(){clearTimeout(t);box.classList.remove('loading')});box.appendChild(f)})})})();
</script>
"""

PRIVACY_NOTE = ('<details class="fc-priv"><summary>ข้อมูลความเป็นส่วนตัวของวิดีโอ</summary>'
                '<p>ก่อนกดเล่น หน้านี้ไม่เรียกข้อมูลใดจาก YouTube เมื่อกดเล่น เบราว์เซอร์ของคุณจะเชื่อมต่อกับ YouTube (Google) เพื่อแสดงวิดีโอ โดยใช้โหมดความเป็นส่วนตัวขั้นสูง (youtube-nocookie.com) '
                'Google อาจเก็บข้อมูลการใช้งานตามนโยบายของ Google ร้านไม่ได้รับข้อมูลนั้น · <a href="/privacy.html">นโยบายความเป็นส่วนตัวของร้าน</a></p></details>')


PFS_JS = """<script>
(function(){document.querySelectorAll('[data-pfs]').forEach(function(w){var t=w.querySelector('.pfs-t'),p=w.querySelector('.pfs-b.p'),n=w.querySelector('.pfs-b.n');if(!p)return;
function step(d){t.scrollBy({left:d*t.clientWidth*.9,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
p.addEventListener('click',function(){step(-1)});n.addEventListener('click',function(){step(1)});
t.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}})})})();
</script>
"""
PFS_CSS = """
.pfs{position:relative;margin-top:12px}
.pfs-t{display:flex;gap:12px;margin:0;padding:0 0 6px;list-style:none;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin;border-radius:var(--radius-md)}
.pfs-t:focus-visible{outline:3px solid var(--text-primary);outline-offset:3px}
.pfs-t li{flex:0 0 auto;max-width:100%;scroll-snap-align:start}
.pfs-t figure{margin:0}
.pfs-t img{display:block;width:min(calc(var(--r) * min(58vh,440px)),calc(100vw - 48px));height:auto;aspect-ratio:var(--r);object-fit:contain;border-radius:var(--radius-md);background:var(--lab-tint)}
.pfs-t figcaption{margin-top:6px;font-size:14px;color:var(--text-secondary)}
.pfs-b{position:absolute;top:calc(50% - 22px);width:44px;height:44px;border-radius:50%;border:1.5px solid var(--text-primary);background:#fff;font:700 24px/1 var(--font-family-display);cursor:pointer;box-shadow:0 6px 14px rgba(15,15,15,.18)}
.pfs-b.p{left:8px}.pfs-b.n{right:8px}
"""


def teacher_page(t):
    name = t["name"]
    s = slug(name)
    prof = PROFILES[name]
    chips = "".join(f'<a class="cchip" href="/courses/#{cid(x)}">{E(x)} {ic("arrow", 16)}</a>' for x in teaches[name])
    sections = f'<section><h2>คอร์สที่สอน</h2><div class="cchips">{chips}</div><p class="one">ทุกคอร์สเรียนตัวต่อตัว</p></section>'
    if prof.get("bio"):
        sections += f'<section><h2>เกี่ยวกับ {E(name)}</h2><p class="bio">{E(prof["bio"])}</p></section>'
    if prof.get("highlights"):
        sections += f'<section><h2>ผลงาน</h2><ul class="bl">{"".join("<li>" + E(h) + "</li>" for h in prof["highlights"])}</ul></section>'
    script = ""
    pf = prof.get("portfolio") or []
    from PIL import Image as _Im
    for it in pf:
        fp = os.path.join(SITE, "assets", "img", "portfolio", it["img"])
        if not os.path.exists(fp):
            die(f"{name}: portfolio image missing: assets/img/portfolio/{it['img']}")
        with _Im.open(fp) as _im:
            it["_w"], it["_h"] = _im.size
    if pf:
        slides = "".join(f'<li><figure><img src="/assets/img/portfolio/{E(it["img"])}" width="{it["_w"]}" height="{it["_h"]}" style="--r:{it["_w"] / it["_h"]:.4f}" alt="{E(it.get("alt") or "ผลงานของ " + name)}" loading="lazy" decoding="async">'
                         + (f'<figcaption>{E(it["caption"])}</figcaption>' if it.get("caption") else "") + '</figure></li>' for it in pf)
        sections += (f'<section><h2>Portfolio</h2><div class="pfs" data-pfs><ul class="pfs-t" tabindex="0" aria-label="สไลด์ผลงานของ {E(name)}">{slides}</ul>'
                     + ('<button type="button" class="pfs-b p" aria-label="ภาพก่อนหน้า">‹</button><button type="button" class="pfs-b n" aria-label="ภาพถัดไป">›</button>' if len(pf) > 1 else "")
                     + '</div></section>')
        script += PFS_JS
    if prof.get("video_id"):
        sections += (f'<section><h2>วิดีโอแนะนำ</h2><div class="fc"><div class="fc-box" data-vid="{E(prof["video_id"])}" data-title="วิดีโอแนะนำ {E(name)}">'
                     f'<img src="/assets/img/{E(prof["poster"])}" width="1280" height="720" alt="" loading="lazy">'
                     f'<button class="fc-btn" type="button" aria-label="เล่นวิดีโอแนะนำของ {E(name)}">{ic("play", 28)}</button>'
                     f'<div class="fc-msg l" role="status">กำลังเชื่อมต่อ YouTube…</div>'
                     f'<div class="fc-msg e">{ic("alert")} เปิดวิดีโอในหน้านี้ไม่ได้<a class="btn sec sm" href="https://www.youtube.com/watch?v={E(prof["video_id"])}" rel="noopener">ดูบน YouTube {ic("ext", 16)}</a></div></div>'
                     f'{PRIVACY_NOTE}</div></section>')
        script += VIDEO_JS
    soc = t.get("social")
    if soc:
        host = urllib.parse.urlparse(soc).netloc.lower()
        label = "Instagram" if "instagram" in host else ("Linktree" if "linktr.ee" in host else "ลิงก์ของ " + name)
        sections += f'<section><h2>ติดตาม</h2><div><a class="btn sec sm" href="{E(soc)}" target="_blank" rel="noopener">{label} {ic("ext", 16)}</a></div></section>'
    sections += (f'<div class="stick"><p class="tpick">ไม่ต้องเลือกอาจารย์ก็ได้ ร้านจัดอาจารย์ที่เหมาะกับคอร์สและเวลาว่างให้</p>'
                 f'{line_btn("สนใจเรียน ให้ร้านจัดอาจารย์ให้", "ทัก LINE · ให้ร้านจัดอาจารย์ให้")}'
                 f'{line_btn("สนใจเรียนกับอาจารย์ " + name, "ขอเรียนกับอาจารย์ " + name, "sec")}</div>')
    body = (f'<nav class="crumb" aria-label="เส้นทาง"><a href="/courses/">คอร์สเรียน</a><span aria-hidden="true">/</span><a href="/courses/#teachers">ทีมครู</a>'
            f'<span aria-hidden="true">/</span><span aria-current="page">{E(name)}</span></nav>'
            f'<div class="pg2"><figure class="pph"><img src="/assets/img/teacher-{s}-cut-640.webp" srcset="/assets/img/teacher-{s}-cut-320.webp 320w, /assets/img/teacher-{s}-cut-640.webp 640w" '
            f'sizes="(min-width:960px) 40vw, 92vw" width="640" height="800" alt="{E(name)} อาจารย์ DJ LAB SIAM" fetchpriority="high" decoding="async"></figure>'
            f'<div class="pbody"><div class="pname"><h1>{E(name)}</h1><p class="role">{E(t["role"].replace(",", " ·"))}</p></div>{sections}</div></div>'
            f'<section class="others"><h2>อาจารย์ท่านอื่น</h2>{tiles(" s", True, exclude=name)}</section>')
    taught = ", ".join(teaches[name])
    return shell(f"/teachers/{s}/", f"{name} — อาจารย์ DJ LAB SIAM",
                 f"{name} สอน {taught} แบบตัวต่อตัว ที่ DJ LAB SIAM สยามสแควร์", body, script=script, active="teachers",
                 css_extra=PFS_CSS if pf else "")


# ───────── /content/ ─────────
def book_backend():
    b = io.open(os.path.join(SITE, "book", "index.html"), encoding="utf-8").read()
    api, key = re.search(r"const API='(https://[a-z0-9.-]+\.supabase\.co/rest/v1/rpc/)'", b), re.search(r"const KEY='([A-Za-z0-9._-]+)'", b)
    if not (api and key):
        die("cannot read the Supabase address / anon key from book/index.html")
    return api.group(1), key.group(1)


CONTENT_JS = r"""<script>
(function(){
var API='@@API@@',KEY='@@KEY@@',PAGE=12,KINDS=[['podcast','Podcast'],['video','วิดีโอ'],['short','Shorts']];
var MONTH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
var status=document.getElementById('cl-status'),lists=document.getElementById('cl-lists');
if(!status||!lists)return;
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function thDate(iso){var d=new Date(iso);if(isNaN(d))return '';var t=new Date(d.getTime()+7*3600000);return t.getUTCDate()+' '+MONTH[t.getUTCMonth()]+' '+(t.getUTCFullYear()+543)}
function dur(s){if(typeof s!=='number'||!(s>0))return '';if(s<60)return s+' วินาที';var m=Math.round(s/60),h=Math.floor(m/60);return h?h+' ชม.'+(m%60?' '+(m%60)+' นาที':''):m+' นาที'}
async function rpc(args){var ctl=new AbortController(),to=setTimeout(function(){ctl.abort()},15000);
  try{var r=await fetch(API+'web_content_videos',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(args),signal:ctl.signal});
    if(!r.ok)throw new Error('http '+r.status);var j=await r.json();if(!j||j.ok!==true||!Array.isArray(j.items))throw new Error('bad answer');return j}
  finally{clearTimeout(to)}}
function play(li,v,btn){
  var short=v.kind==='short',box=el('div','cl-frame'+(short?' short':'')),f=document.createElement('iframe'),msg=el('p','cl-fail','เปิดวิดีโอในหน้านี้ไม่ได้ ');
  var a=el('a','','ดูบน YouTube');a.href='https://www.youtube.com/watch?v='+v.id;a.target='_blank';a.rel='noopener';msg.appendChild(a);msg.hidden=true;
  f.src='https://www.youtube-nocookie.com/embed/'+v.id+'?autoplay=1&rel=0';f.title=v.title;
  f.allow='autoplay; encrypted-media; picture-in-picture';f.referrerPolicy='strict-origin-when-cross-origin';f.setAttribute('allowfullscreen','');
  var t=setTimeout(function(){msg.hidden=false},10000);f.addEventListener('load',function(){clearTimeout(t)});
  box.appendChild(f);box.appendChild(msg);btn.hidden=true;li.appendChild(box)}
function item(v){
  var li=el('li','cl-i');li.appendChild(el('p','cl-title',v.title));
  var meta=[thDate(v.published_at),dur(v.duration_s)].filter(Boolean).join(' · ');if(meta)li.appendChild(el('p','cl-meta',meta));
  var row=el('div','cl-actions'),btn=null;
  if(v.embeddable!==false){btn=el('button','btn pri sm','เล่นที่นี่');btn.type='button';btn.setAttribute('aria-label','เล่น: '+v.title);btn.addEventListener('click',function(){play(li,v,btn)});row.appendChild(btn)}
  var a=el('a','btn sec sm','ดูบน YouTube');a.href='https://www.youtube.com/watch?v='+v.id;a.target='_blank';a.rel='noopener';row.appendChild(a);li.appendChild(row);return li}
function validItems(j){return j.items.filter(function(v){return v&&typeof v.id==='string'&&/^[A-Za-z0-9_-]{11}$/.test(v.id)&&typeof v.title==='string'&&v.title})}
function makeGroup(kind,label){
  var box=el('section','cl-group'),ul=el('ul','cl-list'),more=el('button','btn sec','โหลดเพิ่ม'),note=el('p','cl-note');more.type='button';more.hidden=true;note.hidden=true;
  box.hidden=true;box.appendChild(el('h3','',label));box.appendChild(ul);box.appendChild(more);box.appendChild(note);lists.appendChild(box);
  var g={next:null,count:0,failed:false};
  g.load=async function(){
    var args={p_limit:PAGE,p_kind:kind};if(g.next){args.p_before=g.next.before;args.p_before_id=g.next.before_id}
    more.disabled=true;note.hidden=true;
    try{var j=await rpc(args);validItems(j).forEach(function(v){ul.appendChild(item(v));g.count++});
      g.next=j.next&&j.next.before&&j.next.before_id?j.next:null;g.failed=false;more.hidden=!g.next;box.hidden=g.count===0}
    catch(e){if(g.count){note.textContent='โหลดเพิ่มไม่สำเร็จ ลองกดอีกครั้ง';note.hidden=false;more.hidden=false}else g.failed=true}
    more.disabled=false};
  more.addEventListener('click',g.load);return g}
var groups=KINDS.map(function(k){return makeGroup(k[0],k[1])});
function banner(){status.textContent='';status.removeAttribute('role');
  var failed=groups.some(function(g){return g.failed}),total=groups.reduce(function(n,g){return n+g.count},0);
  if(failed){status.setAttribute('role','alert');var b=el('div','cl-err');b.appendChild(el('p','','โหลดรายการคลิปไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'));
    var r=el('button','btn sec sm','ลองใหม่');r.type='button';r.addEventListener('click',start);b.appendChild(r);status.appendChild(b);return}
  if(!total){var e=el('div','cl-empty');e.appendChild(el('p','','ตอนนี้ยังไม่มีคลิปแสดงที่หน้านี้ ดูคลิปทั้งหมดได้ที่ช่อง YouTube ของ DJ LAB SIAM'));
    var a=el('a','btn pri','ดูคลิปทั้งหมดบน YouTube');a.href='https://www.youtube.com/@DJLABSIAM';a.target='_blank';a.rel='noopener';e.appendChild(a);status.appendChild(e)}}
async function start(){status.removeAttribute('role');status.textContent='กำลังโหลดรายการคลิป…';
  await Promise.all(groups.filter(function(g){return !g.count}).map(function(g){return g.load()}));banner()}
start();
})();
</script>
"""


CONTENT_NOTE = ('<details class="fc-priv"><summary>ข้อมูลความเป็นส่วนตัวของหน้านี้</summary>'
                '<p>รายการคลิปดึงจากฐานข้อมูลของร้านบน Supabase เมื่อเปิดหน้านี้ Supabase จะได้รับข้อมูลทางเทคนิคของคุณ เช่น หมายเลข IP และชนิดเบราว์เซอร์ '
                'ก่อนกดเล่น หน้านี้ไม่เรียกข้อมูลใดจาก YouTube เมื่อกด "เล่นที่นี่" เบราว์เซอร์ของคุณจะเชื่อมต่อกับ YouTube (Google) เพื่อแสดงวิดีโอ โดยใช้โหมดความเป็นส่วนตัวขั้นสูง (youtube-nocookie.com) '
                'Google อาจเก็บข้อมูลการใช้งานตามนโยบายของ Google ร้านไม่ได้รับข้อมูลนั้น · <a href="/privacy.html">นโยบายความเป็นส่วนตัวของร้าน</a></p></details>')


def content_page():
    cards = ""
    for p in PROGRAMS:
        inner = f'<h3>{E(p["name"])}</h3>'
        if p.get("when"):
            inner += f'<p class="when"><b>{E(p["when"])}</b></p>'
        if p.get("desc"):
            inner += f'<p>{E(p["desc"])}</p>'
        if p.get("link"):
            inner += f'<a class="btn pri" href="{E(p["link"])}" target="_blank" rel="noopener">{E(p.get("link_label", "ดูรายการ"))} {ic("ext", 18)}</a>'
        cards += f'<div class="slc">{inner}</div>'
    listen = "".join(f'<a class="btn {"pri" if i == 0 else "sec"}" href="{E(x["url"])}" target="_blank" rel="noopener">{E(x["label"])} {ic("ext", 18)}</a>' for i, x in enumerate(LISTEN))
    api, key = book_backend()
    body = (f'<section class="hero">{GEAR_HERO}<h1>วิดีโอและรายการจาก DJ LAB SIAM</h1>'
            f'<p class="lede">เทคนิค อุปกรณ์ และเรื่องราววงการ DJ จากทีมงานที่เป็น DJ จริง</p><div class="listen">{listen}</div></section>'
            f'<section><h2>รายการประจำ</h2><div class="slgrid">{cards}</div></section>'
            f'<section id="clips"><h2>คลิปล่าสุด</h2><div id="cl-status" aria-live="polite"></div><div id="cl-lists"></div>'
            f'<noscript><p class="lede2">ต้องเปิด JavaScript เพื่อดูรายการคลิปในหน้านี้ หรือ <a href="https://www.youtube.com/@DJLABSIAM" target="_blank" rel="noopener">ดูคลิปทั้งหมดที่ช่อง YouTube</a></p></noscript>{CONTENT_NOTE}</section>')
    return shell("/content/", "วิดีโอและรายการ — DJ LAB SIAM", "รายการประจำและคลิปจากทีม DJ LAB SIAM", body, robots="noindex,follow", active="content",
                 script=CONTENT_JS.replace("@@API@@", api).replace("@@KEY@@", key))


# ───────── / (home) ─────────
HOME_CSS = r"""
.hhero{display:grid;gap:36px;align-items:center}
.hhero h1{font-size:40px;line-height:1.3;max-width:15ch}
.hbadge{display:inline-flex;gap:8px;align-items:center;background:var(--lab-tint);color:#981C21;padding:8px 14px;border-radius:var(--radius-pill);font:600 14px/1.4 var(--font-family-body);margin-bottom:18px}
.hbadge i{width:8px;height:8px;border-radius:50%;background:var(--brand-base);display:block}
.hphoto{position:relative}
.hphoto .ph{border-radius:var(--radius-lg);overflow:hidden;aspect-ratio:4/3;background:#222;box-shadow:0 30px 60px rgba(15,15,15,.18);transform:rotate(1.2deg)}
.hphoto .ph img{width:100%;height:100%;object-fit:cover}
.htag{position:absolute;z-index:3;background:#fff;border-radius:var(--radius-md);padding:10px 16px 10px 34px;box-shadow:0 12px 24px rgba(15,15,15,.18);font:600 15px/1.4 var(--font-family-display)}
.htag::before{content:"";position:absolute;left:12px;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;border:3px solid var(--brand-base);background:#fff}
.htag small{display:block;font:400 13px/1.4 var(--font-family-body);color:var(--text-muted)}
.htag.a{left:-2%;bottom:10%;transform:rotate(-3deg)}
.htag.b{right:-2%;top:-6%;transform:rotate(2.5deg)}
.pgm>section.dm-inv{padding:0}
@media (min-width:960px){
  .pgm>.hero.dm{padding-right:0}
}
.rackband.lt{padding:32px 0 0}
.rackband.lt .rack *{stroke:#0F0F0F;fill:#fff}
.rackband.lt .rack path{fill:none}
.rackband.lt .rack .rk-g{fill:none}
.rackband.lt .rack .rk-r{stroke:var(--brand-base)}
.rackband.lt .rack .rk-rf{fill:var(--brand-base);stroke:var(--brand-base)}
.hsec h2{font-size:30px}
.hsec .lede{margin-top:10px}
.eqgrid{display:grid;gap:14px;grid-template-columns:repeat(2,1fr);margin-top:28px}
.eq{background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);padding:18px 14px 16px;text-align:center;position:relative}
.eq::before{content:"";position:absolute;left:50%;top:9px;width:12px;height:12px;margin-left:-6px;border-radius:50%;border:2px solid var(--lab-line);background:var(--lab-paper)}
.eq svg{width:100%;max-width:118px;height:auto;margin:10px auto 6px;stroke:var(--text-primary);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.eq svg .r{stroke:var(--brand-base)}
.eq b{display:block;font:700 18px/1.4 var(--font-family-display)}
.hevent{display:grid;gap:14px;padding:26px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-lg)}
.hevent h3{font-size:24px;line-height:1.35}
.hevent p{color:var(--text-secondary);max-width:60ch}
.hev-m{margin:0;grid-column:1/-1}
.hev-m img{display:block;width:100%;height:auto;border-radius:var(--radius-md)}
.h3d{display:grid;gap:22px;align-items:center}
.h3d-t{display:grid;gap:14px;align-content:center}
.h3d-t p{color:var(--text-secondary);max-width:56ch}
.h3d-t ul{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-weight:600}
.h3d-t li::before{content:"✓ ";color:var(--brand-base)}
.h3d-t .acts{display:flex;flex-wrap:wrap;gap:12px}
.h3d-s{position:relative;aspect-ratio:5/3;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--lab-line);background-color:#FAF9F6;
  background-image:linear-gradient(rgba(15,15,15,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,.05) 1px,transparent 1px);background-size:20px 20px}
.h3d-s img{width:100%;height:100%;object-fit:contain;padding:3%;mix-blend-mode:multiply}
.h3d-s .btn{position:absolute;left:50%;bottom:16px;transform:translateX(-50%)}
.h3d-s model-viewer{position:absolute;inset:0;width:100%;height:100%;background:linear-gradient(#F4F2EC,#fff)}
.h3d-ar{position:absolute;right:14px;bottom:14px;min-height:48px;padding:0 18px;border:0;border-radius:999px;background:var(--brand-base);color:#fff;font:700 15px/1 var(--font-family-display);cursor:pointer;box-shadow:0 10px 20px rgba(15,15,15,.3)}
.hpod{display:grid;gap:16px;padding:28px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-lg)}
.hpod h2{font-size:30px}
.hpod .tag{font:700 13px/1 var(--font-family-display);letter-spacing:.12em;color:var(--brand-base)}
.hpod p{color:var(--text-secondary);max-width:58ch}
.hpod .acts{display:flex;flex-wrap:wrap;gap:12px}
.hlive{display:grid;gap:18px;padding:28px;background:#0F0F0F;color:#fff;border-radius:var(--radius-lg)}
.hlive h2{font-size:30px}
.hlive p{color:#D8D6CF;max-width:58ch}
.hlive .acts{display:flex;flex-wrap:wrap;gap:12px}
.hlive .btn.sec{background:transparent;border-color:#fff;color:#fff}
.hlive .btn.sec:hover{background:#fff;color:#0F0F0F}
.hl-t{display:grid;gap:18px;align-content:center}
.cov{position:relative;aspect-ratio:16/9;border-radius:var(--radius-md);overflow:hidden;background:#000;box-shadow:0 18px 36px rgba(0,0,0,.45)}
.cov ul{margin:0;padding:0;list-style:none}
.cv{position:absolute;inset:0;opacity:0;transition:opacity .7s ease;pointer-events:none}
.cv.on{opacity:1;pointer-events:auto}
.cv a,.cv img{display:block;width:100%;height:100%}
.cv img{object-fit:cover}
.cv-b{position:absolute;top:calc(50% - 20px);width:40px;height:40px;border-radius:50%;border:0;background:rgba(15,15,15,.62);color:#fff;font:700 24px/1 var(--font-family-display);cursor:pointer}
.cv-b.p{left:8px}.cv-b.n{right:8px}
.cv-n{position:absolute;right:10px;bottom:8px;background:rgba(15,15,15,.7);color:#fff;font:600 12px/1.4 var(--font-family-body);padding:2px 10px;border-radius:999px;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.cv{transition:none}}
.hvisit{display:grid;gap:20px}
.hvisit .ph{border-radius:var(--radius-lg);overflow:hidden;background:#222;aspect-ratio:16/9}
.hvisit .ph img{width:100%;height:100%;object-fit:cover}
.hvisit dl{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;margin:16px 0 22px}
.hvisit dt{font-weight:700}
.hvisit dd{margin:0}
.hbot{display:grid;gap:12px;padding:18px 20px;background:var(--lab-paper);border-radius:var(--radius-md);color:var(--text-secondary);font-size:15px}
.hbot a{font-weight:700;color:var(--text-primary)}
@media (min-width:960px){
  .hhero{grid-template-columns:1.05fr 1fr;gap:64px}
  .hhero h1{font-size:58px;line-height:1.28;max-width:17ch}
  .pgm>.hero.hhero{padding-right:0}
  .eqgrid{grid-template-columns:repeat(6,1fr)}
  .hsec h2{font-size:38px}
  .hevent{grid-template-columns:1fr 1.3fr;align-items:center;padding:36px}
  .hlive{grid-template-columns:1.4fr 1fr;align-items:center;padding:44px}
  .h3d{grid-template-columns:1fr 1.25fr;gap:48px}
  .hpod{grid-template-columns:1.3fr 1fr;align-items:center;padding:36px}
  .hvisit{grid-template-columns:1.1fr 1fr;gap:56px;align-items:center}
  .hbot{grid-template-columns:repeat(3,auto);justify-content:space-between}
}
"""

HOME_CSS += cdj_demo.CSS

SITE_ORG = {
    "@type": "Organization", "@id": ORIGIN + "/#org", "name": "DJ LAB SIAM", "legalName": "DJ LAB SIAM CO., LTD.", "url": ORIGIN + "/",
    "logo": ORIGIN + "/logo_full.png", "email": "djlabsiam@gmail.com", "telephone": "+66-2-252-5868",
    "sameAs": ["https://www.facebook.com/PioneerDjLabSiam/", "https://www.instagram.com/djlabsiam/", "https://www.youtube.com/@DJLABSIAM",
               "https://www.tiktok.com/@djlabsiam4", "https://discord.gg/VPnxXGuK8z", "https://maps.google.com/?cid=14947686714332238791"],
}
SITE_LOCAL = {
    "@type": ["MusicSchool", "Store"], "@id": ORIGIN + "/#local", "name": "DJ LAB SIAM",
    "description": "โรงเรียนสอน DJ ตัวต่อตัว และตัวแทนจำหน่ายอุปกรณ์ Pioneer DJ / AlphaTheta อย่างเป็นทางการ รวมถึงสายสัญญาณ NEO by OYAIDE",
    "url": ORIGIN + "/", "image": ORIGIN + "/logo_full.png", "telephone": "+66-2-252-5868", "email": "djlabsiam@gmail.com",
    "parentOrganization": {"@id": ORIGIN + "/#org"}, "hasMap": "https://maps.google.com/?cid=14947686714332238791",
    "address": {"@type": "PostalAddress", "streetAddress": "Lido Connect ชั้น 2, Siam Square Soi 3", "addressLocality": "ปทุมวัน",
                "addressRegion": "กรุงเทพมหานคร", "postalCode": "10330", "addressCountry": "TH"},
    "openingHoursSpecification": {"@type": "OpeningHoursSpecification",
                                  "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], "opens": "12:00", "closes": "20:00"},
    "priceRange": "฿฿",
    "brand": [{"@type": "Brand", "name": "Pioneer DJ"}, {"@type": "Brand", "name": "AlphaTheta"}, {"@type": "Brand", "name": "NEO by OYAIDE"}],
}
SITE_WEB = {"@type": "WebSite", "@id": ORIGIN + "/#website", "url": ORIGIN + "/", "name": "DJ LAB SIAM", "inLanguage": "th",
            "publisher": {"@id": ORIGIN + "/#org"}}
COURSE_LD_ID = {"Basic DJ Class": "course-beginner", "Advance DJ Class": "course-intermediate",
                "Basic Scratch Class": "course-turntablism", "Advance Scratch Class": "course-professional"}   # ids kept from the old page so nothing that links to them breaks

EQ_ITEMS = [("player", "CDJ / Player"), ("mixer", "Mixer"), ("controller", "Controller"), ("turntable", "Turntable"),
            ("headphones", "หูฟัง"), ("cable", "สายและอุปกรณ์เสริม")]
EQ_SYMBOLS = (
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
    '<symbol id="e-player" viewBox="0 0 120 90"><rect x="6" y="8" width="108" height="74" rx="10"/><circle cx="60" cy="52" r="22"/><circle class="r" cx="60" cy="52" r="5"/><rect x="30" y="14" width="60" height="12" rx="3"/></symbol>'
    '<symbol id="e-mixer" viewBox="0 0 120 90"><rect x="8" y="6" width="104" height="78" rx="10"/><path d="M30 22v46M52 22v46M74 22v46M96 22v46"/><rect class="r" x="25" y="50" width="10" height="8" rx="2"/><rect x="47" y="34" width="10" height="8" rx="2"/><rect x="69" y="46" width="10" height="8" rx="2"/><rect x="91" y="30" width="10" height="8" rx="2"/></symbol>'
    '<symbol id="e-controller" viewBox="0 0 120 90"><rect x="4" y="14" width="112" height="62" rx="10"/><circle cx="32" cy="46" r="17"/><circle cx="88" cy="46" r="17"/><path d="M52 30h16M52 40h16M52 50h16"/><circle class="r" cx="32" cy="46" r="3"/><circle class="r" cx="88" cy="46" r="3"/></symbol>'
    '<symbol id="e-turntable" viewBox="0 0 120 90"><rect x="8" y="6" width="104" height="78" rx="10"/><circle cx="52" cy="45" r="28"/><circle class="r" cx="52" cy="45" r="5"/><path d="M96 16l-6 36"/><circle cx="96" cy="16" r="4"/></symbol>'
    '<symbol id="e-headphones" viewBox="0 0 120 90"><path d="M22 54V44a38 38 0 0 1 76 0v10"/><rect x="14" y="50" width="20" height="30" rx="8"/><rect class="r" x="86" y="50" width="20" height="30" rx="8"/></symbol>'
    '<symbol id="e-cable" viewBox="0 0 120 90"><path d="M10 28h18v-8h14v16H28v-8M110 62H92v8H78V54h14v8"/><path class="r" d="M42 28c26 0 10 34 36 34"/></symbol>'
    '</svg>')


def home_faq_pairs():
    cfg = load(A.home_faq)
    by_id = {it["id"]: faq_text(it["a"]) for it in FAQ}
    qs = {it["id"]: it["q"] for it in FAQ}
    pairs = [(qs[i], by_id[i]) for i in cfg["ids"]]
    pairs += [(x["q"], x["a"]) for x in cfg["extra"]]
    return pairs


CONTEST = load(os.path.join(SITE, "data", "contest.json")) if os.path.exists(os.path.join(SITE, "data", "contest.json")) else {}


def contest_media():
    if not CONTEST.get("img"):
        return ""
    img = f'<img src="/assets/img/{E(CONTEST["img"])}" width="1280" height="720" alt="{E(CONTEST.get("alt", ""))}" loading="lazy" decoding="async">'
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", CONTEST.get("yt", "")):
        img = f'<a href="https://www.youtube.com/watch?v={CONTEST["yt"]}" target="_blank" rel="noopener">{img}</a>'
    return f'<figure class="hev-m">{img}</figure>'


SUNDAY = (load(os.path.join(SITE, "data", "sunday-covers.json")).get("items") or []) if os.path.exists(os.path.join(SITE, "data", "sunday-covers.json")) else []


def cover_slider():
    if not SUNDAY:
        return ""
    sl = ""
    for k, it in enumerate(SUNDAY):
        img = (f'<img src="/assets/img/sunday/{E(it["img"])}" width="960" height="540" alt="{E(it["alt"])}"'
               + (' fetchpriority="low" loading="lazy"' if k else ' loading="lazy"') + ' decoding="async">')
        if it.get("yt") and re.fullmatch(r"[A-Za-z0-9_-]{11}", it["yt"]):
            img = f'<a href="https://www.youtube.com/watch?v={it["yt"]}" target="_blank" rel="noopener" tabindex="-1">{img}</a>'
        sl += f'<li class="cv{" on" if k == 0 else ""}">{img}</li>'
    return (f'<div class="cov" id="cov" role="group" aria-roledescription="carousel" aria-label="ปกรายการและวิดีโอจาก DJ LAB SIAM"><ul>{sl}</ul>'
            f'<button type="button" class="cv-b p" aria-label="ปกก่อนหน้า">‹</button><button type="button" class="cv-b n" aria-label="ปกถัดไป">›</button>'
            f'<div class="cv-n" aria-live="off"><span id="cv-i">1</span> / {len(SUNDAY)}</div></div>')


COV_JS = """<script>
(function(){var c=document.getElementById('cov');if(!c)return;var L=[].slice.call(c.querySelectorAll('.cv')),i=0,n=document.getElementById('cv-i'),t=null,
rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function go(k){L[i].classList.remove('on');i=(k+L.length)%L.length;L[i].classList.add('on');n.textContent=i+1;
  var a=L[i].querySelector('a');L.forEach(function(x){var q=x.querySelector('a');if(q)q.tabIndex=x===L[i]?0:-1})}
function auto(){stop();if(!rm)t=setInterval(function(){go(i+1)},4200)}function stop(){if(t){clearInterval(t);t=null}}
c.querySelector('.cv-b.p').addEventListener('click',function(){go(i-1);auto()});c.querySelector('.cv-b.n').addEventListener('click',function(){go(i+1);auto()});
c.addEventListener('mouseenter',stop);c.addEventListener('mouseleave',auto);c.addEventListener('focusin',stop);c.addEventListener('focusout',auto);
var sx=null;c.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;stop()},{passive:true});
c.addEventListener('touchend',function(e){if(sx===null)return;var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>40)go(i+(d<0?1:-1));sx=null;auto()});
if('IntersectionObserver' in window)new IntersectionObserver(function(e){e[0].isIntersecting?auto():stop()}).observe(c);else auto()})();
</script>"""


H3D_JS = """<script>
(function(){var b=document.getElementById('h3d-go');if(!b)return;
b.addEventListener('click',function(){var s=document.getElementById('h3d-s'),sc=document.createElement('script');sc.type='module';sc.src='/assets/vendor/model-viewer.min.js';document.head.appendChild(sc);
var v=document.createElement('model-viewer');v.setAttribute('src','@@M3@@b919dcc5-187e-4d4c-b3d8-b4b9d3b084d1.glb');v.setAttribute('alt','โมเดล 3 มิติของ DDJ-FLX4');
['camera-controls','auto-rotate','ar'].forEach(function(a){v.setAttribute(a,'')});v.setAttribute('shadow-intensity','1');v.setAttribute('camera-orbit','-30deg 70deg 85%');
v.setAttribute('ar-modes','webxr scene-viewer quick-look');v.setAttribute('ar-scale','fixed');v.setAttribute('ar-placement','floor');
var a=document.createElement('button');a.type='button';a.slot='ar-button';a.className='h3d-ar';a.textContent='วางเครื่องในห้องของคุณ (AR)';v.appendChild(a);
v.addEventListener('error',function(){v.remove();b.hidden=false;b.textContent='เปิดดู 3D ที่ SHOP';b.onclick=function(){location.href='/shop/'}});
b.hidden=true;s.appendChild(v)})})();
</script>"""


def home_page():
    live = A.home == "/"
    pairs = home_faq_pairs()
    faq = "".join(f'<details class="q"{" open" if i == 0 else ""}><summary>{E(q)}</summary><p>{E(a)}</p></details>' for i, (q, a) in enumerate(pairs))
    pod = next(x for x in PROGRAMS if x["name"] == "DJ LAB Podcast")
    pod_btns = "".join(f'<a class="btn {"pri" if i == 0 else "sec"}" href="{E(x["url"])}" target="_blank" rel="noopener">{E(x["label"])} {ic("ext", 18)}</a>' for i, x in enumerate(LISTEN))
    body = (
        cdj_demo.section_html(line_btn("สนใจอุปกรณ์/คอร์สของ DJ LAB SIAM", "ทัก LINE ถามราคา")) +
        cdj_demo.invite_html(line_btn("อยากเริ่มเรียน DJ ที่ DJ LAB SIAM", "ทัก LINE ถามคอร์ส"), len(TEACHERS)) +
        f'<section class="hsec" id="shop3d"><div class="h3d"><div class="h3d-t"><h2>ดูเครื่องแบบ 3 มิติ แล้ววางในห้องคุณด้วย AR</h2>'
        f'<p>ตัวแทนจำหน่ายอย่างเป็นทางการของ Pioneer DJ, AlphaTheta และ NEO by OYAIDE · เลือกอุปกรณ์ที่ SHOP แล้วกด "ดู 3D" เพื่อหมุนดูทุกมุม บนมือถือหรือแท็บเล็ตกด AR เพื่อวางเครื่องบนโต๊ะหรือพื้นที่จริงของคุณ เห็นขนาดจริงก่อนตัดสินใจ</p>'
        f'<ul><li>หมุนและซูมดูรายละเอียดเครื่อง</li><li>วางด้วย AR ในห้องหรือสตูดิโอของคุณ</li><li>ดูราคาและสถานะสินค้าในหน้าเดียว</li></ul>'
        f'<div class="acts"><a class="btn pri" href="/shop/">ไปที่ SHOP</a></div></div>'
        f'<div class="h3d-s" id="h3d-s"><img src="/assets/img/pc-ddj-flx4.webp" width="640" height="384" alt="Pioneer DJ DDJ-FLX4" loading="lazy" decoding="async">'
        f'<button type="button" class="btn sec" id="h3d-go">ลองหมุน 3D</button></div></div></section>'
        f'<section class="hsec"><div class="hevent"><h3>DJ LAB Open Format Contest ร่วมกับ AlphaTheta และ Mahajak</h3>'
        f'<p>DJ LAB SIAM เป็นผู้จัดการแข่งขัน DJ ระดับประเทศ ร่วมกับ AlphaTheta และ Mahajak ไม่ใช่แค่โรงเรียน แต่เป็นศูนย์กลางของคนรัก DJ</p>{contest_media()}</div></section>'
        f'<section class="hsec"><div class="hlive"><div class="hl-t"><h2>Sunday Live ทุกวันอาทิตย์ 18:30 น.</h2>'
        f'<p>ไลฟ์สดคุยเรื่อง DJ ทุกมิติ เทคนิค อุปกรณ์ วงการ และตอบคำถามกับทีม DJ LAB SIAM ทาง Facebook Page</p>'
        f'<div class="acts"><a class="btn pri" href="https://www.facebook.com/PioneerDjLabSiam/" target="_blank" rel="noopener">ติดตามบน Facebook {ic("ext", 18)}</a>'
        f'<a class="btn sec" href="/content/">ดูรายการทั้งหมด</a></div></div>{cover_slider()}</div></section>'
        f'<section class="hsec" id="podcast"><div class="hpod"><div><span class="tag">PODCAST</span><h2>{E(pod["name"])}</h2></div>'
        f'<div><p>{E(pod["when"])}</p><div class="acts">{pod_btns}</div></div></div></section>'
        f'<section class="hsec"><div class="hvisit"><div class="ph"><img src="/assets/img/location-wide.webp" width="1600" height="587" alt="หน้าร้าน DJ LAB SIAM ที่ Lido Connect ชั้น 2" loading="lazy" decoding="async"></div>'
        f'<div><h2>แวะมาที่ร้านได้เลย</h2><dl><dt>ที่อยู่</dt><dd>Lido Connect ชั้น 2, Siam Square Soi 3 ปทุมวัน กรุงเทพฯ 10330</dd>'
        f'<dt>เปิด</dt><dd>ทุกวัน 12:00–20:00 น.</dd><dt>โทร</dt><dd><a href="tel:022525868">02-252-5868</a> · <a href="tel:0886560464">088-656-0464</a></dd></dl>'
        f'<div class="cta"><a class="btn pri" href="https://maps.google.com/?cid=14947686714332238791" target="_blank" rel="noopener">เปิดแผนที่ {ic("ext", 18)}</a>'
        f'<a class="btn sec" href="/book/">จองห้องซ้อม</a></div></div></div></section>'
        f'<section class="hsec faq" id="faq"><h2>คำถามที่พบบ่อย</h2><div class="qs">{faq}</div></section>'
        f'<section class="endcta"><h2>อยากได้เครื่อง หรืออยากเริ่มเรียน ทักมาคุยได้เลย</h2><div class="cta">{line_btn("ขอคำแนะนำจาก DJ LAB SIAM", "ทักหา LINE @djlabsiam")}'
        f'<a class="btn sec" href="tel:022525868">{ic("phone", 18)} โทร 02-252-5868</a></div></section>')
    graph = [SITE_ORG, SITE_LOCAL, SITE_WEB]
    ld = [{"@context": "https://schema.org", "@graph": graph},
          {"@context": "https://schema.org", "@type": "FAQPage", "@id": ORIGIN + "/#faqpage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in pairs]}]
    title = "DJ LAB SIAM — โรงเรียนสอน DJ & Authorized Pioneer DJ Dealer"
    desc = "เรียน DJ จากมืออาชีพตัวจริง ตัวแทนจำหน่ายอุปกรณ์ Pioneer DJ และ AlphaTheta อย่างเป็นทางการ Lido Connect Siam Square"
    # the interactive demo's CSS/JS are large: serve them as cached static files (page HTML stays small), cache-busted by content hash
    js_src = re.sub(r"</?script>", "", cdj_demo.js_html() + COV_JS + H3D_JS.replace("@@M3@@", re.match(r"https://[a-z0-9.-]+\.supabase\.co", book_backend()[0]).group(0) + "/storage/v1/object/public/product-3d/"))
    css_src = minify_css(HOME_CSS)
    ver = {}
    for rel, txt in (("assets/js/home.js", js_src), ("assets/css/home.css", css_src)):
        fp = os.path.join(A.out, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with io.open(fp, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(txt)
        ver[rel] = hashlib.md5(txt.encode("utf-8")).hexdigest()[:8]
    return shell(A.home, title, desc, body, robots=None if live else "noindex,follow", ld=ld, active="",
                 script='<script src="/assets/js/home.js?v=' + ver["assets/js/home.js"] + '" defer></script>\n',
                 head_extra='<link rel="stylesheet" href="/assets/css/home.css?v=' + ver["assets/css/home.css"] + '">\n')



# ───────── /shop/ ─────────
SHOP_CSS = r"""
.shead h1{max-width:16ch}
.sbar{display:grid;gap:14px;margin-top:28px}
.schips{display:flex;flex-wrap:wrap;gap:8px}
.schip{min-height:44px;padding:0 16px;border:1.5px solid var(--lab-line);border-radius:var(--radius-pill);background:#fff;font:600 15px/1 var(--font-family-display);cursor:pointer;color:var(--text-primary)}
.schip:hover{border-color:var(--text-primary)}
.schip[aria-pressed="true"]{background:var(--text-primary);color:#fff;border-color:var(--text-primary)}
.stools{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;font-size:15px;color:var(--text-secondary)}
.stools label{display:inline-flex;align-items:center;gap:8px;min-height:44px}
.stools select{min-height:44px;padding:0 12px;border:1.5px solid var(--lab-line);border-radius:var(--radius-sm);background:#fff;font:500 15px var(--font-family-body)}
.stools input[type=checkbox]{width:20px;height:20px;accent-color:var(--brand-base)}
.scount{margin-top:14px;color:var(--text-secondary);font-size:15px}
.sgrid{display:grid;gap:14px;grid-template-columns:repeat(2,1fr);margin-top:14px}
.pc{background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);overflow:hidden;display:flex;flex-direction:column;transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .3s,border-color .2s}
.pc:hover{transform:translateY(-4px);border-color:var(--text-primary);box-shadow:0 16px 28px rgba(15,15,15,.1)}
.pc .art{position:relative;aspect-ratio:4/3;display:grid;place-items:center;overflow:hidden;background-color:#FAF9F6;
  background-image:linear-gradient(rgba(15,15,15,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,.05) 1px,transparent 1px);background-size:20px 20px}
.pc .art img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:12px;mix-blend-mode:multiply}
.pc .art svg{width:56%;height:auto;stroke:var(--text-primary);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.pc .art svg .r{stroke:var(--brand-base)}
.stk{position:absolute;left:10px;top:10px;z-index:2;font:600 13px/1.4 var(--font-family-body);padding:3px 10px;border-radius:var(--radius-pill);background:#fff;box-shadow:0 2px 6px rgba(15,15,15,.14)}
.stk.in{color:var(--status-active-text)}
.stk.out{color:var(--text-muted)}
.pc .b{padding:14px 16px 16px;display:flex;flex-direction:column;gap:2px;flex:1}
.pc .br{font:600 13px/1.4 var(--font-family-body);color:var(--text-muted)}
.pc h3{font-size:18px;line-height:1.35}
.pc .pr{font:800 22px/1.4 var(--font-family-display);margin-top:2px}
.pc .btn{margin-top:auto;align-self:flex-start}
.pc .bwrap{margin-top:auto;padding-top:10px}
.pc .acts3{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:10px}
.pc .acts3 .btn{margin:0}
.m3{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,15,15,.72)}
.m3.on{display:flex}
.m3-box{position:relative;width:min(100%,860px);background:#fff;border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.5)}
.m3-h{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid var(--lab-line)}
.m3-h b{font:700 18px/1.3 var(--font-family-display)}
.m3-x{min-width:44px;min-height:44px;border:1.5px solid var(--text-primary);border-radius:50%;background:#fff;font:700 20px/1 var(--font-family-display);cursor:pointer}
.m3 model-viewer{display:block;width:100%;height:min(66vh,520px);background:linear-gradient(#F4F2EC,#fff)}
.m3-f{padding:10px 16px 14px;font-size:13px;color:var(--text-secondary)}
.m3-ar{position:absolute;right:14px;bottom:14px;display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 18px;border:0;border-radius:999px;background:var(--brand-base);color:#fff;font:700 15px/1 var(--font-family-display);cursor:pointer;box-shadow:0 10px 20px rgba(15,15,15,.3)}
.m3-ar:focus-visible{outline:3px solid #fff;box-shadow:0 0 0 6px var(--text-primary)}
.m3-arh{display:none}
.m3-arh.on{display:block;margin-top:4px}
.m3-st{display:grid;place-items:center;height:min(66vh,520px);color:var(--text-secondary)}
.demo3d{margin-top:28px}
.d3-go{position:relative;display:block;width:100%;padding:0;border:0;background:none;cursor:pointer}
.d3-go img{display:block;width:100%;height:auto;filter:drop-shadow(0 22px 22px rgba(15,15,15,.28));transition:transform .4s cubic-bezier(.16,1,.3,1)}
.d3-go:hover img{transform:translateY(-6px) rotate(-1deg)}
.d3-go:focus-visible{outline:3px solid var(--text-primary);outline-offset:6px;border-radius:12px}
.d3-t{position:absolute;left:50%;bottom:6%;transform:translateX(-50%);white-space:nowrap;background:var(--brand-base);color:#fff;font:700 15px/1 var(--font-family-display);padding:12px 20px;border-radius:999px;box-shadow:0 10px 20px rgba(15,15,15,.3)}
.d3-live{position:relative;aspect-ratio:969/500;border-radius:var(--radius-lg);overflow:hidden;background:linear-gradient(#F4F2EC,#fff);border:1px solid var(--lab-line)}
.d3-live model-viewer{width:100%;height:100%;display:block}
.d3-ar{position:absolute;right:12px;bottom:12px;min-height:44px;padding:0 16px;border:0;border-radius:999px;background:var(--brand-base);color:#fff;font:700 14px/1 var(--font-family-display);cursor:pointer;box-shadow:0 8px 16px rgba(15,15,15,.28)}
.d3-n{margin:8px 0 0;font-size:13px;color:var(--text-muted)}
.m3-box{max-height:calc(100vh - 32px);overflow:auto}
.m3-box.hs model-viewer{height:min(50vh,440px)}
.m3-sw{display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px;border-bottom:1px solid var(--lab-line)}
.m3-si{display:grid;gap:6px;padding:12px 16px;border-top:1px solid var(--lab-line)}
.m3-si[hidden]{display:none}
.m3-sl{font-size:14px;color:var(--text-secondary)}
.m3-st2{font:800 22px/1.3 var(--font-family-display)}
.m3-si .btn{justify-self:start}
@media (min-width:960px){.shead{padding-right:calc(min(54vw,980px) + 6vw)!important;min-height:calc(min(54vw,980px) * .47 + 90px)}.shead .demo3d{position:absolute;top:40px;right:5vw;width:min(54vw,980px);margin:0}.shead .d3-n{max-width:60ch}}
.snote{margin-top:24px;color:var(--text-secondary);font-size:15px;max-width:70ch}
.serr{padding:16px 18px;border:1px solid var(--brand-base);background:var(--lab-tint);border-radius:var(--radius-md);margin-top:14px}
@media (min-width:960px){.sgrid{grid-template-columns:repeat(4,1fr);gap:18px}.stools{justify-content:flex-start}}
@media (max-width:420px){.sgrid{grid-template-columns:1fr}}
"""

SHOP_JS = r"""<script>
(function(){
var REST='@@REST@@',KEY='@@KEY@@',IMG='@@IMG@@',LINE='https://line.me/R/oaMessage/%40djlabsiam/?',PAGE=24;
var LABEL={player:'CDJ / Player',mixer:'Mixer','all-in-one':'All-in-one',controller:'Controller',turntable:'Turntable',headphones:'หูฟัง',speaker:'ลำโพง',cable:'สาย',accessory:'อุปกรณ์เสริม'};
var CATMAP={'cdj':'player','เครื่องเล่น':'player','มิกซ์เซอร์':'mixer','mixer':'mixer','all in one':'all-in-one','คอนโทลเลอร์':'controller','คอนโทรลเลอร์':'controller','midi':'controller','หูฟัง':'headphones','ลำโพง':'speaker','cable':'cable','deck cover':'accessory','flash drive':'accessory'};
var LOCAL3D=@@LOCAL3D@@,SETS=@@SETS@@,SETBASE='/assets/models/sets/';
var ROWS=[],cat='all',sort='p-desc',only=false,shown=PAGE,M3={},M3BASE='@@M3@@',MV_LOADED=false;
function mvLoad(){if(MV_LOADED)return;MV_LOADED=true;var s=document.createElement('script');s.type='module';s.src='/assets/vendor/model-viewer.min.js';document.head.appendChild(s)}
var m3=null;
(function(){var go=document.getElementById('d3-go');if(!go)return;
  go.addEventListener('click',function(){var box=document.getElementById('demo3d'),live=el('div','d3-live');mvLoad();
    var v=document.createElement('model-viewer');v.setAttribute('src','/assets/models/djlabsiam-logo.glb');v.setAttribute('alt','โลโก้ DJ LAB SIAM แบบ 3 มิติ');
    v.setAttribute('camera-controls','');v.setAttribute('auto-rotate','');v.setAttribute('shadow-intensity','1');v.setAttribute('camera-orbit','-24deg 78deg auto');
    v.setAttribute('ar','');v.setAttribute('ar-modes','webxr scene-viewer quick-look');v.setAttribute('ar-scale','auto');v.setAttribute('ar-placement','floor');
    var b=document.createElement('button');b.type='button';b.slot='ar-button';b.className='d3-ar';b.textContent='วางในห้องของคุณ (AR)';v.appendChild(b);
    live.appendChild(v);box.replaceChild(live,go)})})();
function setInfo(inf,q){inf.textContent='';inf.hidden=!q;if(!q)return;var sum=0,miss=false,parts=[];
  q.items.forEach(function(it){var r=ROWS.filter(function(x){return x.name.toUpperCase()===it.name.toUpperCase()})[0];
    if(r){sum+=r.price*it.qty;parts.push((it.qty>1?it.qty+' × ':'')+it.name+' '+baht(r.price*it.qty))}else{miss=true;parts.push((it.qty>1?it.qty+' × ':'')+it.name)}});
  inf.appendChild(el('span','m3-sl',parts.join(' + ')));inf.appendChild(el('b','m3-st2',miss?'สอบถามราคารวมของชุดทาง LINE':'รวม '+baht(sum)));
  inf.appendChild(el('span','m3-sl','ราคาปกติรวม VAT 7% แล้ว ไม่ใช่ราคาโปรโมชันชุด ราคาชุดจริงและสต็อกสอบถามทีมงาน'));
  var a=el('a','btn sec sm','ขอใบเสนอราคาทั้งชุดทาง LINE');a.href=LINE+encodeURIComponent('สนใจชุด '+q.title);a.rel='noopener';inf.appendChild(a)}
function open3d(p,m){
  if(!m3){m3=el('div','m3');m3.setAttribute('role','dialog');m3.setAttribute('aria-modal','true');
    m3.addEventListener('click',function(e){if(e.target===m3)close3d()});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&m3.classList.contains('on'))close3d()});document.body.appendChild(m3)}
  m3.textContent='';m3.setAttribute('aria-label','โมเดล 3 มิติ '+p.name);
  var box=el('div','m3-box'),h=el('div','m3-h'),t=el('b','',p.name),x=el('button','m3-x','×');x.type='button';x.setAttribute('aria-label','ปิด');x.addEventListener('click',close3d);
  h.appendChild(t);h.appendChild(x);box.appendChild(h);
  mvLoad();var v=document.createElement('model-viewer');v.setAttribute('src',m3src(m));v.setAttribute('alt','โมเดล 3 มิติของ '+p.name);
  v.setAttribute('camera-controls','');v.setAttribute('auto-rotate','');v.setAttribute('shadow-intensity','1');v.setAttribute('ar','');v.setAttribute('ar-modes','webxr scene-viewer quick-look');v.setAttribute('ar-scale','fixed');v.setAttribute('ar-placement','floor');
  var arb=document.createElement('button');arb.type='button';arb.slot='ar-button';arb.className='m3-ar';arb.textContent='วางเครื่องในห้องของคุณ (AR)';v.appendChild(arb);
  if(m.poster)v.setAttribute('poster',M3BASE+m.poster);
  var f=el('p','m3-f','ลากเพื่อหมุน · บีบ/เลื่อนล้อเมาส์เพื่อซูม'+(m.credit?' · '+m.credit:'')),h=el('span','m3-arh','ต้องการดูขนาดจริงในห้อง: เปิดหน้านี้บนมือถือหรือแท็บเล็ต แล้วกด "วางเครื่องในห้องของคุณ (AR)" ชี้กล้องไปที่พื้นหรือโต๊ะ');
  v.addEventListener('load',function(){if(!v.canActivateAR)h.classList.add('on')});
  box.appendChild(v);box.appendChild(f);f.appendChild(h);
  var sets=SETS.filter(function(q){return q.items.some(function(it){return it.name.toUpperCase()===p.name.toUpperCase()})});
  if(sets.length){box.classList.add('hs');
    var bar=el('div','m3-sw'),inf=el('div','m3-si');inf.hidden=true;
    [{t:'เดี่ยว',s:null}].concat(sets.map(function(q){return {t:'ชุด CDJ ×2 + '+q.mixer,s:q}})).forEach(function(o,i){
      var b=el('button','schip',o.t);b.type='button';b.setAttribute('aria-pressed',i?'false':'true');
      b.addEventListener('click',function(){Array.prototype.forEach.call(bar.children,function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
        v.removeAttribute('poster');v.setAttribute('src',o.s?SETBASE+o.s.file:m3src(m));v.setAttribute('alt',o.s?'โมเดล 3 มิติของชุด '+o.s.title:'โมเดล 3 มิติของ '+p.name);
        arb.textContent=o.s?'วางทั้งชุดในห้อง (AR)':'วางเครื่องในห้องของคุณ (AR)';setInfo(inf,o.s)});bar.appendChild(b)});
    box.insertBefore(bar,v);box.insertBefore(inf,f)}
  m3.appendChild(box);m3.classList.add('on');x.focus();document.body.style.overflow='hidden'}
function close3d(){if(!m3)return;m3.classList.remove('on');m3.textContent='';document.body.style.overflow=''}
function load3d(){   /* optional manifest in the public bucket: {"<product id>": {"file":"x.glb","poster":"x.webp","credit":"..."}} — absent/invalid = no 3D buttons */
  /* the bucket only accepts model/octet-stream types, so the list is a JSON text file named manifest.bin (manifest.json is tried too if the bucket is ever opened to it) */
  return fetch(M3BASE+'manifest.bin',{cache:'no-cache'}).then(function(r){return r.ok?r.text():fetch(M3BASE+'manifest.json',{cache:'no-cache'}).then(function(q){return q.ok?q.text():'{}'})}).then(function(t){try{return JSON.parse(t)}catch(e){return {}}}).then(function(j){
    var o={};Object.keys(j||{}).forEach(function(k){var m=j[k];
      if(/^[0-9a-f-]{36}$/i.test(k)&&m&&typeof m.file==='string'&&/^[A-Za-z0-9._-]{3,120}\.glb$/.test(m.file)&&m.file.indexOf('..')<0)
        o[k]={file:m.file,poster:(typeof m.poster==='string'&&/^[A-Za-z0-9._-]{3,120}\.(webp|jpg|png)$/.test(m.poster))?m.poster:'',credit:(typeof m.credit==='string')?m.credit.slice(0,140):''}});
    return o}).catch(function(){return {}}).then(function(o){   /* models served from this site (data/shop-3d.json); the bucket wins when it lists the same product */
    Object.keys(LOCAL3D).forEach(function(k){var l=LOCAL3D[k];if((!o[k]||l.o)&&/^[0-9a-f-]{36}$/i.test(k))o[k]={file:l.f,poster:'',credit:'',local:true}});return o})}
function m3src(m){return m.local?m.file:M3BASE+m.file}
var grid=document.getElementById('sgrid'),count=document.getElementById('scount'),more=document.getElementById('smore'),NS='http://www.w3.org/2000/svg';
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function baht(n){return '฿'+Number(n).toLocaleString('en-US')}
function group(p){if(p.bot_category&&LABEL[p.bot_category])return p.bot_category;return CATMAP[String(p.category||'').toLowerCase().trim()]||'accessory'}
function brand(b){return (!b||b==='Other')?'แบรนด์อื่น':String(b)}
function icon(g){var s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 120 90');s.setAttribute('aria-hidden','true');
  var u=document.createElementNS(NS,'use');u.setAttribute('href','#p-'+g);s.appendChild(u);return s}
function fit(im){
  try{var W=im.naturalWidth,H=im.naturalHeight;if(!W||!H)return;
    var k=Math.min(1,160/Math.max(W,H)),w=Math.max(2,Math.round(W*k)),h=Math.max(2,Math.round(H*k)),c=document.createElement('canvas');c.width=w;c.height=h;
    var x=c.getContext('2d');x.drawImage(im,0,0,w,h);var D=x.getImageData(0,0,w,h).data,bg=[0,0,0],cs=[0,w-1,(h-1)*w,h*w-1],i,j,t;
    for(i=0;i<4;i++)for(j=0;j<3;j++)bg[j]+=D[cs[i]*4+j]/4;
    var x0=w,x1=-1,y0=h,y1=-1;
    for(var yy=0;yy<h;yy++)for(var xx=0;xx<w;xx++){t=(yy*w+xx)*4;
      if(Math.max(Math.abs(D[t]-bg[0]),Math.abs(D[t+1]-bg[1]),Math.abs(D[t+2]-bg[2]))>90){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy}}
    if(x1<0)return;var bu=(x1-x0+1)/w,bv=(y1-y0+1)/h;if(bu*bv<.04)return;
    var r=W/H,wd0=Math.min(1,.75*r),wd=Math.min(.88/bu,.66*r/bv,wd0*3);if(wd<wd0*1.06)return;
    var hd=wd/r,cu=(x0+x1+1)/2/w,cv=(y0+y1+1)/2/h,s=im.style;
    s.inset='auto';s.padding='0';s.maxWidth='none';s.objectFit='fill';
    s.width=(wd*100)+'%';s.height=(hd/.75*100)+'%';s.left=((.5-cu*wd)*100)+'%';s.top=((.375-cv*hd)/.75*100)+'%'}
  catch(e){}}
function card(p){
  var a=el('article','pc'),art=el('div','art'),ok=typeof p.image_path==='string'&&/^[A-Za-z0-9._\/-]{5,200}$/.test(p.image_path)&&p.image_path.indexOf('..')<0;
  if(ok){var im=document.createElement('img');im.crossOrigin='anonymous';im.src=IMG+p.image_path;im.alt=p.name;im.loading='lazy';im.decoding='async';
    im.addEventListener('load',function(){fit(im)});
    im.addEventListener('error',function(){im.remove();art.appendChild(icon(p.g))});art.appendChild(im)}
  else art.appendChild(icon(p.g));
  var st=el('span','stk '+(p.in_stock?'in':'out'),p.in_stock?'มีของ':'สั่งจอง/สอบถามสต็อก');art.appendChild(st);a.appendChild(art);
  var b=el('div','b');b.appendChild(el('span','br',brand(p.brand)));b.appendChild(el('h3','',p.name));b.appendChild(el('span','pr',baht(p.price)));
  var w=el('div','bwrap'),l=el('a','btn sec sm','ถามทาง LINE');l.href=LINE+encodeURIComponent('สนใจ '+p.name);l.rel='noopener';
  if(M3[p.id]){var d=el('div','acts3'),b3=el('button','btn pri sm','ดู 3D');b3.type='button';b3.setAttribute('aria-label','ดูโมเดล 3 มิติของ '+p.name);
    (function(pp,mm){b3.addEventListener('click',function(){open3d(pp,mm)})})(p,M3[p.id]);d.appendChild(b3);d.appendChild(l);w.appendChild(d)}
  else w.appendChild(l);
  b.appendChild(w);a.appendChild(b);return a}
function render(){
  var rows=ROWS.filter(function(p){return (cat==='all'||p.g===cat)&&(!only||p.in_stock)});
  rows.sort(function(a,b){return sort==='p-desc'?b.price-a.price:sort==='p-asc'?a.price-b.price:a.name.localeCompare(b.name)});
  var list=rows.slice(0,shown);grid.textContent='';list.forEach(function(p){grid.appendChild(card(p))});
  count.textContent='แสดง '+list.length+' จาก '+rows.length+' รายการ';more.hidden=rows.length<=list.length}
Array.prototype.forEach.call(document.querySelectorAll('.schip'),function(c){c.addEventListener('click',function(){
  cat=c.getAttribute('data-cat');shown=PAGE;Array.prototype.forEach.call(document.querySelectorAll('.schip'),function(x){x.setAttribute('aria-pressed',x===c?'true':'false')});render()})});
document.getElementById('ssort').addEventListener('change',function(e){sort=e.target.value;shown=PAGE;render()});
document.getElementById('sstock').addEventListener('change',function(e){only=e.target.checked;shown=PAGE;render()});
more.addEventListener('click',function(){shown+=PAGE;render()});
function fetchAll(off,acc){   /* the API returns at most 100 rows per request: read pages until a short page */
  return fetch(REST+'?select=id,name,brand,category,bot_category,price,in_stock,image_path&price=gt.0&order=price.desc,id.asc&limit=100&offset='+off,{headers:{apikey:KEY,Authorization:'Bearer '+KEY}})
  .then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json()})
  .then(function(d){if(!Array.isArray(d))throw new Error('bad');acc=acc.concat(d);return d.length<100||off>=900?acc:fetchAll(off+100,acc)})}
function load(){count.textContent='กำลังโหลดรายการสินค้า…';
  load3d().then(function(o){M3=o;return fetchAll(0,[])
  .then(function(d){if(!Array.isArray(d))throw new Error('bad');ROWS=d.filter(function(p){return p&&typeof p.name==='string'&&p.name&&Number(p.price)>0}).map(function(p){p.price=Number(p.price);p.g=group(p);return p});render()})
  })  .catch(function(){count.textContent='';var e=el('div','serr');e.setAttribute('role','alert');e.appendChild(el('p','','โหลดรายการสินค้าไม่สำเร็จ ลองใหม่อีกครั้ง หรือถามทีมงานทาง LINE @djlabsiam'));
    var r=el('button','btn sec sm','ลองใหม่');r.type='button';r.addEventListener('click',function(){e.remove();load()});e.appendChild(r);count.parentNode.insertBefore(e,grid)})}
load();
})();
</script>
"""

SHOP_SYMBOLS = (
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
    '<symbol id="p-player" viewBox="0 0 120 90"><rect x="6" y="8" width="108" height="74" rx="10"/><circle cx="60" cy="52" r="22"/><circle class="r" cx="60" cy="52" r="5"/><rect x="30" y="14" width="60" height="12" rx="3"/></symbol>'
    '<symbol id="p-mixer" viewBox="0 0 120 90"><rect x="8" y="6" width="104" height="78" rx="10"/><path d="M30 22v46M52 22v46M74 22v46M96 22v46"/><rect class="r" x="25" y="50" width="10" height="8" rx="2"/><rect x="47" y="34" width="10" height="8" rx="2"/><rect x="69" y="46" width="10" height="8" rx="2"/><rect x="91" y="30" width="10" height="8" rx="2"/></symbol>'
    '<symbol id="p-controller" viewBox="0 0 120 90"><rect x="4" y="14" width="112" height="62" rx="10"/><circle cx="32" cy="46" r="17"/><circle cx="88" cy="46" r="17"/><path d="M52 30h16M52 40h16M52 50h16"/><circle class="r" cx="32" cy="46" r="3"/><circle class="r" cx="88" cy="46" r="3"/></symbol>'
    '<symbol id="p-all-in-one" viewBox="0 0 120 90"><rect x="4" y="10" width="112" height="70" rx="10"/><circle cx="26" cy="52" r="15"/><circle cx="94" cy="52" r="15"/><rect x="40" y="18" width="40" height="16" rx="3"/><path d="M42 48v22M52 48v22M62 48v22M72 48v22M80 48v22"/><circle class="r" cx="26" cy="52" r="3"/></symbol>'
    '<symbol id="p-turntable" viewBox="0 0 120 90"><rect x="8" y="6" width="104" height="78" rx="10"/><circle cx="52" cy="45" r="28"/><circle class="r" cx="52" cy="45" r="5"/><path d="M96 16l-6 36"/><circle cx="96" cy="16" r="4"/></symbol>'
    '<symbol id="p-headphones" viewBox="0 0 120 90"><path d="M22 54V44a38 38 0 0 1 76 0v10"/><rect x="14" y="50" width="20" height="30" rx="8"/><rect class="r" x="86" y="50" width="20" height="30" rx="8"/></symbol>'
    '<symbol id="p-speaker" viewBox="0 0 120 90"><rect x="28" y="4" width="64" height="82" rx="10"/><circle cx="60" cy="30" r="9"/><circle class="r" cx="60" cy="60" r="16"/></symbol>'
    '<symbol id="p-cable" viewBox="0 0 120 90"><path d="M10 28h18v-8h14v16H28v-8M110 62H92v8H78V54h14v8"/><path class="r" d="M42 28c26 0 10 34 36 34"/></symbol>'
    '<symbol id="p-accessory" viewBox="0 0 120 90"><rect x="14" y="24" width="92" height="46" rx="8"/><path d="M30 24v-8h60v8M34 40h20M34 52h32"/><circle class="r" cx="88" cy="46" r="9"/></symbol>'
    '</svg>')


def shop_page():
    live = A.shop == "/shop/"
    api, key = book_backend()
    origin = re.match(r"https://[a-z0-9.-]+\.supabase\.co", api).group(0)
    rest = origin + "/rest/v1/web_products"
    img = origin + "/storage/v1/object/public/product-images/"
    cats = [("all", "ทั้งหมด"), ("player", "CDJ / Player"), ("mixer", "Mixer"), ("all-in-one", "All-in-one"), ("controller", "Controller"),
            ("turntable", "Turntable"), ("headphones", "หูฟัง"), ("speaker", "ลำโพง"), ("cable", "สาย"), ("accessory", "อุปกรณ์เสริม")]
    sets = load(os.path.join(SITE, "data", "shop-sets.json"))["sets"]
    chips = "".join(f'<button class="schip" type="button" data-cat="{k}" aria-pressed="{"true" if k == "all" else "false"}">{E(t)}</button>' for k, t in cats)
    body = (SHOP_SYMBOLS +
            f'<section class="hero shead"><h1>Showroom อุปกรณ์ DJ</h1>'
            f'<p class="lede">ราคาอ่านสดจากระบบร้าน รวม VAT 7% แล้ว เลือกดูตามประเภท แล้วแวะมาลองเครื่องจริงที่ร้านได้เลย</p>'
            f'<div class="cta">{line_btn("สนใจอุปกรณ์ DJ ขอรุ่นและราคา", "ถามรุ่นและราคาทาง LINE")}<a class="btn sec" href="/courses/">ดูคอร์สเรียน</a></div>'
            f'<div class="demo3d" id="demo3d"><button type="button" class="d3-go" id="d3-go" aria-label="ลองหมุนโลโก้ DJ LAB SIAM แบบ 3 มิติ และวางในห้องด้วย AR">'
            f'<img src="/assets/img/demo3d-poster.webp" width="969" height="456" alt="โลโก้ DJ LAB SIAM แบบ 3 มิติ" decoding="async">'
            f'<span class="d3-t">ลองหมุน 3D · วางในห้องด้วย AR</span></button>'
            f'<p class="d3-n">ตัวอย่างฟังก์ชัน 3D: โลโก้ DJ LAB SIAM แบบ 3 มิติ ลองหมุน ซูม หรือวางในห้องของคุณด้วย AR (สินค้าจริงจะมีโมเดลทยอยเพิ่ม)</p></div></section>'
            f'<section id="catalog" aria-label="รายการสินค้า"><div class="sbar"><div class="schips" role="group" aria-label="ประเภทสินค้า">{chips}</div>'
            f'<div class="stools"><label><input type="checkbox" id="sstock"> เฉพาะที่มีของ</label>'
            f'<label>เรียงตาม <select id="ssort"><option value="p-desc">ราคาสูง → ต่ำ</option><option value="p-asc">ราคาต่ำ → สูง</option><option value="m">ชื่อรุ่น</option></select></label></div></div>'
            f'<p class="scount" id="scount" aria-live="polite"></p><div class="sgrid" id="sgrid"></div>'
            f'<div style="text-align:center;margin-top:24px"><button class="btn sec" id="smore" type="button" hidden>แสดงเพิ่ม</button></div>'
            f'<p class="snote">ราคารวม VAT 7% แล้ว เป็นราคาปกติที่ร้านใช้ ไม่รวมโปรโมชัน · สอบถามโปรโมชันและสต็อกล่าสุดทาง LINE @djlabsiam · '
            f'ภาพสินค้าบางรุ่นยังไม่มี จึงแสดงเป็นไอคอนประเภทเครื่อง</p></section>')
    js = SHOP_JS.replace("@@LOCAL3D@@", json.dumps({k: {"f": v["file"], "o": bool(v.get("override"))} for k, v in load(os.path.join(SITE, "data", "shop-3d.json"))["models"].items()})).replace("@@SETS@@", json.dumps([{k: x[k] for k in ("title", "mixer", "file", "items")} for x in sets], ensure_ascii=False)).replace("@@REST@@", rest).replace("@@KEY@@", key).replace("@@IMG@@", img).replace("@@M3@@", origin + "/storage/v1/object/public/product-3d/")
    desc = "Showroom อุปกรณ์ DJ ที่ DJ LAB SIAM พร้อมราคาจากระบบร้าน รวม VAT ตัวแทนจำหน่าย Pioneer DJ และ AlphaTheta อย่างเป็นทางการ"
    return shell(A.shop, "Showroom อุปกรณ์ DJ พร้อมราคา — DJ LAB SIAM", desc, body, robots=None if live else "noindex,follow",
                 active="shop", script=js, css_extra=SHOP_CSS)


def write(path, text):
    full = os.path.join(A.out, path.strip("/").replace("/", os.sep), "index.html")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with io.open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    return full, len(text.encode("utf-8"))


made = [write("/courses/", courses_page())]
for t in TEACHERS:
    made.append(write(f"/teachers/{slug(t['name'])}/", teacher_page(t)))
made.append(write("/content/", content_page()))
made.append(write(A.home, home_page()))
made.append(write(A.shop, shop_page()))
for p, n in made:
    print(f"{n / 1024:6.1f} KB  {os.path.relpath(p, A.out)}")
print(f"courses.json md5 {MD5} · {len(COURSES)} courses · {len(TEACHERS)} teachers")
