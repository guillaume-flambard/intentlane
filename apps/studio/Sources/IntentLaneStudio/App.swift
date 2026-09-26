import SwiftUI

// The window is the product's face, so it gets a bundle. `Scripts/build-app.sh`
// assembles this into `IntentLaneStudio.app` next to the engine and the pilot
// manifests, which is what the window loads at runtime.
@main
struct IntentLaneStudioApp: App {
    var body: some Scene {
        WindowGroup {
            StudioView()
        }
        .defaultSize(width: 1000, height: 680)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
