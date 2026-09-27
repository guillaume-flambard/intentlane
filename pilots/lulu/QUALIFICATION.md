# LuLu pilot

- **Application**: LuLu, a macOS firewall
- **Revision**: `7d2669e`, shallow clone, no submodules, origin set to the real upstream
- **Licence**: GPL-3.0, read from the repository rather than assumed
- **Platform audited**: macOS
- **Fourth pilot, and the first that the toolchain can actually run**: measured,
  not assumed, by `scripts/can-this-build-compile-swift.sh` before a line of the
  pilot was written.

## Why this pilot, chosen by a measurement

Transmission is blocked and cannot receive generated Swift: its application
builds with CMake, and no released CMake compiles Swift against Xcode 27's
`swiftc`, which was proven from a CMake built from source rather than from two
packagings. The campaign needed to know whether that is Transmission's problem or
the method's, and the answer is that it is neither: it is the whole class of
CMake-built applications, so the next pilot has to be chosen on this axis rather
than on the order of a list.

LuLu answers `YES` on both signals, which is the first candidate to do so:

```
project:   xcode-project
toolchain: compiles-Swift
verdict:   YES. Both signals agree.
```

Against Transmission the same script answers `NO`. The app target here is 41
`.m` files and no Swift, so the defect Transmission shares is present, and unlike
Transmission the build can absorb the remedy.

**What the previous pilot's block does to this pilot.** The recipe's second entry
condition required the previous pilot to be certified. Transmission is not, so
that condition was amended rather than ignored, and the amendment is derived from
the reason the condition exists: it exists so that a defect is not left
attributable to the wrong pilot. Transmission's block produced **no finding in an
application at all**, because it is a toolchain limit proven from source, so
there is nothing here to misattribute. A pilot that had stopped on something it
found in the application would still block the next one, and that is the case the
condition was written for.

## The sensitivity classification, before any contract

Task 3.1 is to classify first, so the contract can be adjusted deliberately
rather than discovered later. Read in `LuLu/Shared/Rule.h` and `Rule.m`.

### What a rule is, and the three kinds

A `Rule` is the firewall's decision about one process or endpoint. The class
carries, among others:

- `uuid`, a `NSUUID` string generated once at creation, and `key`
- `name`, the display name
- `path`, the process binary, and `isGlobal` when the path is the wildcard
- `endpointAddr` and `endpointHost`, matched exactly, by regex, or by CIDR
- `action` allow or deny, and `scope` process or endpoint
- `isDisabled`, `expiration`, and `isTemporary`, which the header defines as
  "duration is set to process lifetime (e.g. has a pid)"

So there are three kinds of rule, and they do not share a lifecycle: a permanent
user rule, a rule that expires, and a temporary rule that dies with the process
that caused it.

### What the names may carry, which is the question the classification exists for

**This application's own identifier is a filesystem path.** `generateKey` in
`Rule.m` prefers a code-signing identifier, and falls back to exactly this:

```objc
if(0 == key.length)
{
    key = self.path;
}
```

That is the finding, and it is the reason this pilot is classified separately
from the three before it. A path on a developer's machine carries their user
name, their build directory and their project's name. A `DevID` signing
identity, the other branch, names an **organisation**, which for a client is a
legal entity. Neither belongs in a client report, and the first one is also what
the application itself uses to deduplicate rules.

**Therefore the identifier for this pilot is `uuid` and never `key`**, and this
is not a stylistic preference: `key` is the field the application considers
canonical, so exposing it would export the application's own notion of identity
along with a path.

What each field may carry, and therefore what may be exposed:

| Field | May carry | Verdict |
|---|---|---|
| `uuid` | nothing a person wrote | the identifier |
| `name` | anything the person types, including a client or project name | **not** an identifier, per the rule that already excluded a user preset and a torrent name |
| `path` | user name, build directory, project name | **not exposed** |
| `endpointAddr`, `endpointHost` | internal hostnames, infrastructure, a client's own servers | **not exposed** |
| `csInfo` | the signing organisation, a legal entity | **not exposed** |
| `action` | allow or deny | exposed as the subtitle |
| `isDisabled` | nothing | exposed, and it drives an exposure condition |

The three previous pilots were classified by one field, the person-written name.
LuLu adds a class the method has not met: **fields that name other people's
infrastructure**. A torrent name is the user's own content and a notebook name is
the user's own text, so excluding them is a privacy choice about the user. A
firewall rule's endpoint and path are a record of what the user's machine talked
to and what ran on it, which is a different kind of thing to put in a report
someone else reads.

### The exposure conditions, and the prediction this makes

The three rules the schema offers map onto the three states the code already
tracks, which is why the mapping is not a guess:

- **`source_disabled`**: `isDisabled` exists and `RulesWindowController.m` reads
  it to render a rule in the disabled colour. A disabled rule is the application
  saying it will not act on it, which is a source turned off.
- **`item_not_usable`**: a rule whose `expiration` has passed, or that is
  `isTemporary` and whose process has gone. The rule object is still in memory
  and still in the list, and it can no longer do anything.
- **`item_missing`**: not used. Nothing removes a rule from the application's
  store in a way this pilot has observed, and a condition asserted without an
  observation is a condition that can be wrong.

**What the classification predicts, for task 3.4 to check.** Because the object
is named by `uuid` while the application names it by path, the contract will
have to bind two different identifiers, and the tests will have to prove that a
rule's `uuid` survives a rename of its `name` and a move of its `path`. If the
classification is right, that is where the work is. If the contract turns out to
need something the classification did not anticipate, the classification was
incomplete and it is the classification that has to be amended, not the pilot.

### The object is not chosen here, and why

A rule is the obvious candidate and a block/allow decision is the obvious
action, but both are held back until the entry conditions are applied, because
the object choice should be made knowing the pilot can build at all. What the
classification does settle is the field policy above, and that policy does not
change if the object ends up being a rule or something narrower.

## The entry conditions, applied

### 1. The application builds from a clean checkout

**Not met, and the missing prerequisite is a binary, not a package.**

The application target copies a prebuilt helper that the repository does not
contain and does not build:

```
CpResource .../LuLu.app/Contents/Resources/Netiquette.app \
    ~/projects/intentlane-lulu/LuLu/Binaries/Netiquette.app
```

`LuLu/Binaries/` is the last line of `.gitignore`, there is no `Netiquette`
directory in the checkout, no `.gitmodules`, and nothing in the repository
produces the file. Netiquette is a **separate application**,
`objective-see/Netiquette`, last pushed 2024-10-05. It has to be built and placed
there before LuLu will build at all.

That is the same class as HandBrake's `external` target, which its own autotools
build feeds, and the recipe already carries that row. The difference is that
HandBrake's dependency is in the repository and Netiquette's is not, so the
build cannot be started from a clean checkout without first obtaining a second
project. Installing a Homebrew formula is the person's decision and so is this:
obtaining and building another application is a larger version of the same
decision.

Two errors were cleared before this one, and both are recorded because they will
return:

- `MACOSX_DEPLOYMENT_TARGET = 10.15` in six places, and Xcode 27 accepts 12.0 to
  27.0. Raised to 12.0, the minimum Xcode 27 takes. This is the third pilot where
  the checked-in project predates the toolchain, after Transmission's 11.0.
- **Code signing.** `DEVELOPMENT_TEAM = VBG97UB4TA` and
  `No profile for team 'VBG97UB4TA' matching 'LuLu Application' found`. This one
  is not a toolchain limit and I did not work around it: the application is
  signed with a real developer identity, there are no provisioning profiles on
  this machine, and impersonating an identity is not a thing an agent does. It is
  recorded as the missing prerequisite it is. Building with signing disabled
  clears it, and that would prove the target compiles while proving nothing about
  running, which is why it was not used to tick this condition.

**The condition is not ticked.** LuLu is a firewall: it needs a privileged
helper and a system extension, neither of which can run unsigned, so a
compile-only build would leave the recipe's "produce a running app" unanswered.

### 2. The previous pilot is certified

**Met, by the amendment, and the amendment is doing real work here.** Transmission
is not certified. It satisfies the amended condition because its block produced no
finding in an application at all: a toolchain limit proven from source, with no
line of LuLu, Transmission or anything else involved. Had Transmission stopped on
something it found in an application, this condition would be unmet and LuLu
would be blocked.

### 3. No known defect from an earlier pilot is unfixed in the reused code

**Met, with one open defect recorded rather than hidden.** The netnewswire
contract's misplaced `confirmation` key is now held as work in flight in
`openspec/changes/migrate-netnewswire-to-the-contract/`, out of `pilots/`, so it
cannot be read as a shipped pilot. No code is reused between the pilots: each
integrates into its own application, and the reused thing is the generator, which
has no open defect from these pilots.

## What this pilot has produced, and it is not the integration

Three pilots in, the pattern is no longer anecdotal. Every pilot has been stopped
by a **prerequisite**, not by the App Intents work:

| Pilot | Stopped by |
|---|---|
| Transmission | no released cmake compiles Swift against Xcode 27 |
| LuLu | a prebuilt helper that the repository neither contains nor builds |
| both | a checked-in project older than the toolchain |

The cost of this method is currently being paid entirely at entry conditions,
and the recipe's stage 0 is where it shows up. That is the finding to carry into
the effort sheet, because it is a cost a client pays too: a fixed-scope audit
quoted per application has to survive its prerequisites, and so far none of the
three applications has been ready on the day.

## What is deliberately not written yet

The contract, the generated sources and the three suites belong to the tasks
after the entry conditions, and the first condition is not met. Nothing is
written before it is.

**What would unblock it, in order of cost**: build `objective-see/Netiquette`
and place the app in `LuLu/Binaries/`, and have the signing identity available
for the team `VBG97UB4TA`. The first is a second application to obtain and
build; the second is an Apple Developer account and its profiles, which is
strictly the owner's and not a step to work around.
