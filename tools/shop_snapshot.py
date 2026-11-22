#!/usr/bin/env python3
"""Price / stock snapshot for the product pages /shop/<slug>/  (owner decision 22 Nov 2026: schema.org Offer with price + availability, rebuilt every day).

What lives here (standard library only, so it runs on a bare GitHub Actions runner):
  fetch()    read web_products for the ids on the product pages — ANY doubt (HTTP error, empty answer, price <= 0) = die(): nothing is ever written without a price
  region()   the part of the page that carries the prices (between two HTML comment markers)
  ld_product()  the Product / ProductGroup JSON-LD with an Offer per variant (price as a plain number, THB, InStock / OutOfStock, priceValidUntil = today + 2 days)
  refresh()  daily mode: rewrite ONLY the marked price region and the JSON-LD of the existing shop/<slug>/index.html files (no design files, no courses.json needed)
  check_page()  the guards used by tools/check_pages.py and tools/check_shop.py

The page script (build_pages.py PROD_JS) still reads the live price in the browser and corrects the DOM text and the existing JSON-LD when it differs from this snapshot.
"""
import datetime, html, io, json, os, re, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ORIGIN = "https://djlabsiam.com"
LINE_MSG = "https://line.me/R/oaMessage/%40djlabsiam/?"
E = html.escape
SNAP_A, SNAP_B = "<!--snap:start-->", "<!--snap:end-->"
VALID_DAYS = 2   # priceValidUntil = build day + 2 days (the daily rebuild keeps it ahead)
GROUP_LABEL = {"player": "CDJ / Player", "mixer": "Mixer", "all-in-one": "All-in-one", "controller": "Controller", "turntable": "Turntable", "headphones": "หูฟัง", "speaker": "ลำโพง", "cable": "สาย", "accessory": "อุปกรณ์เสริม"}


def die(msg):
    sys.exit("shop_snapshot: " + msg)


def load(p):
    with io.open(p, encoding="utf-8-sig") as f:
        return json.load(f)


def backend():
    b = io.open(os.path.join(SITE, "book", "index.html"), encoding="utf-8").read()
    api, key = re.search(r"const API='(https://[a-z0-9.-]+\.supabase\.co)/rest/v1/rpc/'", b), re.search(r"const KEY='([A-Za-z0-9._-]+)'", b)
    if not (api and key):
        die("cannot read the Supabase address / anon key from book/index.html")
    return api.group(1), key.group(1)


def today(arg=None):
    return datetime.date.fromisoformat(arg) if arg else datetime.datetime.now(datetime.timezone.utc).date()


# ---------- reading the database ----------
def _get(url, key):
    last = None
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={"apikey": key, "Authorization": "Bearer " + key, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:   # network, HTTP, JSON: retry, then give up loudly
            last = e
            time.sleep(2)
    die(f"cannot read web_products ({last}) — nothing was written")


def fetch(ids, snapshot_file=None):
    """{id: {"price": number, "in_stock": bool}} for the ids that are in web_products. Dies (before anything is written) when the answer cannot be trusted."""
    if snapshot_file:
        rows = load(snapshot_file)
        probe = [1]
    else:
        origin, key = backend()
        base = origin + "/rest/v1/web_products?"
        rows = _get(base + "select=id,price,in_stock&id=in.(" + ",".join(ids) + ")", key)
        probe = _get(base + "select=id&limit=1", key)
    if not isinstance(rows, list) or not isinstance(probe, list):
        die("web_products answered with something that is not a list — nothing was written")
    if not probe:
        die("web_products looks empty (the check row did not come back) — nothing was written")
    out = {}
    for r in rows:
        if not isinstance(r, dict) or r.get("id") not in ids:
            continue
        pr = r.get("price")
        if isinstance(pr, bool) or not isinstance(pr, (int, float)) or pr <= 0:
            die(f"web_products row {r.get('id')} has price {pr!r} — a priced page must not be written without a valid price (nothing was written)")
        out[r["id"]] = {"price": pr, "in_stock": bool(r.get("in_stock"))}
    gone = [i for i in ids if i not in out]
    if gone:
        print("shop_snapshot: not in web_products (shown as 'ไม่มีจำหน่ายแล้ว'): " + ", ".join(gone))
    return out


# ---------- formatting ----------
def num(x):
    return str(int(x)) if float(x) == int(x) else f"{float(x):.2f}"


def baht(x):
    return "฿" + (f"{int(x):,}" if float(x) == int(x) else f"{float(x):,.2f}")


def line_btn(text, label):
    return f'<a class="btn pri" href="{LINE_MSG}{urllib.parse.quote(text, safe="")}" rel="noopener"><span class="dot"></span>{E(label)}</a>'


def region(p, rows, shop):
    """the price rows + notes + buttons + 'no longer sold' block, between the snapshot markers"""
    multi = len(p["variants"]) > 1
    live = [v for v in p["variants"] if v["id"] in rows]
    gone = not live
    h = ""
    for v in p["variants"]:
        lab = E(v.get("label") or v["name"])
        r = rows.get(v["id"])
        if r:
            h += (f'<div class="pv" data-vid="{v["id"]}" data-price="{num(r["price"])}" data-stock="{1 if r["in_stock"] else 0}"><b>{lab}</b>'
                  f'<span class="pr" aria-live="polite">{baht(r["price"])}</span>'
                  f'<span class="stk {"in" if r["in_stock"] else "out"}">{"มีของ" if r["in_stock"] else "สั่งจอง/สอบถามสต็อก"}</span></div>')
        else:
            h += f'<div class="pv" data-vid="{v["id"]}" data-price="" data-stock=""><b>{lab}</b><span class="pr" aria-live="polite">ไม่มีจำหน่ายแล้ว</span><span class="stk" hidden></span></div>'
    msg = f"สนใจ {p['name']}" + (f" ({' / '.join(v['name'] for v in p['variants'])})" if multi else "")
    hid = " hidden" if gone else ""
    return (SNAP_A + f'<div class="vars" id="pvars"{hid}>{h}</div>'
            f'<p class="note" id="pnote"{hid}>ราคาปกติรวม VAT 7% แล้ว ไม่รวมโปรโมชัน สอบถามโปรโมชันและสต็อกล่าสุดทาง LINE @djlabsiam</p>'
            f'<div class="cta" id="pcta"{hid}>{line_btn(msg, "ถามรุ่นนี้ทาง LINE")}<a class="btn sec" href="{shop}">ดูสินค้าทั้งหมด</a></div>'
            f'<div class="gone" id="pgone"{"" if gone else " hidden"} role="status"><p>รุ่นนี้ไม่มีจำหน่ายแล้ว</p><a class="btn sec" href="{shop}">กลับไปดูสินค้าใน SHOP</a></div>' + SNAP_B)


def desc_of(p):
    gl = GROUP_LABEL[p["group"]]
    return p.get("summary") or f"{p['name']} {gl} จาก {p['brand']} ดูราคา สต็อก และสอบถามรุ่นนี้ได้ที่ DJ LAB SIAM ตัวแทนจำหน่ายอย่างเป็นทางการ สยามสแควร์"


def offer(r, url, valid):
    return {"@type": "Offer", "url": url, "priceCurrency": "THB", "price": num(r["price"]), "priceValidUntil": valid.isoformat(),
            "availability": "https://schema.org/" + ("InStock" if r["in_stock"] else "OutOfStock"),
            "priceSpecification": {"@type": "PriceSpecification", "price": num(r["price"]), "priceCurrency": "THB", "valueAddedTaxIncluded": True}}


def ld_product(sl, p, rows, path, valid):
    origin, _ = backend()
    img_base = origin + "/storage/v1/object/public/product-images/"
    url = ORIGIN + path
    desc = desc_of(p)

    def one(nm, v, im, typ="Product"):
        d = {"@type": typ, "name": nm, "brand": {"@type": "Brand", "name": p["brand"]}, "description": desc, "image": im}
        if v and v.get("sku"):
            d["sku"] = v["sku"]
        if v and v["id"] in rows:
            d["offers"] = offer(rows[v["id"]], url, valid)
        return d
    if len(p["variants"]) > 1:
        d = one(p["name"], None, [img_base + v["image_path"] for v in p["variants"]], "ProductGroup")
        d["productGroupID"] = sl
        d["hasVariant"] = [one(v["name"], v, [img_base + v["image_path"]]) for v in p["variants"]]
    else:
        v = p["variants"][0]
        d = one(p["name"], v, [img_base + v["image_path"]])
    return dict({"@context": "https://schema.org"}, **d)


def ld_script(d):
    return f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False).replace("</", "<" + chr(92) + "/")}</script>'


# ---------- daily refresh ----------
def refresh(shop, out, snapshot_file=None, today_arg=None):
    prods = load(os.path.join(SITE, "data", "shop-products.json"))["products"]
    ids = [v["id"] for p in prods.values() for v in p["variants"]]
    rows = fetch(ids, snapshot_file)
    valid = today(today_arg) + datetime.timedelta(days=VALID_DAYS)
    news = {}
    for sl, p in prods.items():
        path = f"{shop}{sl}/"
        f = os.path.join(out, path.strip("/").replace("/", os.sep), "index.html")
        if not os.path.exists(f):
            die(f"{f} does not exist — run the full tools/build_pages.py first (the daily mode only refreshes prices)")
        t = io.open(f, encoding="utf-8", newline="").read()
        if t.count(SNAP_A) != 1 or t.count(SNAP_B) != 1:
            die(f"{f} has no price markers — run the full tools/build_pages.py first")
        pr = {v["id"]: rows[v["id"]] for v in p["variants"] if v["id"] in rows}
        t2 = re.sub(re.escape(SNAP_A) + ".*?" + re.escape(SNAP_B), lambda m: region(p, pr, shop), t, count=1, flags=re.S)
        t2, n = re.subn(r'<script type="application/ld\+json">.*?</script>', lambda m: ld_script(ld_product(sl, p, pr, path, valid)), t2, count=1, flags=re.S)
        if n != 1:
            die(f"{f}: no JSON-LD block found")
        news[f] = (t, t2)
    changed = 0
    for f, (a, b) in news.items():   # every page was built in memory first: only now anything is written
        if a != b:
            with io.open(f, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(b)
            changed += 1
    print(f"shop_snapshot: {len(news)} product pages checked, {changed} changed (priceValidUntil {valid})")


# ---------- guards (used by check_pages.py and check_shop.py) ----------
def check_page(t, sl, p, today_date):
    """list of problems for one built product page"""
    bad = []
    rows = re.findall(r'<div class="pv" data-vid="([^"]+)" data-price="([^"]*)" data-stock="([^"]*)"><b>[^<]*</b><span class="pr"[^>]*>([^<]*)</span>', t)
    if [r[0] for r in rows] != [v["id"] for v in p["variants"]]:
        return [f"{sl}: one price row per variant is required (found {len(rows)})"]
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', t, re.S)
    if not m:
        return [f"{sl}: no JSON-LD"]
    d = json.loads(m.group(1))
    if re.search(r'"(aggregateRating|review)"', m.group(1)):
        bad.append(f"{sl}: ratings/reviews must not be in the JSON-LD")
    targets = d.get("hasVariant") if d.get("@type") == "ProductGroup" else [d]
    if not targets or len(targets) != len(rows):
        return bad + [f"{sl}: JSON-LD variants do not match the price rows"]
    n_live = 0
    for (vid, price, stock, shown), tg in zip(rows, targets):
        o = tg.get("offers")
        if not price:   # 'no longer sold' variant: no price, no Offer
            if o or shown != "ไม่มีจำหน่ายแล้ว" or stock:
                bad.append(f"{sl}: a variant that is not in web_products must show 'ไม่มีจำหน่ายแล้ว' and have no Offer")
            continue
        n_live += 1
        if not isinstance(o, dict) or o.get("@type") != "Offer":
            bad.append(f"{sl}: variant {vid} has no Offer")
            continue
        if not re.fullmatch(r"\d+(\.\d{2})?", str(o.get("price", ""))) or float(o["price"]) <= 0:
            bad.append(f"{sl}: Offer price must be a plain positive number (got {o.get('price')!r})")
        if str(o.get("price")) != price or shown != baht(float(price)):
            bad.append(f"{sl}: price differs between HTML ({shown}) and JSON-LD ({o.get('price')})")
        if o.get("priceCurrency") != "THB" or o.get("priceSpecification", {}).get("valueAddedTaxIncluded") is not True:
            bad.append(f"{sl}: Offer must be THB with valueAddedTaxIncluded true")
        if o.get("availability") != "https://schema.org/" + ("InStock" if stock == "1" else "OutOfStock") or stock not in ("0", "1"):
            bad.append(f"{sl}: availability must be InStock/OutOfStock and match the stock label")
        try:
            if datetime.date.fromisoformat(o.get("priceValidUntil", "")) < today_date:
                bad.append(f"{sl}: priceValidUntil {o.get('priceValidUntil')} is in the past — the daily rebuild did not run")
        except ValueError:
            bad.append(f"{sl}: priceValidUntil is not a date")
        if o.get("url") != ORIGIN + "/shop/" + sl + "/" and not o.get("url", "").endswith("/shop/" + sl + "/"):
            bad.append(f"{sl}: Offer url must be the product page")
    gone_all = n_live == 0
    if gone_all != ('id="pgone" role' in t.replace('id="pgone" hidden', "X")):
        bad.append(f"{sl}: the 'no longer sold' block must show exactly when no variant has a price")
    return bad
