//
//  RegistrationCheck.swift
//  Velvet iOS SDK
//
//  Model for checking if an email is already registered.
//

import Foundation

/// Result of checking if an email is registered on the waitlist
public struct RegistrationCheck: Codable, Sendable {
    
    /// Whether the email is registered
    public let registered: Bool
    
    /// Signup data if registered
    public let data: RegistrationData?
    
    public init(registered: Bool, data: RegistrationData? = nil) {
        self.registered = registered
        self.data = data
    }
}

/// Registration data returned when checking an existing signup
public struct RegistrationData: Codable, Sendable {
    
    /// Referral code
    public let referralCode: String
    
    /// Number of referrals
    public let referralCount: Int
    
    /// Current position
    public let currentPosition: Int
    
    /// Status
    public let status: String
    
    public init(referralCode: String, referralCount: Int, currentPosition: Int, status: String) {
        self.referralCode = referralCode
        self.referralCount = referralCount
        self.currentPosition = currentPosition
        self.status = status
    }
}
