# Transmission, stage 0, and why the pilot has not started

- **Application**: Transmission, a macOS BitTorrent client
- **Revision**: `48835c6`, "Fix the both-null guard in SorterBase to test the right-hand side (#9098)"
- **Licence**: GPLv2
- **Platform audited**: macOS
- **Third pilot because**: it is the first peer-to-peer client, so the first domain
  where the object a user asks for is not a document the app owns but a transfer
  the app is relaying for someone else
- **Status**: not started. Stage 0 did not pass, so condition 1 is false and task
  2.1 stays unticked. Blocker 1 has a solved precedent in this campaign; blocker 2
  is new and unresolved.

## Stage 0, the repository must build

Run on this machine, Xcode 27.0 build 27A266a, macOS 27.0. Verdict: **does not
build**. Two independent blockers, both in the application, neither in IntentLane.

### Prerequisite, not a defect: submodules

The checkout declares 17 submodules under `third-party/` and all 17 were
uninitialised, every directory empty. `git submodule update --init --recursive`
fetched them and all 17 are now at their recorded revision. This is a step a
normal developer performs, not a missing system dependency, and it is recorded
here so the next attempt does not rediscover it.

### Blocker 1, the deployment target is below Xcode 27's floor, and this has a precedent

Every target fails identically:

```
error: The macOS deployment target 'MACOSX_DEPLOYMENT_TARGET' is set to 11.0,
but the range of supported deployment target versions is 12.0 to 27.0.x.
```

Named on `wildmat`, `QuickLookPlugin`, `b64`, `deflate`, `miniupnp`, `utp` and
others. Xcode 27 will not build for a deployment target below macOS 12.

This is the toolchain-as-prerequisite case the recipe already anticipates, and
**this campaign has already solved it once**. The HandBrake deviation row reads
"its deployment target is below the range Xcode 27 supports", and HandBrake went
on to become a certified pilot. So blocker 1 is a known class with a known
resolution, and it is not the reason Transmission is stuck.

### Blocker 2, the `dht` target archives no object files, and this one is new

With `MACOSX_DEPLOYMENT_TARGET=12.0` passed on the command line, so that blocker
1 is out of the way and nothing in the checkout is modified, the build gets
further and then fails on the `dht` target:

```
The following build commands failed:
	Libtool .../dht.build/Objects-normal/arm64/Binary/libdht.a normal arm64
	Libtool .../dht.build/Objects-normal/x86_64/Binary/libdht.a normal x86_64
```

`libtool` printed its own usage and exited non-zero. The usage line requires
`<mach-o file>+`, and the invocation passes none, because the generated
`dht.LinkFileList` holds a single line:

```
.../dht.build/Objects-normal/libdht.a-x86_64-prelink.o
```

A prelink object and no compiled sources. The sources exist, `third-party/dht`
holds `dht.c` at 85.2K and three `.c`/`.h` files in total, and the Xcode project
names `dht` 42 times. So the target's compile phase yields nothing under Xcode
27 while its archive step still runs. `libdht.a` is what the app links against,
so this is not a warning that can be ignored.

### What passed

The project's own build configures with no missing dependency at all:

```
cmake -B build -DCMAKE_BUILD_TYPE=Release -DENABLE_GTK=OFF -DENABLE_QT=OFF
-- Configuring done (22.6s)
-- Generating done (1.5s)
```

Zero Homebrew packages, against the six HandBrake needed before it would
configure. The CMake path is healthy; it is the Xcode path that Xcode 27 breaks,
and on macOS the `.app` is an Xcode product.

## Les conditions d'entrée, une par une

| Condition | Verdict |
|---|---|
| Builds from a clean checkout | **Non.** Two blockers above. |
| Previous pilot certified | Yes. FSNotes and HandBrake re-certified in `chain-the-remaining-pilots` 0.9. |
| No known defect unfixed in reused code | Yes. Section 0 is closed. |

The recipe says a pilot that cannot meet a condition is **blocked and named
rather than forced**. So Transmission is named, here, and not started. Task 2.1 of
`chain-the-remaining-pilots` stays unticked, because the verification it asks for
is a ticked list of conditions in the pilot's record and one of them is false.

The verdict is not "Transmission is a bad pilot". Blocker 1 is a class this
campaign has already beaten once, on HandBrake. Blocker 2 is the one that decides
this pilot, it is new, and nothing in the campaign has met it before.

## Ce que cela coûte à la campagne

Transmission was the third pilot and the third business domain. The offer gate
asks for three reproducible validations in distinct domains, and the two
certified pilots are FSNotes, a note-taking app, and HandBrake, a video
transcoder. Blocking Transmission leaves the third domain to be found in LuLu, a
firewall, or Cyberduck, a file transfer client, which means running Stage 0 on
those two before either can be called the third domain.

## Les deux portes de sortie, et il appartient au propriétaire de choisir

1. **Chercher le troisième domaine ailleurs.** Run Stage 0 on LuLu and on
   Cyberduck. Cost: two build attempts. If one builds, the campaign keeps its
   order and nothing upstream is touched.

2. **Accepter une modification du fork.** Raise `MACOSX_DEPLOYMENT_TARGET` to
   12.0 and repair the `dht` target, both inside a fork, both recorded as
   deviations with the maintainer told. Cost: the pilot stops being a clean
   checkout, which is the exact property task 2.1 verifies, and it puts an
   upstream change in the first PR that a maintainer reads.

The recipe prefers the first, because option 2 spends the property that makes the
pilot evidence worth anything. But that is a call about what a fork is for, and
it is not mine.

## État du checkout après le passage

`build/` weighs 31 MB and is gitignored, so `git status` is clean apart from the
submodules being populated. It was left in place because `rm -rf` and
`git clean` are both unavailable in this environment. All 17 submodules sit at
their recorded revision, so nothing is modified in the checkout itself.
