import SwiftUI
import StudioUI

// The window is the product's face, so it gets a bundle. `Scripts/build-app.sh`
// assembles this into `IntentLaneStudio.app` next to the engine and the pilot
// manifests, which is what the window loads at runtime. The screens themselves live
// in StudioUI so the snapshot tests can render the same view code.
@main
struct IntentLaneStudioApp: App {
    var body: some Scene {
        WindowGroup {
            StudioView()
        }
        .defaultSize(width: 1280, height: 820)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
