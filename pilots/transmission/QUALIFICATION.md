# Transmission pilot

- **Application**: Transmission, a macOS BitTorrent client
- **Revision**: `main`, last pushed 2026-09-04, to be pinned to a commit at clone
- **Licence**: `NOASSERTION` on the GitHub API, to be read from the repository
  before any fork is cut. Not asserted here.
- **Platform audited**: macOS
- **Third pilot because**: it is the first torrent client, so it is the first
  domain where the content is not a document the app produced itself but a
  transfer the user is in the middle of. It is also a **C++ and Objective-C++
  app target with no Swift at all** (`macosx/main.mm`, `Torrent.h`/`.mm`,
  `Controller.mm`), which is the case the recipe already flags as untested by
  the first two pilots.

## The entry conditions, checked before any code exists

Written before the first line, as the recipe requires. A pilot that cannot meet
one is blocked and named, not forced.

### 1. The application builds from a clean checkout on this machine

**Not met yet, and the blocker is a system dependency, which is the owner's
decision and not the pilot's.**

The project's own build instructions require a recursive clone and, for the
macOS client, GTK 3 through `gtkmm`. Its `CMakeLists.txt` checks
`gtkmm-3.0 >= 3.24.0`, `glibmm-2.4` and `giomm-2.4`, and aborts with
`GTK is required but wasn't found` when they are absent.

Measured on this machine:

| Requirement | State |
|---|---|
| `pkg-config`, `autoconf`, `automake`, `libtool`, `glibtoolize`, `cmake`, `nasm` | present |
| `libevent` 2.1.13, `libcurl` 8.7.1, `openssl` 3.6.4, `glib-2.0` 2.88.3 | present |
| `gtkmm-3.0` | **absent** |
| macOS 14.8.3 or newer, Xcode 15.0.1 or newer | met, the project targets macOS 27 |
| 17 git submodules, so `--recurse-submodules` is required | known before cloning |
| disk | 94 GiB free |

So one Homebrew formula is missing, and it pulls GTK 3 with it. Everything else
the project asks for is already on the machine. The project builds with CMake
first and the IDE second; the order matters and HandBrake already taught that
one of its targets is built by its own scripts rather than by `xcodebuild`.

### 2. The previous pilot is certified

**Met on paper, and it cannot be re-verified on this machine.**

FSNotes is certified: `pilots/fsnotes/QUALIFICATION.md` records
`Certified for the declared claims only: contract, generated, applicationTests,
integrationTests, metadata, indexSync`, 63 checks in three suites, and
`verify --strict` exiting 0.

What cannot be re-checked: the working copies of the two certified pilots are
gone from this machine. `pilots/fsnotes/QUALIFICATION.md` points at
`~/projects/intentlane-fsnotes` and no such directory exists any more; neither
does a HandBrake copy. Only the sandbox container data remains, which proves the
apps were built and run, not what they contained. So the certification is
trusted as a written record and is **not** re-run here. If a later stage needs
the FSNotes code, it has to be cloned again first.

### 3. No known defect from an earlier pilot is unfixed in the code being reused

**One open defect, isolated to another pilot, and it does not touch this one.**

`pilots/netnewswire/contract.yaml` fails schema validation: the key
`confirmation: always` sits on the intent `mark_article_read` at line 72, while
the schema declares `confirmation` as an enum on a different object, so the
parser reports `intents.2 :: Unrecognized key(s) in object: 'confirmation'`. The
file belongs to an in-flight session and is untracked. No other contract uses
the key, so the defect is confined to that draft and does not reach the code
this pilot reuses.

Per the recipe, the same defect on two stacks would be a defect of the method.
It is on one stack only, so it is an application or contract quirk and the
recipe notes why the others are unaffected. It stays open here as a known fact
rather than a blocker, and it is the first thing to re-check if a later pilot
reports the same symptom.

## What is deliberately not written yet

The contract, the generated sources and the three suites belong to tasks 2.2
and later. Task 2.2 says to read the model before writing, and the object this
pilot would expose is not chosen: a torrent, a tracker, a transfer, and a
completed download are four different objects with four different lifecycles,
and choosing one from the outside is exactly the guess the recipe forbids.

## Next action

One decision for the owner: install the missing `gtkmm3` formula. Stage 0 then
clones with `--recurse-submodules`, pins the revision, reads the licence, and
builds with the project's own CMake before anything else is attempted.
