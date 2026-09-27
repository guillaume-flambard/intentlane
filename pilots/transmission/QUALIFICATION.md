# Transmission pilot

- **Application**: Transmission, a macOS BitTorrent client
- **Revision**: `48835c6`, shallow clone with `--recurse-submodules`, all 17
  submodules initialised, origin set to the real upstream
- **Licence**: GPLv2 **or** GPLv3, at the user's option, with an explicit
  exception allowing linking to and using OpenSSL. Read from `COPYING`, not
  from the GitHub API, which reports `NOASSERTION`. Some source files carry
  more permissive terms of their own.
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

**Met, and measured rather than hoped.**

The project's own build instructions require a recursive clone and, for the
macOS client, GTK 3 through `gtkmm`. Its `CMakeLists.txt` checks
`gtkmm-3.0 >= 3.24.0`, `glibmm-2.4` and `giomm-2.4`, and aborts with
`GTK is required but wasn't found` when they are absent.

| Requirement | State |
|---|---|
| `gtkmm3` 3.24.11, pulling `gtk+3` 3.24.52 | installed, it was the one missing formula |
| `pkg-config`, `autoconf`, `automake`, `libtool`, `glibtoolize`, `cmake`, `ninja`, `nasm` | already present |
| `libevent`, `libcurl` 8.7.1, `openssl` 3.6.4, `glib-2.0` | already present |
| macOS 14.8.3 or newer, Xcode 15.0.1 or newer | met, the project targets macOS 27 |
| 17 git submodules, `--recurse-submodules` | done, `0` uninitialised |
| disk | 94 GiB free before, 214 MiB of checkout after |

The build ran in the order the recipe insists on, the project's own CMake
first:

```
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo   # exit 0, 34.5 s
cmake --build build -t transmission-mac                     # 502/502, 0 error
```

The result is a real application, not a library: `Transmission.app` at 9.1 MiB,
its executable a Mach-O 64-bit arm64, adhoc-signed under the identifier
`org.m0k.transmission`, `CFBundleShortVersionString` 4.2.0-dev, and it launched
with a window before being quit again. The link step emits three
`building for macOS-11.0 but linking with dylib ... built for newer version 26.0`
warnings, because the bundle's minimum is 11.0 while Homebrew's `gettext` and
`libevent` are built for 26.0. They are warnings on a development build, and
they are recorded here because the next pilot on a Homebrew toolchain will see
them again.

One side effect to know about: installing `gtkmm3` upgraded `glib` from 2.88.3
to 2.90.0 on this machine. Any build that linked the old keg still resolves, but
the version it will pick up is no longer the one it did before.

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

Stage 0 is done: the checkout builds and the application runs. Task 2.2 reads
the model before writing, which for this pilot means choosing the object, and
the choice is open between a torrent, a tracker, a transfer and a completed
download. Nothing is written before that read.

One thing to carry into the contract: the licence is copyleft, and the generated
App Intents code goes *into* the application target. HandBrake is GPLv2 and set
the precedent, so this is not a new question here, but it is recorded rather
than assumed.
