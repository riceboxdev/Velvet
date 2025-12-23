//
//  WaitlistView.swift
//  Velvet iOS SDK
//
//  Default waitlist join form with success state.
//

import SwiftUI

/// The main waitlist view with a default, beautiful UI.
/// Shows a join form, then success state with position and referral link.
public struct WaitlistView: View {
    
    @StateObject private var viewModel: WaitlistViewModel
    @State private var copied = false
    
    /// Initialize the waitlist view
    /// - Parameter referralCode: Optional referral code if user came from a referral link
    public init(referralCode: String? = nil) {
        _viewModel = StateObject(wrappedValue: WaitlistViewModel(referralCode: referralCode))
    }
    
    public var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.15),
                    Color(red: 0.05, green: 0.05, blue: 0.1)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 32) {
                    Spacer(minLength: 40)
                    
                    // Content based on state
                    switch viewModel.state {
                    case .idle, .loading, .error:
                        joinFormContent
                    case .success(let signup):
                        successContent(signup: signup)
                    }
                    
                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 24)
            }
        }
        .task {
            await viewModel.loadWaitlistInfo()
        }
    }
    
    // MARK: - Join Form
    
    private var joinFormContent: some View {
        VStack(spacing: 24) {
            // Logo/Icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.purple, Color.blue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                
                Image(systemName: "sparkles")
                    .font(.system(size: 36))
                    .foregroundColor(.white)
            }
            
            // Title
            VStack(spacing: 8) {
                Text(viewModel.waitlistInfo?.settings?.branding?.widgetTitle ?? "Join the Waitlist")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                
                if let name = viewModel.waitlistInfo?.name {
                    Text("Be the first to access \(name)")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                }
            }
            
            // Email input and button
            VStack(spacing: 16) {
                TextField("Enter your email", text: $viewModel.email)
                    .textFieldStyle(.plain)
                    .padding()
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(12)
                    .foregroundColor(.white)
                    #if os(iOS)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    #endif
                    .autocorrectionDisabled()
                    .disabled(viewModel.isLoading)
                
                Button(action: {
                    Task {
                        await viewModel.joinWaitlist()
                    }
                }) {
                    HStack(spacing: 8) {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text(viewModel.waitlistInfo?.settings?.branding?.buttonText ?? "Join Waitlist")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [Color.purple, Color.blue],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(12)
                    .foregroundColor(.white)
                }
                .disabled(viewModel.isLoading)
            }
            
            // Error message
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.footnote)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }
            
            // Referral badge
            if viewModel.referralCode != nil {
                HStack(spacing: 6) {
                    Image(systemName: "person.badge.plus")
                    Text("Referred by a friend")
                }
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
            }
            
            // Total signups
            if let total = viewModel.waitlistInfo?.totalSignups, total > 0 {
                HStack(spacing: 6) {
                    Image(systemName: "person.2.fill")
                    Text("\(total.formatted()) people already on the list")
                }
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
            }
        }
    }
    
    // MARK: - Success State
    
    private func successContent(signup: WaitlistSignup) -> some View {
        VStack(spacing: 24) {
            // Success icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.green, Color.teal],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                
                Image(systemName: "checkmark")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
            }
            
            // Title
            VStack(spacing: 8) {
                Text(viewModel.waitlistInfo?.settings?.branding?.successTitle ?? "You're on the list!")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)
                
                if let name = viewModel.waitlistInfo?.name {
                    Text("Thanks for joining \(name)")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            
            // Stats cards
            HStack(spacing: 16) {
                statCard(title: "Position", value: "#\(signup.position)")
                statCard(title: "Referrals", value: "\(signup.referralCount)")
            }
            
            // Referral section
            VStack(spacing: 12) {
                HStack(spacing: 6) {
                    Image(systemName: "gift.fill")
                    Text("Share to move up the list!")
                }
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
                
                // Referral link
                HStack {
                    Text(signup.referralLink?.absoluteString ?? "")
                        .font(.footnote)
                        .foregroundColor(.white.opacity(0.8))
                        .lineLimit(1)
                        .truncationMode(.middle)
                    
                    Spacer()
                    
                    Button(action: {
                        viewModel.copyReferralLink()
                        copied = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            copied = false
                        }
                    }) {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.white.opacity(0.2))
                            .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color.white.opacity(0.1))
                .cornerRadius(12)
            }
            
            // Share button
            if let url = signup.referralLink {
                if #available(iOS 16.0, macOS 13.0, *) {
                    ShareLink(item: url) {
                        HStack(spacing: 8) {
                            Image(systemName: "square.and.arrow.up")
                            Text("Share")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white.opacity(0.15))
                        .cornerRadius(12)
                        .foregroundColor(.white)
                    }
                } else {
                    // Fallback for older OS versions
                    Button(action: {
                        viewModel.copyReferralLink()
                        copied = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            copied = false
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "square.and.arrow.up")
                            Text("Copy & Share")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white.opacity(0.15))
                        .cornerRadius(12)
                        .foregroundColor(.white)
                    }
                }
            }
        }
    }
    
    // MARK: - Helper Views
    
    private func statCard(title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(.white)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
                .textCase(.uppercase)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color.white.opacity(0.1))
        .cornerRadius(16)
    }
}

// MARK: - Preview

#if DEBUG
struct WaitlistView_Previews: PreviewProvider {
    static var previews: some View {
        WaitlistView()
    }
}
#endif
