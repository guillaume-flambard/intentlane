# Platform coverage and proof matrix

IntentLane shares a contract, entities and most business mapping across Apple
platforms. It does not treat a successful build on one platform as proof on
another.

| Surface | Reusable layer | Platform-specific work | Proof needed |
| --- | --- | --- | --- |
| macOS 27 | App schemas, entities, Spotlight lifecycle | AppKit navigation and Mac URL handoff | Local build, Spotlight and manual Siri AI test |
| iPhone and iPad on iOS 27 | Same schemas, entities and core mapping | UIKit/SwiftUI navigation and scene handoff | iPhone test; iPad layout and Siri test before an iPad claim |
| AirPods | The host app's intent | No AirPods app or separate adapter | Speak through AirPods to the paired iPhone or Mac and record the host result |
| Apple Watch | Generic App Intents where available | Separate watch UX and limited action design | Simulator for build/tests, physical Watch for voice, microphone and Bluetooth proof |
| visionOS or tvOS | Nothing is assumed from another platform | SDK availability and product design review | A separate feasibility audit |

The macOS 27 System schemas used by the content pilot are
`.system.searchInApp` and `.system.open`. iPhone and iPad are the next
supported proof target. `searchInApp` is unavailable on watchOS in the current
SDK, so Watch is not included in the first offer.

An iPhone plus AirPods is sufficient for the first mobile voice proof. An iPad
is not required to build the shared iOS layer, but it is required before
claiming an iPad-validated experience.
