## Why

IntentLane can generate App Intents declarations, but a customer still has to
reverse-engineer the seam between those declarations and the app's own model,
navigation, and refresh lifecycle. The previous NetNewsWire pilot hid that gap
behind a Reader schema. Apple classifies Reader as Shortcuts-only, so it cannot
be used to claim Siri AI discovery.

The default product path must be macOS 27 and iOS 27 Siri AI. It needs a
customer-owned mapping template for entities and an explicit indexing lifecycle.
Automation in Shortcuts is a separate opt-in surface, never a fallback claim.

## What Changes

- Adds an adapter-template generator beside the generated App Intents file.
- Generates a customer-owned Swift seam for entity resolution, app navigation,
  registration, and index upsert/removal hooks.
- Documents `.system.searchInApp` and `.system.open` as the first ASRi package for
  content apps.
- Makes Shortcuts opt-in in product documentation and pilot evidence.
- Adds audit and generator fixtures that distinguish a primary Siri AI schema
  from a Shortcuts-only schema.

## Capabilities

### New Capabilities
- `asri-adapter-templates`: Generated, customer-owned Swift templates that
  leave only the application-specific model mapping and navigation logic to
  implement.

### Modified Capabilities
- `schema-domain-package`: System search/open becomes the first primary ASRi
  domain package. Reader remains an automation-only package.

## Impact

Core IR and validation, Apple Swift generator, CLI generation output, audit
classification, documentation, fixtures, and the NetNewsWire pilot.
