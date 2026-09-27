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
target the pilot can extend. The pilot would add its own file to the `app` target,
which is the same operation as LuLu's.

**The build is not done and is an environment prerequisite.** `ant` is not
installed, there is no JDK on this machine (`java_home -V` reports no runtime), and
the `.app` is not assembled in the checkout. A Cyberduck build needs Ant, a JDK,
and the Ant assembly that also lays down the bundled runtime. The application is
**not** sandboxed (`com.apple.security.app-sandbox` is absent from
`setup/app/Info.plist`), so once built, the app can read its own support directory
with no entitlement work.

That is the same category of cost the HandBrake build was, six Homebrew packages
and an 838 MB toolchain, and the campaign already priced that as "adaptable". It
is recorded as a prerequisite and not as a result: nothing below is claimed until
it is installed.

## The open half, which is a no, and it is the interesting part

Every previous pilot's `system.open` selected a row in a native table. This
application's connection list is JavaFX, inside the JVM, so the native shell has no
row to select. Is there a URL that reaches a bookmark? No:

- `setup/app/Info.plist` registers one URL scheme per **file transfer protocol**,
  `sftp`, `ftps` and the rest, because that is how a `sftp://` link from Mail or
  Notes opens. There is no `cy://` and no application-owned scheme: the grep for
  `>cy<` in the plist returns nothing.
- So the strongest honest `system.open` on this application is "launch Cyberduck",
  and claiming that a target connection is selected would be a claim about a
  JavaFX table the adapter cannot see.

**This is a limit of the surface, not of the method, and it belongs in the offer's
scope rather than in a pilot's notes.** A client whose model is not in the native
layer gets an entity from its persisted store and an action that opens the
application, and the gap between those two is a real part of what the buyer pays
for. It is also the first pilot where the *action* is weaker than the *read*, which
inverts the shape of all four before it.

## The path is chosen at runtime, and that is a measured cost

The bookmarks folder is `<support directory>/Bookmarks`, and the support directory
is not fixed. `Preferences.java:533` sets:

```
factory.supportdirectoryfinder.class = TemporarySupportDirectoryFinder
```

A **runtime preference**, and its default is the *temporary* directory, which is
what the portable build uses. `SupportDirectoryFinderFactory` resolves it, and
there are also `UserHomeSupportDirectoryFinder` and
`MigratingSupportDirectoryFinder` in the same package.

So a pilot can read the common path and record the limitation. A shipped
integration cannot hardcode it, and the only code that resolves it correctly is
in the JVM, which brings back the boundary the pilot started from. The honest
statement is: **the native reader works, and resolving what to read is the part
that still needs the application.** For a pilot that is a one-line derivation and
a recorded limitation; for a client it is a question to ask before quoting.

There is a second, smaller version of the same point. `Preferences.java:502-509`
sets `factory.serializer.class` and separate reader and writer classes for
profiles, transfers and hosts. The *format* of a `.duck` file is a runtime
preference too. A native reader that hardcodes keys would break on any build that
switches serializer, and the one thing this pilot must not do is claim a format
the application itself does not promise.

## The sensitivity classification, before any contract

The classification is the same discipline as LuLu's and it lands in a different
place, because the fields come from a file rather than from a live model.

| Field | May carry | Verdict |
|---|---|---|
| filename stem, `Rule.uuid` equivalent: the `Host` uuid | nothing a person wrote | **the identifier** |
| `Nickname` | anything the person types, including a client or project name | the title, never an identifier |
| `Hostname` | the client's own server, a partner's host, an internal name | the subtitle, and the reason the classification is stricter than FSNotes's |
| `Credentials` | a password or a key | **never read** |
| `Protocol` / `Scheme` | a file transfer protocol, harmless on its own | not needed by any surface this pilot would claim |
| `Path`, `Encoding`, `Idle` | working state, not a choice the person made | not exposed |

**The classification is stricter than LuLu's on one point and looser on none.** A
firewall rule's endpoint is infrastructure the machine talked to; a connection's
hostname is a server the *client's own customers* use, so it is third-party
infrastructure and it is the one field here that a reader of a client report should
see least. `Nickname` is the person's own text, exactly like a notebook name, and
so it is a title.

**`Credentials` is the field the classification exists for here.** A `.duck` file
is a saved connection and saved connections carry credentials, sometimes a
password, sometimes a private key path. The pilot reads two keys and never opens
the credential fields, and the record says so, because a pilot that says "we did
not read the passwords" is making a claim a client will care about and a client
will test.

## What this pilot predicts, for task 4.4 to check

The prediction is that the recipe transfers intact to a Java application, and that
the thing that makes it transfer is **not** the method. It is this application
happening to have written a native reader of its own store, in a
machine-readable format, with the identifier in the filename.

The general case is therefore two cases, and a pilot is what tells them apart:

- an application whose model is natively readable, directly or by its own store,
  takes the same four steps as the other four pilots and the language of the native
  layer does not matter;
- an application whose model is not natively readable needs a bridge, which is a
  different piece of work with its own price, and no amount of pilot recipe makes
  it the same price.

This application is the first case, by luck rather than by design, and the pilot
has to say so rather than take the credit for a general result it does not have.
