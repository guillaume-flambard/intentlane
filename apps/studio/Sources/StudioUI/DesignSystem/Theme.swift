import SwiftUI

/// The palette, as one value rather than as colours sprinkled through the views. A
/// feature view never names a colour; it names a role, and the role resolves here
/// for the appearance in force.
public struct IntentLaneTheme: Sendable, Equatable {
    public let paper: Color
    public let surface: Color
    public let text: Color
    public let textSecondary: Color
    public let line: Color
    public let signal: Color
    public let signalSoft: Color
    public let route: Color
    public let routeSoft: Color
    public let warning: Color
    public let error: Color

    public init(
        paper: Color,
        surface: Color,
        text: Color,
        textSecondary: Color,
        line: Color,
        signal: Color,
        signalSoft: Color,
        route: Color,
        routeSoft: Color,
        warning: Color,
        error: Color
    ) {
        self.paper = paper
        self.surface = surface
        self.text = text
        self.textSecondary = textSecondary
        self.line = line
        self.signal = signal
        self.signalSoft = signalSoft
        self.route = route
        self.routeSoft = routeSoft
        self.warning = warning
        self.error = error
    }

    /// Light is the identity: ivory paper, graphite text, a cyan that marks a real
    /// signal and nothing else.
    public static let light = IntentLaneTheme(
        paper: Color(hex: 0xF7F8F5),
        surface: Color(hex: 0xFFFFFF),
        text: Color(hex: 0x15191C),
        textSecondary: Color(hex: 0x596168),
        line: Color(hex: 0xDDE2E1),
        signal: Color(hex: 0x39CBB0),
        signalSoft: Color(hex: 0xE8F8F4),
        route: Color(hex: 0x5576E7),
        routeSoft: Color(hex: 0xEEF1FC),
        warning: Color(hex: 0xA66B16),
        error: Color(hex: 0xB34C51)
    )

    /// Dark is near-black graphite, not black, and the cyan lifts a little so it stays
    /// a signal on a dark field without turning into neon.
    public static let dark = IntentLaneTheme(
        paper: Color(hex: 0x121619),
        surface: Color(hex: 0x1B2024),
        text: Color(hex: 0xF1F4F2),
        textSecondary: Color(hex: 0xAAB2B0),
        line: Color(hex: 0x31393B),
        signal: Color(hex: 0x6EE1CB),
        signalSoft: Color(hex: 0x16302B),
        route: Color(hex: 0x7C97F0),
        routeSoft: Color(hex: 0x1C2334),
        warning: Color(hex: 0xD0A05C),
        error: Color(hex: 0xE08A8E)
    )

    public static func resolved(_ scheme: ColorScheme) -> IntentLaneTheme {
        scheme == .dark ? .dark : .light
    }
}

private struct IntentLaneThemeKey: EnvironmentKey {
    static let defaultValue = IntentLaneTheme.light
}

public extension EnvironmentValues {
    var intentLaneTheme: IntentLaneTheme {
        get { self[IntentLaneThemeKey.self] }
        set { self[IntentLaneThemeKey.self] = newValue }
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

/// Apple system typography, named by the role it plays in a screen rather than by
/// its size, so a screen never picks a point value to make something look right.
public enum Type {
    public static let hero = Font.system(size: 34, weight: .semibold)
    public static let title = Font.system(size: 26, weight: .semibold)
    public static let journey = Font.system(size: 18, weight: .medium)
    public static let body = Font.system(size: 14)
    public static let bodyMedium = Font.system(size: 14, weight: .medium)
    public static let action = Font.system(size: 13, weight: .medium)
    public static let metadata = Font.system(size: 11)
    public static let metadataMedium = Font.system(size: 11, weight: .medium)
    public static let mono = Font.system(size: 12, design: .monospaced)
    public static let monoSmall = Font.system(size: 11, design: .monospaced)
}

/// The spacing scale, and the shape of the few surfaces that exist. A gap is chosen
/// from the scale, not measured by eye.
public enum Space {
    public static let s1: CGFloat = 4
    public static let s2: CGFloat = 8
    public static let s3: CGFloat = 12
    public static let s4: CGFloat = 16
    public static let s6: CGFloat = 24
    public static let s8: CGFloat = 32
    public static let s12: CGFloat = 48
    public static let s16: CGFloat = 64
}

public enum Radius {
    public static let control: CGFloat = 8
    public static let card: CGFloat = 12
    public static let surface: CGFloat = 16
    public static let dropZone: CGFloat = 20
}

/// Motion explains what just happened and never performs. With Reduce Motion on,
/// every duration here becomes zero, so a state change is an instant change of state
/// rather than an animation nobody asked for.
public enum Motion {
    public static let interaction: Double = 0.10
    public static let step: Double = 0.16
    public static let route: Double = 0.22
    public static let result: Double = 0.20

    public static func duration(_ base: Double, reduceMotion: Bool) -> Double {
        reduceMotion ? 0 : base
    }
}

/// The one place a view asks which appearance is in force.
public struct Themed<Content: View>: View {
    @Environment(\.colorScheme) private var scheme
    @ViewBuilder let content: (IntentLaneTheme) -> Content

    public init(@ViewBuilder content: @escaping (IntentLaneTheme) -> Content) {
        self.content = content
    }

    public var body: some View {
        let theme = IntentLaneTheme.resolved(scheme)
        content(theme)
            .environment(\.intentLaneTheme, theme)
            .background(theme.paper)
    }
}
