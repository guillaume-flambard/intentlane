import Testing
import Foundation
@testable import StudioCore

/// What the application claims about itself, read from the files that make the
/// claim, so a promise the app cannot keep is a failing test rather than a
/// surprise a reader finds in the bundle.
///
/// These are the two checks the app failed before this change: a floor three
/// generations old, and a localization it announced and never spoke.
struct AppSurfaceTests {
    /// The package root, found from `#filePath` because `swift test` may run from
    /// anywhere and the working directory is not the package.
    private static let packageRoot = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()   // StudioUITests
        .deletingLastPathComponent()   // Tests
        .deletingLastPathComponent()   // studio

    private static var sourcesText: String {
        var text = ""
        let enumerator = FileManager.default.enumerator(
            at: packageRoot.appendingPathComponent("Sources"),
            includingPropertiesForKeys: nil
        )
        while let url = enumerator?.nextObject() as? URL {
            guard url.pathExtension == "swift" else { continue }
            text += (try? String(contentsOf: url, encoding: .utf8)) ?? ""
        }
        return text
    }

    private static func infoPlist() throws -> [String: Any] {
        let data = try Data(contentsOf: Self.packageRoot.appendingPathComponent("Resources/Info.plist"))
        return try #require(PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any])
    }

    @Test("the declared platform floor and the bundle's floor are the same release")
    func platformFloorIsDeclaredOnce() throws {
        let manifest = try String(contentsOf: Self.packageRoot.appendingPathComponent("Package.swift"), encoding: .utf8)

        let platformsLine = try #require(
            manifest.split(separator: "\n").first { $0.contains("platforms:") },
            "Package.swift no longer declares a macOS platform, so the floor is unstated"
        )
        let packageFloor = try #require(
            Int(platformsLine.split(separator: ".v").last!.prefix(while: { $0.isNumber })),
            "the package platform could not be read from: \(platformsLine)"
        )

        let plist = try Self.infoPlist()
        let bundleFloor = try #require(
            (plist["LSMinimumSystemVersion"] as? String).flatMap { Int($0.prefix(while: { $0.isNumber })) },
            "Info.plist declares no LSMinimumSystemVersion, so the bundle's floor is unstated"
        )

        #expect(
            packageFloor == bundleFloor,
            "Package.swift says macOS \(packageFloor) and Info.plist says \(bundleFloor); an app cannot have two floors"
        )
        // `glassEffect` and the current visual language arrived in macOS 26, and the
        // app uses them on its functional layer, so a floor below that is a floor
        // the app cannot honour on every machine it claims to support.
        #expect(
            packageFloor >= 26,
            "the floor is macOS \(packageFloor): the functional layer uses APIs that need 26"
        )
    }

    @Test("the app declares only the languages it speaks")
    func localizationClaimIsTrue() throws {
        let plist = try Self.infoPlist()
        let declared = plist["CFBundleLocalizations"] as? [String] ?? []

        for language in declared {
            let directory = Self.packageRoot.appendingPathComponent("Resources/\(language).lproj")
            #expect(
                FileManager.default.fileExists(atPath: directory.path),
                "the bundle declares \(language) and no \(language).lproj exists to speak it"
            )
        }

        // Every key a declared language carries must be a string the views really
        // use. A key no source mentions is a promise from a design that no longer
        // exists, and the app is still shipping it.
        let source = Self.sourcesText
        var orphans: [String] = []
        for language in declared {
            let strings = Self.packageRoot.appendingPathComponent("Resources/\(language).lproj/Localizable.strings")
            guard let text = try? String(contentsOf: strings, encoding: .utf8) else { continue }
            for line in text.split(separator: "\n") {
                guard let raw = line.split(separator: " = ").first.map(String.init) else { continue }
                let key = raw.trimmingCharacters(in: CharacterSet(charactersIn: "\" "))
                guard !key.isEmpty else { continue }
                if !source.contains(key) { orphans.append("\(language): \(key)") }
            }
        }
        #expect(
            orphans.isEmpty,
            "these declared strings are used by no screen, so the app ships a promise it does not keep: \(orphans.joined(separator: " | "))"
        )
    }
}
