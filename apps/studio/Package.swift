// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "IntentLaneStudio",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "StudioCore", targets: ["StudioCore"]),
        .executable(name: "IntentLaneStudio", targets: ["IntentLaneStudio"])
    ],
    targets: [
        .target(name: "StudioCore"),
        .executableTarget(name: "IntentLaneStudio", dependencies: ["StudioCore"]),
        .testTarget(name: "StudioCoreTests", dependencies: ["StudioCore"])
    ]
)
