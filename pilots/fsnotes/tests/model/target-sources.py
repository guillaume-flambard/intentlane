#!/usr/bin/env python3
"""Print the Swift files that the FSNotes target actually compiles.

The app directory contains files that are deliberately not in the target, so
`find` over-reports. Xcode is the authority, so read its project file rather than
guessing. This is how the deletion harness gets the app's real code rather than
a file list that happens to look right.

`--strip-entry-point PATH` writes a copy of the named file with its
`@NSApplicationMain` or `@main` attribute removed, and prints that path instead.
The delegate's own behaviour stays; only the process entry point moves to the
harness, because a test binary supplies its own. The copy goes to `--out-dir` so
the fork's source tree is never written to.
"""
import re
import sys
from pathlib import Path

PROJECT = Path(sys.argv[1] if len(sys.argv) > 1 else "FSNotes.xcodeproj/project.pbxproj").resolve()
ROOT = PROJECT.parent.parent

args = sys.argv[2:]
EXCLUDE = set(args)
STRIP = None
OUT_DIR = None
while "--strip-entry-point" in args or "--out-dir" in args:
    if "--strip-entry-point" in args:
        at = args.index("--strip-entry-point")
        STRIP = args[at + 1]
        args = args[:at] + args[at + 2:]
        EXCLUDE = {value for value in EXCLUDE if value != STRIP}
    if "--out-dir" in args:
        at = args.index("--out-dir")
        OUT_DIR = Path(args[at + 1]).resolve()
        args = args[:at] + args[at + 2:]

text = PROJECT.read_text()

refs = dict(
    re.findall(
        r'([0-9A-F]{24}) /\* ([^*]+?) \*/ = \{isa = PBXFileReference',
        text,
    )
)

bodies = re.split(r'isa = PBXNativeTarget;', text)
target = next(
    (body for body in bodies if re.search(r'^\s*name = FSNotes;', body, re.M)),
    None,
)
if target is None:
    print("no target named FSNotes in the project", file=sys.stderr)
    raise SystemExit(1)

phases = re.findall(r'([0-9A-F]{24}) /\* Sources \*/', target)
if not phases:
    print("the FSNotes target has no Sources phase", file=sys.stderr)
    raise SystemExit(1)

owned = ""
for phase in phases:
    block = re.search(
        rf'{phase} /\* Sources \*/ = \{{.*?files = \((.*?)\);', text, re.S
    )
    if block is None:
        print(f"could not read the file list of Sources phase {phase}", file=sys.stderr)
        raise SystemExit(1)
    owned += block.group(1)
if not owned.strip():
    print("the FSNotes Sources phase is empty", file=sys.stderr)
    raise SystemExit(1)

build_refs = dict(
    re.findall(
        r'([0-9A-F]{24}) /\* [^*]+ \*/ = \{isa = PBXBuildFile; fileRef = ([0-9A-F]{24})',
        text,
    )
)

names = sorted(
    {
        refs[build_refs[build]]
        for build in re.findall(r'([0-9A-F]{24}) /\* [^*]+ in Sources \*/', owned)
        if build in build_refs
        and refs.get(build_refs[build], "").endswith(".swift")
        and refs[build_refs[build]] not in EXCLUDE
    }
)

index = {}
for path in ROOT.rglob("*.swift"):
    if ".git" in path.parts or any(" iOS" in part for part in path.parts):
        continue
    index.setdefault(path.name, []).append(path)

resolved, ambiguous, missing = [], [], []
for name in names:
    matches = index.get(name, [])
    if len(matches) == 1:
        resolved.append(str(matches[0]))
    elif not matches:
        missing.append(name)
    else:
        ambiguous.append((name, [str(match) for match in matches]))

for name in missing:
    print(f"missing: {name}", file=sys.stderr)
for name, matches in ambiguous:
    print(f"ambiguous: {name} -> {', '.join(matches)}", file=sys.stderr)
if missing or ambiguous:
    raise SystemExit(1)

if STRIP is not None:
    source = next((Path(path) for path in resolved if Path(path).name == STRIP), None)
    if source is None:
        print(f"{STRIP} is not in the FSNotes target", file=sys.stderr)
        raise SystemExit(1)
    text = source.read_text()
    stripped, count = re.subn(r"^@(NSApplicationMain|main)\n", "", text, count=1, flags=re.M)
    if count != 1:
        print(f"no entry-point attribute found in {source}", file=sys.stderr)
        raise SystemExit(1)
    if OUT_DIR is None:
        print("--strip-entry-point also needs --out-dir", file=sys.stderr)
        raise SystemExit(1)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    destination = OUT_DIR / f"{source.stem}.no-entry-point{Path(source).suffix}"
    destination.write_text(stripped)
    resolved = [str(destination) if path == str(source) else path for path in resolved]

print(" ".join(resolved))
