#!/usr/bin/env python3
"""Wire the IntentLane intents into a pinned NetNewsWire checkout.

Deterministic and idempotent. Every edit is anchored on an exact string, and the
script fails without writing anything if an anchor is missing or ambiguous. Run
twice: the second run reports "already applied" and changes nothing.

It never rewrites historical pilot evidence. It only gives the generated intents
a launch registration and two entry points the adapter calls:

  - AppDelegate.openIntentLaneArticle(_:)  -> the existing article deep link
  - AppDelegate.intentLaneSearch(for:)     -> MainWindowController.intentLaneSearch(for:)
"""
import sys
from pathlib import Path

REGISTER_ANCHOR = (
    "\tfunc applicationDidFinishLaunching(_ note: Notification) {\n\n"
    "\t\tWebViewConfiguration.resolveBrowserUserAgent()"
)
REGISTER_PATCHED = (
    "\tfunc applicationDidFinishLaunching(_ note: Notification) {\n\n"
    "\t\tif #available(macOS 27.0, *) {\n"
    "\t\t\tIntentLanePilotIntegration.register()\n"
    "\t\t}\n\n"
    "\t\tWebViewConfiguration.resolveBrowserUserAgent()"
)

METHODS_ANCHOR = "\tfunc applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {"
METHODS_PATCHED = (
    "\t@available(macOS 27.0, *)\n"
    "\tfunc openIntentLaneArticle(_ articlePath: [AnyHashable: Any]) {\n"
    '\t\tlet activity = NSUserActivity(activityType: "com.ranchero.NetNewsWire-IntentLane")\n'
    "\t\tactivity.userInfo = [UserInfoKey.articlePath: articlePath]\n"
    "\t\t_ = application(NSApplication.shared, continue: activity) { _ in }\n"
    "\t}\n\n"
    "\t@available(macOS 27.0, *)\n"
    "\tfunc intentLaneSearch(for term: String) {\n"
    "\t\tmainWindowController?.intentLaneSearch(for: term)\n"
    "\t}\n\n"
    + METHODS_ANCHOR
)

SEARCH_ANCHOR = "\tfunc forceSearchToEnd() {"
SEARCH_PATCHED = (
    "\t@available(macOS 27.0, *)\n"
    "\tfunc intentLaneSearch(for term: String) {\n"
    "\t\tguard !term.isEmpty else { return }\n"
    "\t\ttimelineSourceMode = .search\n"
    "\t\tlastSentSearchString = nil\n"
    "\t\tsearchString = term\n"
    "\t\tcurrentSearchField?.stringValue = term\n"
    "\t\tupdateSmartFeed()\n"
    "\t\tupdateWindowTitle()\n"
    "\t}\n\n"
    + SEARCH_ANCHOR
)


def apply(path: Path, anchor: str, patched: str, label: str) -> bool:
    text = path.read_text()
    if patched in text:
        print(f"already applied: {label}")
        return False
    if anchor not in text:
        raise SystemExit(f"FAIL anchor missing ({label}): {path}")
    if text.count(anchor) != 1:
        raise SystemExit(f"FAIL anchor ambiguous ({label}): {path}")
    path.write_text(text.replace(anchor, patched, 1))
    print(f"applied: {label}")
    return True


def main() -> None:
    root = Path(sys.argv[1]).resolve()
    ad = root / "Mac" / "AppDelegate.swift"
    mwc = root / "Mac" / "MainWindow" / "MainWindowController.swift"
    for p in (ad, mwc):
        if not p.is_file():
            raise SystemExit(f"FAIL not a NetNewsWire checkout: missing {p}")
    changed = False
    changed |= apply(ad, REGISTER_ANCHOR, REGISTER_PATCHED, "registration")
    changed |= apply(ad, METHODS_ANCHOR, METHODS_PATCHED, "appdelegate-methods")
    changed |= apply(mwc, SEARCH_ANCHOR, SEARCH_PATCHED, "mainwindow-search")
    print("changed" if changed else "no changes")


if __name__ == "__main__":
    main()
