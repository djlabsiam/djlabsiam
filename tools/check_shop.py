#!/usr/bin/env python3
"""Guards for the daily shop refresh (.github/workflows/shop-daily.yml): checks every /shop/<slug>/ product page against its snapshot rules
(price in the HTML = price in the JSON-LD Offer, InStock/OutOfStock, priceValidUntil not in the past, no price <= 0, 'no longer sold' rendering).
It needs only the repo (no courses.json, no design files), so it runs on a bare runner.  The full site checks stay in tools/check_pages.py.
Exit code 1 = a page is not publishable.   Usage: python tools/check_shop.py [--shop /shop/]
"""
import argparse, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import shop_snapshot as SS

ap = argparse.ArgumentParser()
ap.add_argument("--shop", default="/shop/")
ap.add_argument("--today", default=None)
A = ap.parse_args()
prods = json.load(io.open(os.path.join(SITE, "data", "shop-products.json"), encoding="utf-8"))["products"]
bad, n = [], 0
for sl, p in prods.items():
    f = os.path.join(SITE, A.shop.strip("/").replace("/", os.sep), sl, "index.html")
    if not os.path.exists(f):
        bad.append(f"{sl}: page missing ({f})")
        continue
    t = io.open(f, encoding="utf-8").read()
    n += 1
    bad += SS.check_page(t, sl, p, SS.today(A.today))
    if t.count(SS.SNAP_A) != 1 or t.count(SS.SNAP_B) != 1:
        bad.append(f"{sl}: snapshot markers missing")
    if b"\r\n" in t.encode("utf-8"):
        bad.append(f"{sl}: CRLF in a generated page")
for m in bad:
    print("  FAIL " + m)
print(f"check_shop: {n} product pages checked, {len(bad)} problems")
sys.exit(1 if bad else 0)
