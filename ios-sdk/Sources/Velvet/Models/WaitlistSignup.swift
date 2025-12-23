//
//  WaitlistSignup.swift
//  Velvet iOS SDK
//
//  Model representing a waitlist signup entry.
//

import Foundation

/// Status of a waitlist signup
public enum SignupStatus: String, Codable, Sendable {
    case waiting
    case verified
    case admitted
}

/// Represents a user's signup on the waitlist
public struct WaitlistSignup: Codable, Identifiable, Sendable {
    
    /// Unique identifier for this signup
    public let id: String
    
    /// Email address of the signup
    public let email: String
    
    /// Unique referral code for sharing
    public let referralCode: String
    
    /// Current position in the waitlist queue
    public let position: Int
    
    /// Number of successful referrals
    public let referralCount: Int
    
    /// Priority score (higher = closer to front)
    public let priority: Int
    
    /// Current status of this signup
    public let status: SignupStatus
    
    /// Generate a shareable referral link
    public var referralLink: URL? {
        guard let waitlistId = Velvet.shared.waitlistId else { return nil }
        return URL(string: "https://velvetapi.com/join/\(waitlistId)?ref=\(referralCode)")
    }
    
    /// Initialize a WaitlistSignup
    public init(
        id: String,
        email: String,
        referralCode: String,
        position: Int,
        referralCount: Int,
        priority: Int,
        status: SignupStatus
    ) {
        self.id = id
        self.email = email
        self.referralCode = referralCode
        self.position = position
        self.referralCount = referralCount
        self.priority = priority
        self.status = status
    }
}
