# Pilot recipe, version 2

Version 1 is `recipe.md` and is left in place, unchanged, because the point of
keeping it is to be able to say what changed and which pilot proved it.

**Six of the fourteen stages changed.** The other eight never needed to. That
split is the measurement of the method and it is not even: a stage a command
settles did not need amending, and a stage where a pilot had to adapt an
application or make a judgement did.

| Stage | Needed an amendment? | Proved by |
| --- | --- | --- |
| Q, qualification | no | no row in 29 |
| 0, build from a clean checkout | **yes, 5 amendments** | HandBrake, Transmission, LuLu, Cyberduck twice |
| 1, audit | no | one row, `keep` |
| 2, contract and claim set | **yes, 2 amendments** | FSNotes, LuLu |
| 3, generation | no | no row in 29 |
| 4, mapping | **yes, 2 amendments** | FSNotes twice |
| 4.1, mapping a non-Swift target | **yes, 4 amendments** | HandBrake, LuLu, Transmission, Cyberduck |
| 5, tests | no | one row, `keep` |
| 6, build | no | one row, `keep` |
| 7, metadata | **yes, 1 amendment** | FSNotes |
| 8, certification | **yes, 2 amendments** | FSNotes, LuLu |
| W, wiring mutation events | no | three rows, no amendment |
| P, the launch probe | no | no row in 29 |
| R, carrying a runtime refusal | no | no row in 29 |

---

## Stage 0, building the application

### v1 said

> Build the app from a clean checkout. Exit criterion: the build command exits
> zero.

### v2 says

**0.1 Ask the build tool what it resolves, not the platform helper.** A JDK, a
runtime or a toolchain is *reported* missing by a helper that may simply be
unregistered. On the Cyberduck machine `/usr/libexec/java_home` reported no
runtime while two JDKs were installed, because Homebrew's are keg-only and
neither is in `/Library/Java/JavaVirtualMachines`. A reported absence is a thing
to measure before it is a block. *Proved by Cyberduck.*

**0.2 Record whether the IDE project still builds at all, and build with the
project's current build system.** "Open the Xcode project" is not a fallback on a
toolchain that has moved on. Transmission's checked-in `Transmission.xcodeproj`
does not build on Xcode 27, and the application's own CMake build does, so
"the repository builds" and "the project file builds" are two different claims
and a pilot must say which one it made. *Proved by Transmission.*

**0.3 Ask this question before promising any generated Swift: can this project's
own build system compile Swift, at all?** This is the amendment that is the
finding. The HandBrake remedy was assumed to be general, and it is not:
Transmission's build is CMake, and **no released CMake compiles Swift against
Xcode 27's `swiftc`**, proven from a CMake built from source rather than from two
packagings. Homebrew's 4.4.3 omits `CMakeSwiftInformation.cmake`; the official
CMake.app ships it and still raises `Unknown extension ".swift"` from
`CMakeTestSWIFTCompiler`; `CMAKE_SWIFT_COMPILER` set explicitly changes nothing.
A CMake-built application is blocked, and the block belongs in the audit, at a
price that does not presume the work can be finished. *Proved by Transmission.*

**0.4 A prebuilt dependency the pilot can produce is a build step, not a block.**
`LuLu/Binaries/Netiquette.app` is the last line of `.gitignore` with no
submodule and no directory in the checkout. Read once that looks like a blocker.
It is not: a pilot adapts the application, and the release process performs that
step by hand, so the pilot performs it too. The pilot built Netiquette, raised
its deployment target from 10.10 and then 10.15, and placed the app where the app
target reads it. **Only an identity or a system package is the owner's to
decide.** *Proved by LuLu, and it corrected an error of mine: I first wrote this
as blocked, borrowing the reasoning from a Homebrew formula where the question
is only whether to install a package.*

**0.5 Expect a deployment target below the current range, and expect to find it
one build at a time.** Xcode 27 accepts 12.0 to 27.0 and **reports one offending
value per build**, so a project with two different stale targets costs two builds
to find both. Four applications in a row carried one: at 11.0, at 10.15 in six
places, at 10.10 then 10.15, and at 10.13. Look for the value in the **build
system's** properties, not only in the project file, because the last of those
four lives in an Ant property passed to `xcodebuild` on the command line and
therefore cannot be fixed with a project-file edit. *Proved by HandBrake, LuLu
and Cyberduck.*

**0.6 When a recipe names a skip flag, name the kind of flag it is.**
`-DskipSign` does not skip signing. The pom's `run-ant-sign-target` execution is
unconditional and `osx/build.xml:109` guards the codesign call with the
environment variable `SKIP_SIGN`. *Proved by Cyberduck, at the cost of one
failed build that looked like a signing problem.*

---

## Stage 2, contract and claim set

### v1 said

> Declare the app with its real deployment floor, and walk the candidate journeys
> marking each feasible, blocked or out of scope.

### v2 says

**2.1 Classify the sensitivity before writing the contract, and name the field the
classification exists for.** The classification is not a formality and the pilot
that skips it writes a contract that exports something it should not. LuLu's
application names a rule canonically by `key`, which `generateKey` fills with a
code-signing identity and otherwise with `self.path`, so the identifier had to
be `uuid`. Cyberduck's save file holds a hostname, a login name, a private key
path, a certificate and four local paths, so its entity has a title and **no
subtitle**. **Before quoting an integration for a file transfer client, count
what its save file contains.** *Proved by LuLu and Cyberduck.*

**2.2 Never copy a negative result. Read the code.** LuLu's first contract
declared `item_missing` as not applicable with the reason that *"nothing was
observed removing a rule from the store"*, and that sentence was the Transmission
row, two pilots earlier. Reading `LuLu/Extension/Rules.m` then showed the
extension removing a rule whose path is gone at `:1692`, a temporary rule whose
process exited at `:1706`, and an expired rule at `:1720`, and then calling
`[self delete:rule.key rule:rule.uuid]` at `:1748`. **An assertion with no
observation behind it is also an assertion with no reading behind it when the
observation is inherited.** *Proved by LuLu, at the cost of a contract
amendment and a rewritten classification.*

**2.3 A claim set may lose a surface for a reason about the application, never
for a reason about the stack.** HandBrake's `system.searchInApp` was removed
because its presets view has no search field. Cyberduck's was not declared
because its bookmark list is JavaFX and the filter is not reachable from the
native shell. Both are the same rule and both are `keep`. *Proved by HandBrake,
then by Cyberduck.*

**2.4 The exposure rule set has a gap, and a pilot is what finds it.** A bookmark
file that is there and is not a readable property list is neither unusable nor
missing, and none of `source_disabled`, `item_not_usable` or `item_missing`
describes it. The rule set needs an `unreadable` condition, or a fourth
applicability coverage profile, before the next application with a corruptible
store meets it. *Proved by Cyberduck.*

**2.5 When the application offers two ways to do the thing, take the one that does
not need the field the classification refuses.** Cyberduck opens a connection
either from an incoming `sftp://` URL, which `HostParser.parse` turns into a
`Host` and which therefore needs the **hostname**, or from the connection's own
`.duck` file handed to LaunchServices, which `application_openFile` mounts and
which therefore needs a **file path used at the seam and never exported**. The
second is the contract. This is the sharpest result of the campaign, and it is
the third instance of one shape: LuLu identifies by `key` and uses `uuid`, IINA's
is `mpvMd5`, and here the path acts without ever crossing into the entity. **The
identifier and what the system shows cannot be the field the application uses to
find the object internally.** *Proved by Cyberduck.*

---

## Stage 4 and 4.1, mapping

### v1 said

> Map the client object in Swift. Expose one read function and one open function
> through the bridging header. Never convert the existing Objective-C.

### v2 says

**4.1 is mandatory for any target that is not already Swift.** Four of the five
qualified candidates, and it is now known to be untested for a pilot whose build
cannot work at all, which is why stage 0.3 asks the question first. *Proved by
HandBrake and LuLu.*

**4.1.1 Expect promoted accessors, a bridging header, missing Swift build
settings and the `-Swift.h` import.** An Objective-C app keeps its controllers,
managers and views in class extensions Swift cannot see. A target that had no
Swift declares no `SWIFT_VERSION` and Xcode rejects an empty one the moment a
Swift file joins it. *Proved by HandBrake, and the script that removes it is
`scripts/add-intentlane-sources.rb`, which is idempotent and now also sets
`SWIFT_OBJC_BRIDGING_HEADER`.*

**4.1.2 A bridging header is not always a bridging header.** Cyberduck's is empty.
The seam reads the application's own files with Foundation and opens a document
through `NSWorkspace`, so it needs no project header at all, and the pilot's only
build error there was a missing `import OSLog`, which `import Foundation` does not
re-export. **Expect to import the logging module explicitly.** *Proved by
Cyberduck, at the cost of one failed build.*

**4.1.3 When the model is not natively readable, the recipe applies anyway and
needs a store reader.** The pilot that was flagged `escalate: the recipe may not
apply to a Java application` certified unchanged. What it needed is a seam that
reads the application's persisted model from a file, because the model is in the
JVM and the native side has no handle to it: the native launcher calls
`JLI_Launch` with `0, NULL, 0, NULL` for its three out-parameters, so the process
never gets a `JavaVM*` back, and the only JNI in the tree is Java calling
native. **The question to ask a client is not what language their application is
in, but whether a file or a native call already answers the question they want
Siri to ask.** A model that is not natively readable is still a block, and it is
a different piece of work with its own price. *Proved by Cyberduck.*

**4.2 If the application exposes no incremental event, say the system reindexes
on demand and do not imply mutation hooks exist.** *Proved by FSNotes.*

**4.3 Record a branch that no test covers as unverified by a test.** FSNotes' row
expansion is verified by review and by the launch probe, not by a test, because
the application has no macOS test target. *Proved by FSNotes.*

---

## Stage 7, metadata

### v1 said

> Run the metadata processor. Exit criterion: the extracted metadata contains
> every action and schema the contract advertises, and nothing extra.

### v2 says, unchanged except for what FSNotes found

The **protocol list is an input and not an output**. `-const-gather-protocols-list`
expects a file that already exists, and without both flags the compiler writes no
`.swiftconstvalues` and the processor refuses to run. The list is not derivable
from the contract, so it is a **tracked pilot asset**, not a scratch file. The
**processor is not on `PATH`**: it lives at
`$(xcode-select -p)/Toolchains/XcodeDefault.xctoolchain/usr/bin/appintentsmetadataprocessor`.
The **source list contains bare file names**, not paths, or the processor fails
with "Unable to find matching source file". And the **module name is yours to
choose and it goes into the bundle**: Cyberduck's metadata is `Cyberduck`, and a
different name produces a plausible-looking bundle with the wrong name in it.
*Proved by FSNotes, then by Cyberduck for the module name.*

---

## Stage 8, certification

### v1 said

> `intentlane verify --pilot <pilot.yaml> --app-test ... --integration-test ...
> --metadata ... --index-test ... --probe ... --strict` certifies the declared set.
> The option that hands the metadata to `verify` is `--metadata`.

### v2 says

**8.1 The option is `--metadata`, not `--build-metadata`.** v1 named an option that
does not exist. *Proved by FSNotes.*

**8.2 A pilot is not done when a gate is written down. Every gate named in a
manifest has to have been run at least once.** `verify` failed `generated` on
LuLu's first certification run and the cause was that the two copies of the
generated file had drifted, the one in `pilots/lulu/out/` and the one inside the
clone, while `generate --check` had never been run against that directory. **A
gate written into `pilot.yaml` and never executed is a gate that has not been
tested**, and it is the same defect as a suite that fails on a path before running
a check. *Proved by LuLu, and it is the second time in one campaign that a check
assumed to have run had not.*

**8.3 A relocation is not a deletion, and a directory move read as one is a
finding.** Every pilot suite in the repository failed on a file path after the
working copies were moved, and one pilot record concluded the copies were gone.
They were at `~/projects/experiments/`. The correction was written into the
record rather than made quietly, because a journal that silently drops a wrong
conclusion is a journal that cannot be audited. *Proved by the whole campaign.*

**8.4 A rule introduced by this campaign must be applied to this campaign's own
fixtures.** The exposure rule made four shipped example contracts invalid, and
`verify.mjs` failed on `IL1301` before its first check, because the rule was only
being enforced in the one config `pnpm validate` reads. *Proved by this
repository, against itself.*

---

## The two things version 2 still does not do

**It cannot produce a Siri observation.** No public API sends a phrase to Siri and
Core Spotlight offers no read-back of a named index. Six certified pilots, zero
observed claims. The recipe says so at stage P and the launch probe says it in its
own output, and a stage that cannot be automated is a stage that is described and
not automated.

**It cannot promise an hour figure.** The two stages that dominate the cost,
qualification and contract, are authoring and have no clock. What the sheet
measures is the reproducible part, and it is under ten seconds per pilot outside
one deletion suite. A recipe that produced a reliable hour estimate would be a
recipe that had stopped reading the code.
