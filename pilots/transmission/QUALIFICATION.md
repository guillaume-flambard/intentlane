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

## The object, and why not the others

Read in `macosx/Torrent.h` and `Torrent.mm` before writing, not guessed.

**A torrent.** Exposed by its `name`, subtitled by its `stateString`, and
identified by its infohash. The list is `Controller.mm`'s `fTorrents`, an
in-process `NSMutableArray<Torrent*>`, so the query is `static` and reads the
list the application already keeps.

The infohash is the identifier because the name cannot be. `Torrent.h:124`
declares `renameTorrent:completionHandler:`, so the person can rewrite the name
at any moment, and `FilterBarController.h` declares `setSearchText:`, so the
name is also what the in-app search matches. A field the user writes is not an
identifier, and it can carry a client's project name. The same rule that excluded
a user preset in the HandBrake pilot and an encrypted notebook in the FSNotes
pilot excludes it here, and the infohash is the one field the application derives
and the user cannot.

Three objects were rejected for reasons in the code, not for taste:

- **A tracker.** `allTrackersFlat` is `NSArray<NSString*>` inside a torrent. The
  application has no list of trackers of its own, so a tracker is a field, not a
  row, and it has no lifecycle to remove.
- **A peer.** `peers` is rebuilt on every announce and nothing persists it, so
  there is no name a person could use and no identifier that survives a restart.
- **A completed download.** That is `isComplete` on a torrent, a filter over the
  same list. Two entities for one thing would have to agree on the identifier.

## What the exposure rule is, and why the other one is absent

`item_not_usable`, and `Torrent.mm:400` says why: `isMagnet` is defined as
`!tr_torrentHasMetadata(self.fHandle)`. A magnet that has not fetched its
metadata has no name and no file list, so there is nothing for a phrase to
resolve to. That is the definition of a conditional entity, and the schema
refuses a contract that leaves it out.

`item_missing` is **not** declared, and that is a measured choice rather than an
oversight. Transmission answers the lifecycle question twice over, with
`closeRemoveTorrent:trashFiles:` and with `renameTorrent:`. But the entity's
exposure is a different question from the index's lifecycle: the pilot's own
test is whether the identifier survives a removal, which is task 2.4 and 2.5's
work, and writing both down as one rule would claim a guarantee the application
does not make about its data files.

## The surfaces, and what was left out

Two intents, and both are surfaces the application really has.

`system.open` selects the torrent in the list, which is what the application's
own list control does. It changes what is on screen and nothing on disk.

`system.searchInApp` is here **because Transmission has a real in-app search**,
which is the opposite of HandBrake, where the same surface had to be left out.
`FilterBarController` declares `setSearchText:`, holds the typed terms in
`searchStrings`, and applies them to the torrent list by name or by tracker,
alongside status and group filters. On HandBrake the surface would have been a
guess; here it is a fact read out of the class.

Four things are deliberately absent, each for a reason found in the code:

- **Adding a torrent.** The input is a URL or a file supplied from outside, so
  a list that cannot resolve anything from a cold start is not a searchable thing.
- **Removing a torrent.** `closeRemoveTorrent:` takes a `trashFiles:` flag, so
  the action can destroy the downloaded data. This pilot claims navigation, not
  destruction.
- **Pausing and resuming.** `startTransfer` and `stopTransfer` are real, but
  they mutate a running transfer. A claim about opening content does not need
  it, and adding it would widen the risk surface without adding one piece of
  proof.
- **Renaming.** A write, and it would invalidate the field the search matches on.

## Two rules the validator taught rather than the document

`validate` exited non-zero twice before it exited zero, and both errors were
rules this contract had broken by being reasonable:

- `IL1301`: a targetless native intent must name the handler, so
  `search_torrents` needs `SearchTorrentsHandler`. `open_torrent` needs none,
  because it carries a target and the resolution is the system's.
- `IL1401`: a `system.searchInApp` intent must **not** name a target entity. The
  first draft pointed `search_torrents` at `torrent`, which reads as more
  specific than a search is.

## Next action

Task 2.3: generate, add the sources to the app target, and build. The target is
Objective-C++ with no Swift, so the generated files are added to a target that
contains no other Swift, and that is the first time this method meets a target
whose every existing file is `.mm`.
