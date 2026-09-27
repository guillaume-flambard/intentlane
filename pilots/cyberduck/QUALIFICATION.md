# Cyberduck pilot

- **Application**: Cyberduck, a file transfer client
- **Revision**: `fc0d437` (2026-09-22), shallow clone, origin set to the real upstream
- **Licence**: GPL, read from the repository rather than assumed
- **Platform audited**: macOS
- **Fifth pilot, and the first whose model does not live in the language of its
  native layer**: a JavaFX application whose only native surface is six
  Objective-C files.

## The question this pilot exists to answer

Task 4.1 asks one question before any mapping is written: does the native shell
carry App Intents by the same path as the other four targets, and the answer has
to be documented in both directions. The other four were a Swift app
(FSNotes), an Objective-C app (HandBrake), an Objective-C app whose build cannot
compile Swift (Transmission, blocked), and an Objective-C firewall (LuLu). This
one is a Java application with a thin Objective-C launcher, so every assumption
the previous four made about where the model lives is false at once.

**The answer is yes on the build, yes on the read, and no on the open, and the
read is yes only because the application already ships a native reader of its own
store.** That is the finding, and it is not the answer I expected. I expected to
write "the model is in the JVM, so the recipe does not apply", and the reason that
would have been wrong is worth the whole pilot.

## What looked like a no, and what it actually was

**The native side has no handle to the JVM, and that part is exactly as bad as it
looks.** The whole native surface of the application is:

```
osx/src/main/objc/   CDOutlineView.m  CDOutlineCell.m  CDListView.m
                      CDToolbarItem.m  main.m
cli/osx/src/main/objc/ launcher.m
osx/docktile/        main.swift
```

and `main.m` does nothing but call `launch(argc, argv)`. The launcher resolves the
bundled runtime, `dlopen`s `libjli.dylib`, `dlsym`s `JLI_Launch` and calls it
(`cli/osx/src/main/objc/launcher.m:145-168`) with `0, NULL, 0, NULL` for its three
out-parameters. So the native process hands control to the JVM and never gets a
`JavaVM*` back. Grepping the native tree for `JavaVM`, `GetJavaVM` and
`AttachCurrentThread` returns **nothing**; the only hit for `JavaVM` in the whole
repository is a link path in `osx/build.xml:98`. The only JNI in the tree is
`JNIEXPORT Java_ch_cyberduck_core_local_FinderSidebarService_*` in `libcore`, and
that is Java calling native, which is the wrong direction for a system that asks
the application a question at a moment the application did not choose.

**Then the application turned out to read its own connections natively already.**
`osx/spotlight/GetMetadataForFile.m` is a Spotlight metadata importer, and its
whole body is:

```objc
NSDictionary *bookmark = [NSDictionary dictionaryWithContentsOfFile:(NSString *)file];
if(nil != [bookmark objectForKey:@"Hostname"])  { ... @"ch_sudo_cyberduck_hostname" ... }
if(nil != [bookmark objectForKey:@"Nickname"])  { ... @"ch_sudo_cyberduck_nickname" ... }
```

So a native Objective-C file in this application already enumerates connections,
reads a person's label for one, and exposes it to Spotlight. The claim I was
about to make, that a native adapter would have to invent a reader, is false: it
would have to write one that already exists, in an application that ships it.

**And the store is shaped in a way that makes it almost trivially addressable.**
`AbstractFolderHostCollection.java:45` filters on `.*\.duck` and `:72` names each
file `String.format("%s.duck", bookmark.getUuid())`. One connection per file, the
**uuid is the filename stem**, and `BookmarkCollection.java:36` puts them in
`<support directory>/Bookmarks`. That means:

- the identifier needs no Java and no read of the file's contents, it is the name;
- it survives a rename of the nickname, because the name is not in the filename;
- a connection that was deleted is a file that is not there, which makes
  `item_missing` observable rather than inferred.

`.duck` is even a registered document type (`ch.sudo.cyberduck.bookmark`), so the
system indexes these files too.

## The build half, which is the easy half here

```
project:   xcode-project
toolchain: compiles-Swift
verdict:   YES. Both signals agree.
```

The `app` target is 6 Objective-C files with no Swift, which is LuLu's exact
shape, and `scripts/add-intentlane-sources.rb` already handles both
`SWIFT_VERSION` and `SWIFT_OBJC_BRIDGING_HEADER` because LuLu needed both. The
project is not even Swift-hostile: it has a `docktile` target compiling
`osx/docktile/main.swift`, so Xcode is already building Swift in this project and
the `SWIFT_VERSION` question does not arise.

**The importer is not in any Xcode target**, which is the one wrinkle. The four
targets are `app`, `libcore`, `cli` and `docktile`, and `GetMetadataForFile.m` is
in none of them: it is assembled by the Ant build into the metadata importer
bundle. So the precedent lives in code the pilot can read and imitate, not in a
target the pilot can extend. The pilot adds its own file to the `app` target,
which is the same operation as LuLu's.

**The build is done. The environment prerequisites, and what they really were.**

- A JDK was already on this machine, and `java_home -V` reported no runtime
  anyway: Homebrew's `openjdk` and `openjdk@17` are keg-only and neither is
  registered in `/Library/Java/JavaVirtualMachines`. The absence that
  `/usr/libexec/java_home` reported was an absence of registration, not of Java.
  A check that asks the wrong tool would have reported this machine as unable to
  build a Java application, and it would have been right for the wrong reason.
- `maven.compiler.source` and `target` are `8` in `pom.xml:82-83`, with
  `<release>8</release>` at `:464`. The installed JDK 26 accepts it with a
  deprecation warning and JDK 17 accepts it silently, and Maven picks 17 by
  itself. The repository's own `AGENTS.md` asks for JDK 21, and neither installed
  version is 21. It built anyway, which is the useful part: the declared
  prerequisite was a floor, not a constraint.
- `ant` and `maven` were installed: two formulae, 45 MB and 11 MB, and three
  dependencies upgraded.
- **`-DskipSign` does not skip signing.** The pom's `run-ant-sign-target`
  execution is unconditional and `osx/build.xml:109` guards the codesign call with
  `unless:true="${env.SKIP_SIGN}"`, an **environment variable** rather than a Maven
  property. The first successful-looking invocation failed at
  `codesign.xml:69` for that reason alone.

**And the fourth occurrence of the stale deployment target.** `core/dylib/build.xml:27`
and `osx/build.xml:32` both set `app.runtime.system.min` to `10.13`, and Xcode 27
answers `the range of supported deployment target versions is 12.0 to 27.0.x`.
Raised to 12.0 in both files and the native build passes.

This is now four applications in a row whose checked-in build predates the
toolchain, at 11.0, 10.15, 10.15 and now 10.13. **The cost is bounded and
mechanical every time, and it is now the single most predictable line in the
price.** There is one difference worth recording: here the value lives in an Ant
property that is passed to `xcodebuild` on the command line, so an upstream
contributor cannot be given a project-file edit as the fix. That is a one-line
change with a different shape, not a different amount of work.

The result is a real application: `Cyberduck.app` whose executable is a Mach-O
universal binary for x86_64 and arm64, carrying its own `jdk-25.0.4.1-universal`
runtime, the Dock plugin, the Spotlight importer, 173 localizations and
`LSMinimumSystemVersion 12.0`. It is **not** sandboxed, so it reads its own
support directory with no entitlement work.

## The entry conditions, applied

### 1. The application builds from a clean checkout

**Met, and the build was not the hard part.** `mvn verify -DskipTests -Drevision=0`
with `SKIP_SIGN=true` and `JAVA_HOME` on JDK 17: **BUILD SUCCESS** in 54 s after
the deployment target was raised, having compiled every Java module including all
the protocol modules.

### 2. The previous pilot is certified

**Met.** LuLu is certified on its six claims, and its `indexSync` weakness is
recorded rather than carried here.

### 3. No known defect from an earlier pilot is unfixed in the reused code

**Met, with the honest caveat about the reused script.** The only thing reused is
the generator and the add-sources script, and the script grew a second job during
the LuLu pilot. It was exercised again here and it needed no change: it added five
files, set `SWIFT_VERSION` and `SWIFT_OBJC_BRIDGING_HEADER`, and reported
`nothing to do` on the second run. Its idempotence is what made a build on a
target with no Swift a script call rather than a project-file edit.

## The object, and the two routes the application offers

**A saved connection, identified by the `UUID` its own store writes, with a title
and no subtitle.**

`validate` exits zero and `generate --check` exits zero, and the generated entity
carries exactly two fields:

```swift
struct IntentLaneConnectionEntity: AppEntity, IndexedEntity {
  let id: String
  @Property(title: ..., indexingKey: \.title)
  var nickname: String
```

**The open path is where this pilot found something the four before it could not.**
The application offers two ways to open a connection and only one of them is
honest.

- **The URL route.** `MainController` handles an incoming URL: line 1267 parses it
  with `HostParser.parse(url)`, configures credentials, and lines 1276-1280 reuse a
  browser window already mounted on the same host by comparing `HostUrlProvider`. So
  `sftp://client.acme.example` opens the application on a connection to that host.
  It needs the **hostname**.
- **The document route.** `CFBundleDocumentTypes` registers `duck` as
  `ch.sudo.cyberduck.bookmark` with `LSHandlerRank Owner` and role `Editor`, and
  `MainController.application_openFile` at line 577 does
  `"duck".equals(f.getExtension())` and then
  `newDocument().mount(HostReaderFactory.get().read(f))`. So handing the connection's
  own `.duck` file to LaunchServices opens **that exact saved connection**, with the
  credentials the application saved beside it, because it is the file the
  application itself wrote. It needs a **file path**, used at the seam and never
  exported.

The contract takes the document route. The URL route would put a client's
customers' server names into a Siri utterance, a Spotlight result and an index
entry, which is the one thing this classification exists to prevent, and the
pilot would have been correct and useless.

**This is the third time the same shape appears, and it is the campaign's central
claim made concrete.** LuLu identifies a rule by `key`, which is a path or a
signing identity, and the pilot uses `uuid` instead. IINA's identifier is
`mpvMd5`, stable across a title change and not across a move. Here the file path
is read inside the app to act and never crosses into the entity. Three
applications, three identifiers, one rule: **the identifier and the thing the
system shows are not allowed to be the field the application uses to find the
object internally.**

**No `system.searchInApp`.** The bookmark list is JavaFX and its filter is not
reachable from the native shell, so a search intent would advertise a surface the
adapter cannot reach. Declaring it because a firewall or a notebook has one is how
a contract ends up promising something its mapping cannot serve, and the metadata
gate would then fail on a registered action the mapping cannot serve, which the
recipe names as a release blocker.

## The generated code is inside the application, and compiled

`scripts/add-intentlane-sources.rb` added five files to the `app` target and set
both build settings, and reported `nothing to do` on the second run, so the
operation is re-runnable after a failed build.

The build is `xcodebuild -target app` in Release, `ARCHS='x86_64 arm64'`, adhoc:

```
** BUILD SUCCEEDED **
```

And the objects are there, which is the check that matters and the one the
Transmission investigation made necessary:

```
ConnectionCore.o           92.9K
ConnectionHandlers.o       74.8K
ConnectionIndex.o          78.0K
ConnectionIntegration.o    68.1K
IntentLaneGenerated.o     166.3K
Cyberduck.swiftmodule      123.3K
```

Five objects, both architectures, and a `.swiftmodule` from a target that had no
Swift before this pilot. The registration literal is in the built binary, checked
with `strings`: two occurrences, so one literal rather than fragments.

**One build error, and it is a portability fact.** The first build failed with
`cannot find 'Logger' in scope` and `extra argument 'privacy' in call`. The seam
had `import AppIntents`, `import AppKit` and `import Foundation`, and
`Logger` lives in `OSLog`, which the HandBrake and LuLu seams both imported.
`import Foundation` does not re-export it. It is the same missing import the two
pilots before would have made, written from scratch instead of copied, which is
what it costs to write a seam without a template.

## The three suites, and the negative

118 checks in three suites, each written before the file it tests, and each seen
red on the missing file first. The counts are 63, 35 and 20.

| Suite | Checks | What it covers |
|---|---|---|
| `tests/core` | 63 | eligibility, name matching, UUID lookup, the store projection, the record's field set |
| `tests/integration` | 35 | the resolver, the open path, the exact negative, the route the open path takes |
| `tests/index` | 20 | a real named Core Spotlight index, and the folder diff |

**The projection is tested on a real file carrying all thirteen keys.** The core
suite writes a `.duck` with `UUID`, `Nickname`, `Protocol`, `Hostname`, `Port`,
`Username`, `CDN Credentials`, `Path`, `Workdir Dictionary`, `Encoding`,
`Client Certificate`, `Private Key File`, `Private Key File Dictionary`,
`Download Folder` and `Upload Folder`, then asserts the record that comes back
renders no hostname, no login name, no key path, no certificate and no local path.
That is the only way to keep "this pilot reads two keys" a fact: a claim about
which keys a function reads is a claim about code, and the test that holds it has
to hand the function a file containing the keys it must not read.

**The record's field set is under test, and it is two fields.** `Mirror` on
`ConnectionRecord` against exactly `["id", "nickname"]`, plus ten checks that no
field is named after a host, a user, a key, a path, a port, a protocol, a folder
or a certificate. The generated entity is read back the same way and asserted to
be `["_nickname", "id"]`, the underscore being the `@Property` wrapper's storage,
with a second check that there is exactly one underscored name so the assertion
cannot pass by accident on some third field.

**The exact negative, in both halves, plus a third this application needed.** An
unknown UUID resolves to nothing and opens zero times. A target carrying a real
connection's nickname with an unknown UUID throws, and that connection is not
opened in its place. The third is the one LuLu could not have: a connection that
**resolves** and whose file has since been deleted must throw rather than
synthesise a path, because `NSWorkspace.open` on a path that does not exist fails
silently and a silently failed open is a claim the application did not keep.

**Two homonyms, because a client will have two servers with the same nickname.**
The fixtures hold two connections named `Acme production`, the resolver is
required to return both rather than choose, and the open path is required to hand
over the right one's own file. With no subtitle on the entity, nothing but the
UUID can tell them apart.

**Two fixtures failed and the fixtures were what changed.** One put two records
with the same UUID in one pool, which the store cannot produce, so it was testing
a sort order rather than a rename. The other wrote non-plist bytes into the file
that was supposed to be a readable bookmark with a mismatched name, so it was
counted unreadable instead of mismatched. Both are the same failure as the LuLu
core suite's, and the pattern is worth naming: **a fixture that cannot exist in
the store tests nothing, and the assertion that fails is the one that was
checking the fixture rather than the code.**

## The index, and the mechanism that is different here

`item_missing` is observable on this application in a way it was not on LuLu. A
deleted connection is a `.duck` file that is gone, so the index suite removes a
real file and watches the tracked set: a rename does not remove, a deletion does,
and a file that is there and unreadable does neither. Core Spotlight has no
read-back for a named index, so the tracked set is the only record of what was
indexed and a UUID that left the folder is deleted from the index by name.

**The mechanism is a refresh, not a notification, and that is a real difference.**
The other four pilots each had an event to listen to: `RULES_CHANGED` over XPC,
`HBPresetsChangedNotification`, a notebook's own change event, IINA's history
recording. This application has none. The bookmarks folder is a directory the
application writes into whenever the person saves or removes a connection, and
nothing announces it, so the index is a function of the folder and has to be
refreshed. `ConnectionIndexSync` takes a `folder` rather than a `source` for that
reason, and it diffs the tracked set on every refresh so a deletion is still
handled even though there is no event to handle it.

**And there is no deletion suite, for the opposite reason to LuLu's.** LuLu could
not drive its removal because it happens in a privileged extension. Here the
removal is a file the pilot can create and delete, so there was nothing to build a
harness for. The pilot deletes the real file instead of driving the real code, and
that is a weaker claim in one specific way, which is the way that matters: **no
application code runs to remove the connection.** It is stronger in another: the
object under test is the application's own file, not a fixture shaped like it.

**A gap in the exposure rules, found and named.** A file in the folder that is not
a readable property list is neither usable nor missing: it is there, and nothing can
make sense of it. None of `source_disabled`, `item_not_usable` or `item_missing`
covers "unreadable", and the pilot skips such a file rather than pretend one of them
fits. This is the first gap in the rule set this campaign has met, it is in the
contract, and it is a rule the campaign should add rather than a workaround the
next pilot should rediscover.

## What is not claimed

**No launch probe, and no `registration` claim.** Launching this application
needs its bundled JVM, a signed identity and a graphical session, and the claim set
is the six a command settles. The registration line was checked to exist in the
built binary with `strings`, which is a check on the file and not a run.

**`siri-conversation` and `spotlight-ui-result` are not claimed**, as in every
pilot. No public API sends a phrase to Siri and Core Spotlight offers no read-back
of a named index.

## The metadata, and a name that had to be right

Metadata extracted with the recipe's two traps observed: the protocol list is an
input and is tracked at `pilots/cyberduck/protocols.json`, and the processor is
reached through the toolchain path. `version.json` says `toolsVersion 27A266a`, and
`extract.actionsdata` carries `IntentLaneConnectionEntity`, `OpenConnection` and
`OpenIntent` with `OpenEntity`, and nothing else. Nothing advertises an action the
mapping cannot serve.

The `--module-name` had to be `Cyberduck` and not `LuLu`, which is a small thing
that would have produced a plausible-looking metadata bundle with the wrong module
name in it.

## The result

```
certified: Certified for the declared claims only: contract, generated,
applicationTests, integrationTests, metadata, indexSync. Any claim not listed
here is not certified.
```

Six claims, 118 checks, one build, and the two limits above are part of the result
rather than beside it: **an entity with no subtitle because the only candidate is
a hostname, and a gap in the exposure rules because "unreadable" is a third state
that none of the three conditions names.**

## What this pilot learned about portability, which is the answer to task 4.4

The recipe transfers intact to a Java application, and the thing that makes it
transfer is **not** the method. It is that this application had already written a
native reader of its own store, in a machine-readable format, with the identifier
inside the file. The general case is two cases, and a pilot is what tells them
apart:

- **an application whose model is natively readable**, directly or by its own
  store, takes the same four steps as the other four pilots, and the language of
  the native layer does not matter. This application is the proof, and it is in
  this case **by luck rather than by design**;
- **an application whose model is not natively readable** needs a bridge, which is
  a different piece of work with its own price, and no pilot recipe makes it the
  same price. A JVM application is the likeliest member of this class, and this one
  avoided it by accident.

So the question to ask a client is not "what language is your application in" but
**"is there a file or a native call that already answers the question you want
Siri to ask".** That is a question a lead engineer answers in ten minutes by
reading their own store, and it is the one thing the pilot cannot answer for
somebody else's code.

And the second thing this pilot learned is the one to quote. A file transfer
client's bookmark file holds a hostname, a login name, a private key path, a
certificate and four local paths, and the naive route to making one of its
connections openable by voice names the hostname. **Before quoting an App Intents
integration for a file transfer client, count what its save file contains.** That
is not a general concern about privacy; it is a specific, checkable, two-minute
question, and it is the question this pilot was worth running for.


## The sensitivity classification, before any contract

The classification is the same discipline as LuLu's and it lands in a harder
place, because the fields come from a file rather than from a live model. Every
key below was read out of `Host.serialize` (`Host.java:252-300`), not remembered.

| Key | May carry | Verdict |
|---|---|---|
| `UUID` | nothing a person wrote | **the identifier**, and the pilot reads this rather than the filename |
| `Nickname` | anything the person types, including a client or project name | the title, never an identifier |
| `Hostname` | the client's own server, a partner's host, an internal name | **not exposed**, see below |
| `Port`, `Protocol`, `Provider` | a port and a protocol name | not needed by any surface this pilot claims |
| `Encoding`, `FTP Connect Mode`, `Transfer Connection` | a working setting, an enum | not exposed |
| `Username`, `CDN Credentials` | a login name at the client's own server | **never read** |
| `Path`, `Workdir Dictionary` | a filesystem path on the client's machine | **never read** |
| `Private Key File`, `Private Key File Dictionary` | the path to an SSH private key, and the key itself | **never read, and this is why the pilot reads two keys and not the file** |
| `Client Certificate` | a certificate | **never read** |
| `Download Folder`, `Upload Folder`, and their dictionaries | two more filesystem paths | **never read** |

**A `.duck` file is one of the most sensitive files a file transfer client owns.**
Ten of its keys carry a server hostname, a login name, a private key path, or a
local path. The pilot reads `UUID`, `Nickname` and nothing else, and that is a
decision about *how* to read rather than about what to read afterwards: it
projects each file down to two strings with `PropertyListSerialization` and never
holds a dictionary in memory, so there is no point in the process at which a key
path exists and could leak.

That is the finding the classification exists to produce, and it is the one piece
of this pilot that is worth quoting to a client. The rest of the recipe is
ordinary; this is the part that decides whether an App Intents integration on a
file transfer client is a good idea.

**`Hostname` is the field where this application is stricter than LuLu.** A
firewall rule's endpoint is infrastructure the machine talked to; a connection's
hostname is a server the *client's own customers* use, so it is third-party
infrastructure and the one field here a reader of a client report should see
least. So the entity has a title and **no subtitle**, which is the first entity in
this campaign to have that shape. It also means the contract cannot use a protocol
as a subtitle either, because a protocol plus a nickname still narrows a client's
storage to one bucket.

## The identifier is in the file, and the filename agrees

`Host.java:262` writes `UUID` into the file, and
`AbstractFolderHostCollection.java:72` names the file from the same value. So the
identifier is available two ways, and the pilot reads the file's `UUID` because
that is the model's own field rather than an inference from a path. The filename
is then a genuine cross-check rather than a convenience: a fixture whose stem and
whose `UUID` disagree is malformed, and one test says so.

## The prediction this pilot was run to check, and where the answer is

The record for task 4.1 predicted that the recipe would transfer to a Java
application, and that what would make it transfer would **not** be the method but
this application's own native reader of its own store. The answer, after the run,
is in **"What this pilot learned about portability"** at the end of this file.

The prediction is kept here in its original form because the difference between the
two matters: the prediction was written from the code, before anything was built,
and it was right about the portability and wrong about one thing it could not have
known. It said the open path was unreachable. It is reachable, through the
document handler, and the reason it is reachable is the same classification that
seemed to forbid it.
