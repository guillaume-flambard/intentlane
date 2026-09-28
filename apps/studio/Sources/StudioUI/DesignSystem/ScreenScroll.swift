import SwiftUI

/// Scrolls when the window is short, and does not exist when nothing needs it.
///
/// The offscreen renderer the snapshots use cannot lay out a `ScrollView`: it draws
/// the container and drops the content. A screen that is only ever verified through
/// that renderer would be verified as an empty page, so the container is named here
/// and can be replaced by a plain stack for rendering, leaving the shipped screen
/// scrolling exactly as before.
public struct ScreenScroll<Content: View>: View {
    @Environment(\.intentLaneScreenScrolls) private var scrolls
    /// A document can be wider than the window, as Markdown tables and long evidence
    /// lines are. A screen that only scrolled vertically would clip the right-hand
    /// end of a line, and a deliverable with a clipped score is a deliverable a
    /// reader misreads.
    let axes: Axis.Set
    @ViewBuilder let content: Content

    public init(_ axes: Axis.Set = .vertical, @ViewBuilder content: () -> Content) {
        self.axes = axes
        self.content = content()
    }

    public var body: some View {
        if scrolls {
            ScrollView(axes) { content }
        } else {
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

private struct ScreenScrollsKey: EnvironmentKey {
    static let defaultValue = true
}

public extension EnvironmentValues {
    /// Whether screens scroll. True in the window, false when a renderer has to draw
    /// the same content without a scroll container.
    var intentLaneScreenScrolls: Bool {
        get { self[ScreenScrollsKey.self] }
        set { self[ScreenScrollsKey.self] = newValue }
    }
}

public extension View {
    /// The content of a screen, wrapped for whichever container is in force.
    func screenScroll<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        ScreenScroll(content: content)
    }
}
