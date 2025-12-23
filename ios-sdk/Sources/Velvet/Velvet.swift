//
//  Velvet.swift
//  Velvet iOS SDK
//
//  Main entry point for the Velvet waitlist SDK.
//

import Foundation

/// Main configuration class for the Velvet SDK.
/// Configure once at app launch with your waitlist ID.
public final class Velvet {
    
    // MARK: - Singleton
    
    /// Shared instance of the Velvet SDK
    public static let shared = Velvet()
    
    // MARK: - Configuration
    
    /// Hardcoded API base URL - developers cannot change this
    internal let apiBaseURL = "https://velvetapi.com"
    
    /// The configured waitlist ID
    public private(set) var waitlistId: String?
    
    /// Whether the SDK has been configured
    public var isConfigured: Bool {
        waitlistId != nil
    }
    
    // MARK: - Private Init
    
    private init() {}
    
    // MARK: - Public API
    
    /// Configure the Velvet SDK with your waitlist ID.
    /// Call this once at app launch, typically in your App's init.
    ///
    /// ```swift
    /// @main
    /// struct MyApp: App {
    ///     init() {
    ///         Velvet.configure(waitlistId: "your-waitlist-id")
    ///     }
    /// }
    /// ```
    ///
    /// - Parameter waitlistId: Your unique waitlist identifier from the Velvet dashboard
    public static func configure(waitlistId: String) {
        shared.waitlistId = waitlistId
        print("[Velvet] Configured with waitlist: \(waitlistId)")
    }
    
    /// Reset the SDK configuration. Primarily for testing.
    internal func reset() {
        waitlistId = nil
    }
}
