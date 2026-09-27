// swift-tools-version: 6.4
import PackageDescription

// The views live in a library rather than in the executable, so the snapshot tests
// can render the same view code the shipped window runs. A snapshot drawn by a copy
// of the screen would only prove that the copy looks right.
let package = Package(
    name: "IntentLaneStudio",
    platforms: [.macOS(.v27)],
    products: [
        .library(name: "StudioCore", targets: ["StudioCore"]),
        .library(name: "StudioUI", targets: ["StudioUI"]),
        .executable(name: "IntentLaneStudio", targets: ["IntentLaneStudio"])
    ],
    targets: [
        .target(name: "StudioCore"),
        .target(name: "StudioUI", dependencies: ["StudioCore"]),
        .executableTarget(name: "IntentLaneStudio", dependencies: ["StudioCore", "StudioUI"]),
        .testTarget(name: "StudioCoreTests", dependencies: ["StudioCore"]),
        .testTarget(name: "StudioUITests", dependencies: ["StudioCore", "StudioUI"])
    ]
)
