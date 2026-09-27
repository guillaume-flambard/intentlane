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

What **is** re-runnable, and this corrects a claim an earlier pass in this file made:
it said both certified working copies had disappeared from this machine. They had
not, they had moved. `~/projects/experiments/intentlane-fsnotes` is on
`intentlane/pilot-notebook` at `11b11e52`, and `~/projects/experiments/intentlane-handbrake`
is on `intentlane/pilot-preset` at `93955375f`, both still carrying the pilot's
own `IntentLane` sources. A directory move was read as a deletion, which is the
same class of error this campaign exists to remove, committed here instead of
silently. So the certification is **re-runnable** from this machine, and the
`not instrumented` lines below are re-measurable rather than frozen.

What is still not re-runnable is anything that depended on the Homebrew formula
the earlier pass installed, because that installation is no longer the state of
the machine.

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

## Why 2.3 is not done: the build that works cannot compile Swift

Generation itself is done and `generate --check` exits 0. The generated file is
what the contract asks for: an `IntentLaneTorrentEntity` conforming to
`AppEntity` and `IndexedEntity`, a query that reindexes into
`dev.memolabs.intentlane.transmission-pilot.torrent`, and two intents carrying
`system.open` and `system.searchInApp`.

Adding it to the application target is blocked, and the blocker is measured
rather than inferred.

**The project's own build silently ignores the file.** `project(transmission)`
declares no languages beyond C and CXX, so a `.swift` source added to
`target_sources` is not an error: configure exits 0, build exits 0, and no Swift
object is produced. Reproduced in a six-line project outside Transmission:

```
configure exit=0
build     exit=0
find build -name '*.o' | grep -i swift   # nothing
```

That is the failure this campaign's tasks 0.4 and 0.5 exist to prevent. Had the
pilot added the file and read `BUILD SUCCEEDED`, it would have certified a build
that never compiled a line of App Intents, and the claim would have been a lie
with a green command behind it.

**Enabling Swift in that build fails on this machine.** `enable_language(SWIFT)`
is rejected by the Homebrew CMake:

```
CMake Error at CMakeTestSWIFTCompiler.cmake:31 (try_compile):
  Unknown extension ".swift" for file .../main.swift
```

So it is an environment defect, not a Transmission defect, and it holds however
the project is edited.

**The IDE project is stale for Xcode 27, and that is not a fallback.**
`Transmission.xcodeproj` is 375 KB of project file declaring
`MACOSX_DEPLOYMENT_TARGET = 11.0` in three places, and Xcode 27 accepts 12.0 to
27.0. Raising those three to 12.0 removed that error. The build then fails in
the vendored `dht` target at the Libtool step, which receives zero inputs after
an empty `PrelinkedObjectLink`, while its sibling libraries build fine. That
target has no dependency of its own, and forcing `ARCHS=arm64` changes nothing.
Four `xcodebuild` attempts, then the repair stopped.

One of those four was my own error and it is recorded because it would bite the
next pilot too: the CMake build and the Xcode build were both writing into
`build/`, because `xcodebuild` defaults its roots there too, so the two polluted
each other. Separating `SYMROOT` and `OBJROOT` made the second failure legible.

**What this says about the method.** The deviation log predicted this pilot as
"amend: same as HandBrake", because the defect is the one HandBrake had: an
Objective-C target with no Swift. The prediction is wrong, and the recipe's own
rule is what caught it: the same defect on two stacks is a defect of the method.
HandBrake is built by `xcodebuild`, so "add Swift to the target" works there.
Transmission is built by CMake, and there the same instruction produces a green
build and no Swift. The amendment the recipe needs is not "expect a target with
no Swift" but "**check that the project's own build can compile Swift before
planning to add any**".

The two counts in the log are also corrected by measurement: the target is 88
`.mm` and `.m` files, Objective-C++, not 81 plain `.m`.

## The guard this cost, now written down

The deviation log says `amend`, and the recipe says a recipe is amended, so the
amendment is in `recipe.md` stage 0 and the check is
`scripts/can-this-build-compile-swift.sh`. It prints two signals because either
alone lies: whether the **project** ever enabled Swift, and whether the
**toolchain** can compile a Swift source when asked. A project can enable Swift
on a machine whose build tool cannot, and a machine can have a capable toolchain
behind a project that never asked.

Run against this pilot:

```
project:   does-not-declare-SWIFT
toolchain: cannot-enable-Swift (CMAKE_SWIFT_COMPILER not set after EnableLanguage)
verdict:   NO. Replacing the build tool is a decision for the person who owns the machine.
```

Against a project with an Xcode target, the same script asks `swiftc` rather than
`cmake`, because that is the compiler Xcode would use, and answers `YES`. Asking
`cmake` there would have measured the wrong tool and called a capable machine
incapable, which is the same mistake one level up.

The probe builds nothing of Transmission. It is one `.swift` file, one `main.c`
and a `find` for `SwiftProbe.swift.o`, and it costs seconds.

**What is still not verified about the script.** Its `YES` path is exercised
through the Xcode branch on this machine. Its CMake `compiles-Swift` path cannot
be exercised here at all, because the only cmake available cannot enable Swift,
so that branch is written from the documented behaviour of
`enable_language(SWIFT)` and not from a run. It says `ASK` rather than guessing
when a signal does not settle, and a pilot that cannot get a `YES` here should
treat the `NO` as the finding rather than looking for a way around it.

## The decision this leaves open

Stage 2.3 asks for the generated sources to be added to the target, and the
stage's exit criterion is `BUILD SUCCEEDED`. Three routes were weighed.

**Replacing the build tool. Tried, and it is dead.** The obvious idea was that
Homebrew's cmake 4.4.3 simply omits the Swift module, since
`/opt/homebrew/share/cmake/Modules/` has the Swift documentation and not
`CMakeSwiftInformation.cmake`. The official CMake.app of the same version was
installed to test it: it does ship the module, and it still fails, with
`Unknown extension ".swift"` raised from `CMakeTestSWIFTCompiler` while `SWIFT`
is listed among the enabled languages. Passing `CMAKE_SWIFT_COMPILER` explicitly
does not help. 4.4.3 is the latest published release, so this is not a packaging
gap and not a stale install: **no released cmake compiles Swift against Xcode
27's `swiftc`.** The cask was uninstalled and the machine is as it was.

That closes the route and widens the finding. This is not Transmission's
particular problem. It is true of every application whose current build is cmake,
and it will be true for the next one too.

**A separate test target that compiles the generated Swift.** Cheap, certain,
and it is the HandBrake integration pattern. It proves the generated code
compiles and that its seams behave. It does **not** put the code in the real
application, and stage 2.3 says "add the sources to the target", so under this
route the stage is not finished and must not be ticked. Choosing it is how a
pilot ends up green with a claim the build does not support.

**Repairing the Xcode project until it builds** with the generated Swift in the
real target. It is the only route that closes 2.3 as written. It is a repair of a
third party's abandoned project file, it already required raising a deployment
target that changes what the app supports, and the vendored `dht` Libtool
failure is not diagnosed. Even if it landed, it would prove the code compiles in
a build system the project no longer uses.

**Decision: 2.3 is recorded as blocked, with the cause named, and the pilot does
not certify its build claim.** That is what the recipe's stage 0 already says to
do when a prerequisite is missing, and the missing prerequisite here is a
released cmake that does not exist. The alternative is to claim a build that
never compiled a line of App Intents, which is the exact failure tasks 0.4 and
0.5 of this campaign were written to prevent.

What would unblock it, in order of cost: a cmake built with Swift support, a
pilot whose application builds with Xcode, or an upstream fix. The first is a
machine change and therefore the owner's decision, and the second is a choice of
pilot. Neither is mine to take silently, so the state is written down instead.
