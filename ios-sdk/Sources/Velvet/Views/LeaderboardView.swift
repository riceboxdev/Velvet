//
//  LeaderboardView.swift
//  Velvet iOS SDK
//
//  View displaying the referral leaderboard.
//

import SwiftUI

/// A view displaying the waitlist referral leaderboard.
public struct LeaderboardView: View {
    
    @StateObject private var viewModel = WaitlistViewModel()
    
    /// Number of entries to display
    private let limit: Int
    
    /// Initialize the leaderboard view
    /// - Parameter limit: Maximum number of entries to show (default: 10)
    public init(limit: Int = 10) {
        self.limit = limit
    }
    
    public var body: some View {
        ZStack {
            // Background
            Color(red: 0.05, green: 0.05, blue: 0.1)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.yellow)
                    
                    Text("Leaderboard")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("Top referrers move up the queue faster!")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.6))
                }
                .padding(.vertical, 24)
                
                // List
                if viewModel.leaderboard.isEmpty {
                    Spacer()
                    
                    VStack(spacing: 12) {
                        Image(systemName: "person.3.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.white.opacity(0.3))
                        
                        Text("No entries yet")
                            .font(.headline)
                            .foregroundColor(.white.opacity(0.5))
                        
                        Text("Be the first to refer friends!")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.3))
                    }
                    
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(viewModel.leaderboard) { entry in
                                leaderboardRow(entry: entry)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 24)
                    }
                }
            }
        }
        .task {
            await viewModel.loadLeaderboard(limit: limit)
        }
    }
    
    // MARK: - Row View
    
    private func leaderboardRow(entry: LeaderboardEntry) -> some View {
        HStack(spacing: 16) {
            // Rank
            ZStack {
                if entry.rank <= 3 {
                    Circle()
                        .fill(rankGradient(for: entry.rank))
                        .frame(width: 40, height: 40)
                } else {
                    Circle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 40, height: 40)
                }
                
                Text("\(entry.rank)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }
            
            // Email
            Text(entry.email)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.9))
                .lineLimit(1)
            
            Spacer()
            
            // Referral count
            HStack(spacing: 4) {
                Image(systemName: "person.badge.plus")
                    .font(.caption)
                
                Text("\(entry.referralCount)")
                    .font(.subheadline.weight(.semibold))
            }
            .foregroundColor(.white.opacity(0.7))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(entry.rank <= 3 ? 0.1 : 0.05))
        )
    }
    
    private func rankGradient(for rank: Int) -> LinearGradient {
        switch rank {
        case 1:
            return LinearGradient(
                colors: [Color.yellow, Color.orange],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case 2:
            return LinearGradient(
                colors: [Color.gray.opacity(0.8), Color.gray],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case 3:
            return LinearGradient(
                colors: [Color.orange.opacity(0.7), Color.brown],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        default:
            return LinearGradient(
                colors: [Color.white.opacity(0.1), Color.white.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

// MARK: - Preview

#if DEBUG
struct LeaderboardView_Previews: PreviewProvider {
    static var previews: some View {
        LeaderboardView()
    }
}
#endif
