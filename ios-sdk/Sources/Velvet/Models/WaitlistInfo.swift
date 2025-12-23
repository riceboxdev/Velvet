//
//  WaitlistInfo.swift
//  Velvet iOS SDK
//
//  Model representing waitlist metadata and branding.
//

import Foundation

/// Branding settings for the waitlist
public struct WaitlistBranding: Codable, Sendable {
    
    /// Primary brand color (hex format)
    public let primaryColor: String?
    
    /// Secondary brand color (hex format)
    public let secondaryColor: String?
    
    /// Logo URL
    public let logoUrl: String?
    
    /// Custom widget title
    public let widgetTitle: String?
    
    /// Custom success title
    public let successTitle: String?
    
    /// Custom button text
    public let buttonText: String?
    
    public init(
        primaryColor: String? = nil,
        secondaryColor: String? = nil,
        logoUrl: String? = nil,
        widgetTitle: String? = nil,
        successTitle: String? = nil,
        buttonText: String? = nil
    ) {
        self.primaryColor = primaryColor
        self.secondaryColor = secondaryColor
        self.logoUrl = logoUrl
        self.widgetTitle = widgetTitle
        self.successTitle = successTitle
        self.buttonText = buttonText
    }
}

/// Public settings for the waitlist
public struct WaitlistSettings: Codable, Sendable {
    
    /// Branding customization
    public let branding: WaitlistBranding?
    
    /// Whether the leaderboard is visible
    public let showLeaderboard: Bool?
    
    public init(branding: WaitlistBranding? = nil, showLeaderboard: Bool? = nil) {
        self.branding = branding
        self.showLeaderboard = showLeaderboard
    }
}

/// Information about a waitlist
public struct WaitlistInfo: Codable, Identifiable, Sendable {
    
    /// Unique identifier
    public let id: String
    
    /// Waitlist name
    public let name: String
    
    /// Description
    public let description: String?
    
    /// Total number of signups
    public let totalSignups: Int?
    
    /// Whether the waitlist is accepting new signups
    public let isActive: Bool?
    
    /// Public settings
    public let settings: WaitlistSettings?
    
    public init(
        id: String,
        name: String,
        description: String? = nil,
        totalSignups: Int? = nil,
        isActive: Bool? = nil,
        settings: WaitlistSettings? = nil
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.totalSignups = totalSignups
        self.isActive = isActive
        self.settings = settings
    }
}
