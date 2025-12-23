//
//  WaitlistViewModel.swift
//  Velvet iOS SDK
//
//  Shared business logic for waitlist operations.
//

import Foundation
import SwiftUI

/// View state for the waitlist flow
public enum WaitlistViewState: Equatable {
    case idle
    case loading
    case success(WaitlistSignup)
    case error(String)
    
    public static func == (lhs: WaitlistViewState, rhs: WaitlistViewState) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle), (.loading, .loading):
            return true
        case (.success(let a), .success(let b)):
            return a.referralCode == b.referralCode
        case (.error(let a), .error(let b)):
            return a == b
        default:
            return false
        }
    }
}

/// ViewModel for managing waitlist operations
@MainActor
public final class WaitlistViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    /// Current email input
    @Published public var email: String = ""
    
    /// Current view state
    @Published public var state: WaitlistViewState = .idle
    
    /// Waitlist info (name, total signups, etc.)
    @Published public var waitlistInfo: WaitlistInfo?
    
    /// Leaderboard entries
    @Published public var leaderboard: [LeaderboardEntry] = []
    
    // MARK: - Properties
    
    /// Optional referral code from a referral link
    public var referralCode: String?
    
    /// Whether currently loading
    public var isLoading: Bool {
        state == .loading
    }
    
    /// The signup from a successful join
    public var signup: WaitlistSignup? {
        if case .success(let signup) = state {
            return signup
        }
        return nil
    }
    
    /// Error message if in error state
    public var errorMessage: String? {
        if case .error(let message) = state {
            return message
        }
        return nil
    }
    
    // MARK: - Private
    
    private let apiClient = WaitlistAPIClient.shared
    
    // MARK: - Init
    
    public init(referralCode: String? = nil) {
        self.referralCode = referralCode
    }
    
    // MARK: - Public Methods
    
    /// Join the waitlist with the current email
    public func joinWaitlist() async {
        guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            state = .error("Please enter your email")
            return
        }
        
        state = .loading
        
        do {
            let signup = try await apiClient.joinWaitlist(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                referralCode: referralCode
            )
            state = .success(signup)
        } catch let error as VelvetError {
            switch error {
            case .alreadyRegistered(let existingSignup):
                // Treat as success - show their existing signup
                state = .success(existingSignup)
            default:
                state = .error(error.localizedDescription)
            }
        } catch {
            state = .error(error.localizedDescription)
        }
    }
    
    /// Check status using a referral code
    public func checkStatus(referralCode: String) async {
        state = .loading
        
        do {
            let signup = try await apiClient.checkStatus(referralCode: referralCode)
            state = .success(signup)
        } catch let error as VelvetError {
            state = .error(error.localizedDescription)
        } catch {
            state = .error(error.localizedDescription)
        }
    }
    
    /// Load waitlist info
    public func loadWaitlistInfo() async {
        do {
            waitlistInfo = try await apiClient.getWaitlistInfo()
        } catch {
            print("[Velvet] Failed to load waitlist info: \(error)")
        }
    }
    
    /// Load leaderboard
    public func loadLeaderboard(limit: Int = 10) async {
        do {
            leaderboard = try await apiClient.getLeaderboard(limit: limit)
        } catch {
            print("[Velvet] Failed to load leaderboard: \(error)")
        }
    }
    
    /// Reset to initial state
    public func reset() {
        email = ""
        state = .idle
    }
    
    /// Copy referral link to clipboard
    public func copyReferralLink() {
        guard let signup = signup, let link = signup.referralLink else { return }
        #if os(iOS)
        UIPasteboard.general.string = link.absoluteString
        #elseif os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(link.absoluteString, forType: .string)
        #endif
    }
    
    /// Share referral link (iOS only)
    @available(iOS 15.0, *)
    public func shareReferralLink() -> URL? {
        signup?.referralLink
    }
}
