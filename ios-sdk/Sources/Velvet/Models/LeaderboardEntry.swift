//
//  LeaderboardEntry.swift
//  Velvet iOS SDK
//
//  Model representing a leaderboard entry.
//

import Foundation

/// An entry in the waitlist referral leaderboard
public struct LeaderboardEntry: Codable, Identifiable, Sendable {
    
    /// Rank position (1 = top)
    public let rank: Int
    
    /// Masked email for privacy (e.g., "joh***@example.com")
    public let email: String
    
    /// Number of successful referrals
    public let referralCount: Int
    
    /// Priority score
    public let priority: Int
    
    /// Identifiable conformance
    public var id: Int { rank }
    
    public init(rank: Int, email: String, referralCount: Int, priority: Int) {
        self.rank = rank
        self.email = email
        self.referralCount = referralCount
        self.priority = priority
    }
}
