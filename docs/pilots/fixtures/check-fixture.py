#!/usr/bin/env python3
"""Check the canonical NetNewsWire pilot fixture.

Proves the fixture the acceptance protocol depends on, without touching the app:
XML validity, the three canonical article identities, their URLs, and, with
--url, that a running fixture server serves exactly this file.

Usage:
  python3 check-fixture.py
  python3 check-fixture.py --url http://127.0.0.1:8765/pilot-feed.xml
"""
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIXTURE = HERE / "pilot-feed.xml"

EXPECTED = {
    "intentlane-alpha": ("Alpha article about feed readers", "https://example.invalid/intentlane-pilot/alpha"),
    "intentlane-beta": ("Beta article about RSS", "https://example.invalid/intentlane-pilot/beta"),
    "intentlane-gamma": ("Gamma article about feeds", "https://example.invalid/intentlane-pilot/gamma"),
}


def parse(raw: bytes):
    root = ET.fromstring(raw)
    channel = root.find("channel")
    items = {}
    for item in channel.findall("item"):
        guid = item.findtext("guid")
        items[guid] = {
            "title": item.findtext("title"),
            "link": item.findtext("link"),
            "pubDate": item.findtext("pubDate"),
            "description": item.findtext("description"),
        }
    return channel.findtext("link"), items


def main() -> None:
    failures = []
    raw = FIXTURE.read_bytes()
    try:
        channel_link, items = parse(raw)
    except ET.ParseError as error:
        raise SystemExit(f"FAIL fixture is not valid XML: {error}")

    if channel_link != "https://example.invalid/intentlane-pilot":
        failures.append(f"channel link {channel_link!r} is not the canonical one")
    if set(items) != set(EXPECTED):
        failures.append(f"guids {sorted(items)} != {sorted(EXPECTED)}")
    for guid, (title, link) in EXPECTED.items():
        entry = items.get(guid)
        if entry is None:
            continue
        if entry["title"] != title:
            failures.append(f"{guid}: title {entry['title']!r} != {title!r}")
        if entry["link"] != link:
            failures.append(f"{guid}: link {entry['link']!r} != {link!r}")
        if not entry["pubDate"]:
            failures.append(f"{guid}: missing pubDate, ordering is not deterministic")

    if "--url" in sys.argv:
        url = sys.argv[sys.argv.index("--url") + 1]
        try:
            served = urllib.request.urlopen(url, timeout=5).read()
        except Exception as error:
            failures.append(f"fixture server unreachable at {url}: {error}")
        else:
            if served != raw:
                failures.append(f"served fixture differs from {FIXTURE}")

    print(f"fixture: {len(items)} item(s): {sorted(items)}")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}")
        raise SystemExit(1)
    print("fixture OK: 3 canonical articles, deterministic order")


if __name__ == "__main__":
    main()
