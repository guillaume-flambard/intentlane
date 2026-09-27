# Maintainer drafts, prepared and not sent

Task 6.5 of `chain-the-remaining-pilots` asks for a pull-request draft and a contact
draft per maintainer, **without sending them**, plus the contribution rule that
forbids it where it applies.

**Nothing in this file has been sent, and nothing may be.** Every draft below is
unaddressed, unsigned and unopened. Sending one is the owner's decision, the same
decision as pushing a branch or publishing to npm, and the campaign's notes name both
as decisions rather than as steps.

**Why drafts at all, then.** Because a pull request that has never been written
fails in ways a document does not predict, and the failure modes here are specific:
a generated file the upstream project has no place for, a deployment target their
CI does not use, a change to an application nobody owns. Writing the draft is how
those show up while writing is still free.

## The contribution rule, and which projects forbid it

| Upstream | Licence | Contribution file | Sending a PR without asking |
| --- | --- | --- | --- |
| `glutanimate/FSNotes` | MIT | none found in the clone | permitted by default |
| `HandBrake/HandBrake` | GPLv2 | `CONTRIBUTING.md` present | **ask first**, the project asks for build and test instructions to be followed |
| `objective-see/LuLu` | GPLv3 | none found in the clone | ask first in any case: the pilot builds a helper the repository does not contain |
| `iterate-ch/cyberduck` | GPL | `CONTRIBUTING.md` not present in the clone | **ask first**, a Java project with a Maven build and a release process |
| `iina/iina` | GPLv3 | none found in the clone | ask first: the pilot branch diverges from the project's own `develop` line |

**The rule that governs all five, whatever their own files say:** no branch is
pushed, no issue is filed, and no maintainer is contacted until the owner says so.
A pilot branch that exists only to make a claim certifiable is not a contribution,
and presenting it as one before the owner has decided is the failure this file
exists to prevent.

## The shared content of every draft

Four lines, because four is what a maintainer can act on in a minute, and a
fifth-paragraph pitch is a sales email wearing a project's clothes.

1. **What the pilot did, in one sentence, naming the application and the revision.**
2. **What it changed**: the contract, the generated sources, the adapter, the
   tests, and nothing else. The list is the same shape for all five so a reader can
   diff two drafts and see that the method is the same.
3. **What it does not claim**, quoted from the pilot's own record. This is the line
   that makes the rest credible and it is the line a maintainer is most likely to
   quote back.
4. **What it would need from them**, stated as a question, because on four of the
   five the honest answer is that we do not know yet.

## Per maintainer, the one thing that differs

| Upstream | The thing that differs | The question to ask |
| --- | --- | --- |
| FSNotes | the pilot is pure Swift and the project already has a test target, so the diff is additive and small | would you take App Intents work at all, and where would it live |
| HandBrake | the app target is 77 `.m` files and no Swift, so the PR adds a bridging header, promotes properties out of class extensions and sets two build settings | the promoted accessors are the real cost to you, not the App Intents: would you rather we opened a small upstream PR for each, or keep them in a branch |
| LuLu | the repository does not contain `Netiquette.app`, so the pilot built it; a PR that does not build is not reviewable | the prebuilt helper is your release step, not a missing file: should the App Intents work land as a PR that assumes the release process, or after the helper is checked in |
| Cyberduck | the model is in the JVM and the integration reads the bookmark files natively, following the precedent of your own Spotlight importer | is reading `.duck` files from the app acceptable to you, or should this go behind a small Java-side bridge that the native side calls instead |
| IINA | the pilot branch is far from `develop` and the identifier is `mpvMd5`, which is stable across a title change and not across a move | the identifier choice is the whole design and it is arguable: is a content hash the right identity for a played item |

## The three that would be refused, and that is fine

**Cyberduck's is the one worth a real answer** rather than a request. The pilot
refused the URL route because it needs the hostname, and it took the document route
because it needs a file path. A maintainer may reasonably say the pilot should not
read the save file at all, and the honest position is that this is the open question
the pilot found rather than a decision the pilot made.

**LuLu's is the one most likely to be refused on scope**, because a generated
App Intents layer is a large change to a security tool and the pilot deliberately
added no write operation to it.

**Transmission's is not a draft at all.** The pilot is blocked: no released cmake
compiles Swift against Xcode 27's `swiftc`, proven from a cmake built from source.
There is nothing to send, and the honest contact is a question about their build
toolchain rather than a pull request.
