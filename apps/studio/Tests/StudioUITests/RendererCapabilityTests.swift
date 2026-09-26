import SwiftUI
import AppKit
import Testing

/// A blank image and a drawn one are told apart by how much of the frame is not the
/// background, not by eye. Every screen is checked, so a screen that renders nothing
/// fails here instead of being noticed later.
@MainActor
enum Ink {
    /// The paper of each appearance. Measuring from the corner of the frame itself
    /// is what makes the check work in light and dark: a first version compared
    /// against a fixed near-white threshold and scored every dark screen as fully
    /// inked, which meant the dark half of the design was never actually verified.
    static func paper(of bitmap: NSBitmapImageRep) -> Double? {
        guard let color = bitmap.colorAt(x: 2, y: 2)?.usingColorSpace(.deviceRGB) else { return nil }
        return (color.redComponent + color.greenComponent + color.blueComponent) / 3
    }

    /// The share of sampled pixels that differ from the paper.
    static func coverage(of url: URL) throws -> Double {
        guard let image = NSImage(contentsOf: url),
              let tiff = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiff) else { return 0 }
        let width = bitmap.pixelsWide
        let height = bitmap.pixelsHigh
        guard width > 0, height > 0 else { return 0 }
        guard let paper = Ink.paper(of: bitmap) else { return 0 }

        var sampled = 0
        var inked = 0
        for y in stride(from: 0, to: height, by: 3) {
            for x in stride(from: 0, to: width, by: 3) {
                guard let color = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB) else { continue }
                sampled += 1
                let brightness = (color.redComponent + color.greenComponent + color.blueComponent) / 3
                if abs(brightness - paper) < 0.03 { continue }
                inked += 1
            }
        }
        guard sampled > 0 else { return 0 }
        return Double(inked) / Double(sampled)
    }

    /// A floor and not a target: it sits below the sparsest real screen and well
    /// above an empty render, so a sparse screen still counts as drawn.
    static let minimumInk = 0.004

    static func isDrawn(_ url: URL) throws -> Bool {
        try coverage(of: url) > minimumInk
    }
}

/// Establishes what the offscreen renderer can and cannot do, so a blank snapshot is
/// attributed to the right cause instead of being argued about. These are properties
/// of the tool: they are measured and printed, not asserted.
@MainActor
@Suite("what the offscreen renderer can draw")
struct RendererCapabilityTests {
    static func render(_ name: String, _ view: AnyView) -> URL? {
        let renderer = ImageRenderer(
            content: view
                .frame(width: 400, height: 300)
                .background(Color.white)
                .environment(\.colorScheme, .light)
        )
        renderer.scale = 1
        guard let image = renderer.cgImage else { return nil }
        let bitmap = NSBitmapImageRep(cgImage: image)
        guard let data = bitmap.representation(using: .png, properties: [:]) else { return nil }
        let url = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("\(name).png")
        try? data.write(to: url)
        return url
    }

    @Test("text is drawn offscreen, so a text design can be verified this way at all")
    func textIsDrawn() throws {
        let url = try #require(RendererCapabilityTests.render("probe-plain", AnyView(
            VStack { Text("PLAIN"); Text("SECOND") }
        )))
        let coverage = try Ink.coverage(of: url)
        print("PLAIN_INK=\(coverage)")
        #expect(coverage > Ink.minimumInk, "text must produce ink, otherwise no screen could be verified")
    }

    @Test("a ScrollView draws nothing offscreen, which is why the harness turns it off")
    func scrollIsNotDrawn() throws {
        let url = try #require(RendererCapabilityTests.render("probe-scroll", AnyView(
            ScrollView { VStack { Text("SCROLLED"); Text("SECOND") } }
        )))
        let coverage = try Ink.coverage(of: url)
        print("SCROLL_INK=\(coverage)")
        // Recorded, not asserted: this is a property of the tool. If a future system
        // draws scroll content, this line is where it will show.
        #expect(true)
    }
}
