## Context

Apple schemas define what the system can understand. They cannot reveal an
application's private data model, routes, or refresh events. IntentLane must
generate stable Apple-facing declarations while the customer owns the small
adapter that maps its models into those declarations.

## Goals

- Generate a Swift adapter template for every entity-backed ASRi contract.
- Make the required customer work explicit: entity lookup, suggestions,
  navigation, and index lifecycle calls.
- Keep generated code deterministic and safe to overwrite.
- Use `.system.searchInApp` and `.system.open` for the first content-app pilot.
- Keep Shortcuts absent unless the contract explicitly asks for it.

## Non-goals

- Infer a customer's persistence layer, UI architecture, or feed lifecycle.
- Generate a fictitious implementation that compiles but silently returns no
  content.
- Present a Shortcuts-only schema as Siri AI support.

## Design

`intentlane generate` continues to emit the deterministic Apple declarations.
When passed an adapter output path, it also emits a separate Swift template.
The template is customer-owned and is never overwritten by a normal generated
file update.

For each entity, the template provides a resolver implementation skeleton with
four marked seams:

1. map stable app identifiers to generated entities;
2. return suggested entities without exposing private data by default;
3. publish changed entities to the generated indexing hook after the app's
   refresh, update, and delete events;
4. navigate to a selected entity using the app's own routing mechanism.

The generated declarations own protocol shapes and registration holders. The
template owns imports from the customer application and all calls into its
database, model, and UI. This keeps regeneration safe and makes code review
local to the customer-owned file.

## Safety

Indexing is opt-in and must use the app's privacy policy. The template indexes
only entities explicitly passed by the customer. It does not enumerate a store,
send data off-device, or add a mutation intent. A missing mapping returns no
entities during development tests rather than matching a similarly named item.

## Verification

- Unit tests assert the generated adapter template contains every required
  seam and does not emit Shortcuts unless asked.
- A macOS fixture compiles the generated declarations and a completed adapter.
- `AppIntentsTesting` covers Alpha resolution, Alpha opening, and an invented
  title that never resolves to Gamma.
- A manual Spotlight and Siri AI test records OS build and locale in the
  evidence ledger.
