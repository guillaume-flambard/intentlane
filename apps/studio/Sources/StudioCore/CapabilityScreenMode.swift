import Foundation

/// The state the Capabilities screen renders. Decided by the model and not by the
/// view, so the reason a tree is absent is one string the tests can assert instead
/// of a branch a reader of the window has to infer.
public enum CapabilityScreenMode: Equatable, Sendable {
    /// No tree, and the stated reason there is none.
    case empty(String)
    /// An audit is being read right now.
    case reading
    /// The tree the report produced, verbatim.
    case tree(CapabilityTree)
}
