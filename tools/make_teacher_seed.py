#!/usr/bin/env python3
"""Writes the one-off seed for teacher_profiles (migration 068) from the text already on the website, so teachers start editing from what is live.

  python tools/make_teacher_seed.py [--out PATH]      default: ../console-workspace/seed-teacher-profiles.sql

Source: data/teacher-profiles.json (bio, highlights, video_id) + bots/bot/shared/courses.json (the one social link per teacher). Nothing is typed here.
Rules (fixed by the owner/manager): run from the Supabase SQL Editor (postgres role skips the row trigger) · never sets publish_ack_at ·
each field is written only while it is still empty (re-runnable, never overwrites a teacher's edit) · a value that would fail the CHECKs of 068 is
SKIPPED and listed (the teacher's text is never rewritten) · portfolio stays empty (the site keeps its own static images).
The Python checks below mirror tp_text_ok / tp_highlights_ok / tp_socials_ok / video_id of 068; console-workspace/sql-tests/test068-seed.mjs
runs the generated file against the real CHECKs.
"""
import argparse, io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ap = argparse.ArgumentParser()
ap.add_argument("--out", default=os.path.join(os.path.dirname(SITE), "console-workspace", "seed-teacher-profiles.sql"))
A = ap.parse_args()


def load(p):
    with io.open(p, encoding="utf-8") as f:
        return json.load(f)


PROFILES = load(os.path.join(SITE, "data", "teacher-profiles.json"))
COURSES = load(os.path.join(os.path.dirname(SITE), "bots", "bot", "shared", "courses.json"))
SOCIAL = {t["name"]: t.get("social") for t in COURSES["instructors"]["items"]}

INVISIBLE = re.compile("[​-‏‪-‮⁠-⁩﻿]")
CTRL_NL = re.compile("[\u0001-\u0009\u000b-\u001f\u007f]")
CTRL = re.compile("[\u0001-\u001f\u007f]")
LINK = re.compile(r"(://|www\.)", re.I)
SOC_RE = {
    "instagram": re.compile(r"^https://(www\.)?instagram\.com/[A-Za-z0-9._]{1,30}/?$"),
    "facebook": re.compile(r"^https://(www\.)?facebook\.com/[A-Za-z0-9.-]{5,50}/?$"),
    "tiktok": re.compile(r"^https://(www\.)?tiktok\.com/@[A-Za-z0-9._]{2,24}/?$"),
    "youtube": re.compile(r"^https://(www\.)?youtube\.com/(@[A-Za-z0-9._-]{3,30}|channel/[A-Za-z0-9_-]{20,30}|c/[A-Za-z0-9._-]{1,40})/?$"),
}


def why_bad_text(t, mx, nl, mn):
    if len(t) > mx:
        return f"ยาว {len(t)} ตัวอักษร (เกิน {mx})"
    if len(t.strip()) < mn:
        return "ว่าง"
    if re.search("[<>]", t):
        return "มี < หรือ >"
    if INVISIBLE.search(t):
        return "มีตัวล่องหน/ทิศทาง"
    if (CTRL_NL if nl else CTRL).search(t):
        return "มีตัวควบคุม"
    if LINK.search(t):
        return "มีลิงก์ (:// หรือ www.)"
    return None


def host_of(u):
    for k, rx in SOC_RE.items():
        if rx.match(u):
            return k
    return None


def lit(t):
    return "'" + t.replace("'", "''") + "'"


sql, skipped, seeded = [], [], []
for name in [k for k in PROFILES if not k.startswith("_")]:
    p, slug = PROFILES[name], name.lower()
    w = []
    bio = p.get("bio") or ""
    if bio:
        r = why_bad_text(bio, 1200, True, 0)
        if r:
            skipped.append((name, "bio", r))
        else:
            w.append(f"update teacher_profiles set bio = {lit(bio)} where slug = {lit(slug)} and bio = '';")
            seeded.append((name, "bio", f"{len(bio)} ตัวอักษร"))
    hl = p.get("highlights") or []
    if hl:
        r = ("เกิน 6 ข้อ" if len(hl) > 6 else next((f"ข้อ {i + 1}: {x}" for i, h in enumerate(hl) for x in [why_bad_text(h, 80, False, 1)] if x), None))
        if r:
            skipped.append((name, "highlights", r))
        else:
            w.append(f"update teacher_profiles set highlights = {lit(json.dumps(hl, ensure_ascii=False))}::jsonb where slug = {lit(slug)} and highlights = '[]'::jsonb;")
            seeded.append((name, "highlights", f"{len(hl)} ข้อ"))
    vid = p.get("video_id")
    if vid:
        if re.fullmatch(r"[A-Za-z0-9_-]{11}", vid):
            w.append(f"update teacher_profiles set video_id = {lit(vid)} where slug = {lit(slug)} and video_id is null;")
            seeded.append((name, "video_id", vid))
        else:
            skipped.append((name, "video_id", "ไม่ใช่รหัส 11 ตัว"))
    soc = SOCIAL.get(name)
    if soc:
        k = host_of(soc)
        if k:
            w.append(f"update teacher_profiles set socials = {lit(json.dumps({k: soc}))}::jsonb where slug = {lit(slug)} and socials = '{{}}'::jsonb;")
            seeded.append((name, "socials", f"{k}: {soc}"))
        else:
            skipped.append((name, "socials", f"{soc} ไม่ใช่โฮสต์/รูปแบบที่ฐานรับ (instagram/facebook/tiktok/youtube)"))
    if w:
        sql.append(f"-- {name}\n" + "\n".join(w))

head = """-- ---------------------------------------------------------------------------
-- seed โปรไฟล์ครู (หลัง migration 068) — นำข้อความเดิมบนเว็บใส่ฐานเป็นจุดตั้งต้นให้ครูแก้ต่อ · รันจาก Supabase SQL Editor เท่านั้น (role postgres ข้าม trigger ของแถว)
-- สร้างโดย website/tools/make_teacher_seed.py จาก data/teacher-profiles.json + courses.json · ห้ามแก้มือ (สร้างใหม่แทน)
--   · ไม่ตั้ง publish_ack_at — ครูต้องติ๊กยืนยันเผยแพร่เองตอนแก้ครั้งแรก
--   · เขียนเฉพาะฟิลด์ที่ยังว่าง (bio = '' / highlights = [] / socials = {} / video_id is null) — รันซ้ำได้ ไม่ทับสิ่งที่ครูแก้ไว้
--   · portfolio ปล่อยว่าง — เว็บใช้รูป static เดิมต่อไป
--   · ค่าที่ไม่ผ่านกฎของ 068 ถูกข้าม (ไม่แก้ข้อความครู) — ดูรายการท้ายไฟล์
-- ---------------------------------------------------------------------------

"""
foot = "\n\n-- ข้ามเพราะไม่ผ่านกฎของ 068 (ฟิลด์ที่ข้ามยังใช้ฉบับ static บนเว็บเหมือนเดิม):\n" + (
    "\n".join(f"--   {n} · {f} · {r}" for n, f, r in skipped) if skipped else "--   (ไม่มี)") + "\n"
os.makedirs(os.path.dirname(A.out), exist_ok=True)
with io.open(A.out, "w", encoding="utf-8", newline="\n") as f:
    f.write(head + "\n\n".join(sql) + foot)
print(f"wrote {A.out}")
print("seeded:")
for x in seeded:
    print("  ", *x)
print("skipped:")
for x in skipped:
    print("  ", *x)
