import Foundation

/// The cancel flag, shared between the window and the detached run. A box with a
/// lock rather than a property, because the executor reads it from a detached task
/// and a `@MainActor` property cannot be touched from there.
public final class Cancellation: @unchecked Sendable {
    private let lock = NSLock()
    private var flag = false

    public init() {}

    public func request() {
        lock.lock(); flag = true; lock.unlock()
    }

    public func clear() {
        lock.lock(); flag = false; lock.unlock()
    }

    public var isRequested: Bool {
        lock.lock(); defer { lock.unlock() }
        return flag
    }
}
