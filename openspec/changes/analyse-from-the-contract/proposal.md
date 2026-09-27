# analyse from the contract

## Why

The object motif answers a question the contract has already answered. It was written
against IINA, proved on IINA, and run on the other pilots; on FSNotes it finds object
classes and then reports that none of them is actionable.

Measured on the FSNotes working copy at `11b11e529722`, with the discovery probe:

- `SidebarOutlineView` holds `SidebarItem`, `Project`, `SidebarCellView`, and none of
  them yields an identifier, because `identifiersOf` requires a member to sit at exactly
  `declarationIndent + 2`. Swift indents members at four, so a conventionally written
  file yields nothing. The fixtures in `discovery.test.ts` are written at two.
- The opener motif matches `openURL(` in the object's own file. That string occurs zero
  times in the whole repository.
- The identifier this pilot actually uses is `project.getMd5CheckSum()`, a method, and
  the opening path is `sidebar.selectRowIndexes`, a selection call. Neither is a String
  property, and neither opens a URL.

So the block is not FSNotes failing to be integrable. It is the motif being asked to
rediscover, by regex, a decision that was written down. `pilots/fsnotes/contract.yaml`
already names `identifier: id`, `display.title: title`, and the intent
`open_notebook` already carries `schema: system.open` with `target: notebook`. The
proposal for the motif fix says as much: choosing between actionable candidates is the
decision stage, and the contract is where that choice is recorded when a pilot has one.

The chain the contract implies is present in the working copy and each link has a file
and a line:

1. `struct OpenNotebook: OpenIntent` in `IntentLaneGenerated.swift`, the conformer for
   `schema: system.open`.
2. `IntentLaneIntentHandlers.open_notebook`, the handler the intent looks up.
3. `await opener.open(record.id)` in `NotebookHandlers.swift:56`, which passes the
   contract's own identifier field.
4. `func open(_ id: String)` in `NotebookIntegration.swift`, whose body reaches the
   application: `sidebar.selectRowIndexes`.

A generic motif cannot see that chain. A check written against the contract can.

## What Changes

- When a pilot declares a contract, `analyse` reads the seams from the contract instead
  of from the motif: the identifier field it names, the display title it names, and an
  opening implementation that is reached with that identifier.
- Every seam still has to be backed by a path, a line and an excerpt. No proof, no pass.
- A contract whose record type does not carry the field it names is blocked, and the
  diagnostic names the field. That is a stronger answer than "no object class was found".
- Without a contract the motif runs exactly as it does today.

## What this does not do

- It does not change what an actionable object is. An identifier and an opening path
  remain the rule; this changes where they are read from when a document names them.
- It does not make a pilot pass whose implementation does not carry the contract's
  fields. The proof requirement is unchanged and a missing field blocks.
- It does not remove the motif. A repository with no contract still has to be discovered,
  and the discovery is still written to `discovery.json` either way, because it is what
  the application offers rather than what the pilot claims.
