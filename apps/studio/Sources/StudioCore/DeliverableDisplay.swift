import Foundation

/// What the window shows of the deliverable.
///
/// Three states and a string, and nothing else. A type that could hold a rendered
/// document would be a document the window composed, which is the one thing this
/// surface must never do: the engine renders it, the window reads it.
public enum DeliverableDisplay: Sendable, Equatable {
    /// There is no document yet. Not an empty one: nothing is shown.
    case absent
    /// The engine was asked and said no. The reason is its own words.
    case failed(String)
    /// The engine's document, verbatim.
    case ready(String)
}
