# LuLu, stage 0, and why the pilot has not started

- **Application**: LuLu, a macOS firewall, with its companion app Netiquette
- **Revision**: `7d2669e`, "Update FilterDataProvider.m"
- **Licence**: GPLv3
- **Platform audited**: macOS
- **Fourth pilot because**: it was to be the third business domain, a network
  firewall, after a note-taking app and a video transcoder
- **Status**: not started. Stage 0 did not pass, so condition 1 is false and task
  3.2 stays unticked.

## Ce qui a été vérifié avant le build

Clean checkout, no submodules declared, 45 MB. The build entry is a workspace,
`lulu.xcworkspace`, holding `LuLu/LuLu.xcodeproj` with two targets, `LuLu` and
`Extension`, and three schemes of which two are named `Extension`.

## Blocker 1, the deployment target, the class this campaign already knows

```
error: The macOS deployment target 'MACOSX_DEPLOYMENT_TARGET' is set to 10.15,
but the range of supported deployment target versions is 12.0 to 27.0.x.
```

On both targets. The same class as HandBrake at `1255087` and Transmission at
`48835c6`, which makes three projects out of three that are not already on Xcode
27's floor. That is a fact about the method and not about any one application, so
it is recorded once, as a recipe amendment, rather than three times.

## Blocker 2, the maintainer's signing identity

```
error: No profile for team 'VBG97UB4TA' matching 'LuLu Application' found
error: No profile for team 'VBG97UB4TA' matching 'LuLu Extension' found
```

`VBG97UB4TA` is the maintainer's team. A pilot cannot hold it, and a pilot must
not borrow it. The recipe says a missing system dependency is the person's
decision; this is not a dependency to install, it is an identity that belongs to
someone else, so it is not a decision to be taken at all.

## Blocker 3, and this is the one that decides: the checkout is missing a signed app

With the deployment target overridden and signing disabled on the command line,
so that nothing in the checkout is modified and no identity is used, the build
gets past both and then stops on one line:

```
error: The file "Netiquette.app" couldn't be opened because there is no such file.
```

`Netiquette` is not a target and not a scheme. In `project.pbxproj` it is a file
reference that the `LuLu` target copies into its Resources:

```
CDC378CB250C83F200314064 /* Netiquette.app in Resources */ = {isa = PBXBuildFile;
  fileRef = CDC378C9250C83F100314064 /* Netiquette.app */; };
CDC378C9250C83F100314064 /* Netiquette.app */ = {isa = PBXFileReference;
  lastKnownFileType = wrapper.application; path = Netiquette.app;
  sourceTree = "<group>"; };
```

So the project embeds a prebuilt, signed application bundle that the maintainer
keeps outside version control, and a fresh clone cannot build the app because
that bundle is simply not there. The `DMG/` directory at the root holds the
packaging assets and `createDMG.sh`, not the missing bundle.

This blocker is categorically different from the two above. The first is a build
setting with a known override. The second is an identity the pilot must not use.
The third is a **binary artefact that is not in the repository**, and no build
setting produces it. It can only be supplied by the maintainer.

## Les conditions d'entrée, une par une

| Condition | Verdict |
|---|---|
| Builds from a clean checkout | **Non.** Three blockers, the third unfixable by the pilot. |
| Previous pilot certified | No. Transmission did not reach certification. |
| No known defect unfixed in reused code | Yes. Section 0 is closed. |

Two of the three conditions fail, and the first one cannot be repaired by the
pilot. So LuLu is named and not started, and task 3.2 stays unticked.

## Ce que le pilote aurait appris, s'il était lancé

LuLu was chosen as the first firewall domain, and it is worth recording that the
choice was reasonable and the blocker is not about the choice. A firewall is a
legitimate third business domain, the checkout is small and has no submodules, and
the launcher probe written for HandBrake and FSNotes would apply. What fails is
that this project does not build from a public clone, which is the first thing
Stage 0 exists to find out.
