//
//  WaitlistStatusView.swift
//  Velvet iOS SDK
//
//  View for checking status of an existing signup.
//

import SwiftUI

/// A view for users to check their waitlist status using their referral code.
public struct WaitlistStatusView: View {
    
    @StateObject private var viewModel = WaitlistViewModel()
    @State private var referralCode: String = ""
    @State private var copied = false
    
    public init() {}
    
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
                    
                    switch viewModel.state {
                    case .idle, .loading, .error:
                        checkFormContent
                    case .success(let signup):
                        statusContent(signup: signup)
                    }
                    
                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 24)
            }
        }
    }
    
    // MARK: - Check Form
    
    private var checkFormContent: some View {
        VStack(spacing: 24) {
            // Icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.orange, Color.pink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 36))
                    .foregroundColor(.white)
            }
            
            // Title
            VStack(spacing: 8) {
                Text("Check Your Status")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)
                
                Text("Enter your referral code to see your position")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
            }
            
            // Input and button
            VStack(spacing: 16) {
                TextField("Enter your referral code", text: $referralCode)
                    .textFieldStyle(.plain)
                    .padding()
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(12)
                    .foregroundColor(.white)
                    #if os(iOS)
                    .textInputAutocapitalization(.never)
                    #endif
                    .autocorrectionDisabled()
                    .disabled(viewModel.isLoading)
                
                Button(action: {
                    Task {
                        await viewModel.checkStatus(referralCode: referralCode)
                    }
                }) {
                    HStack(spacing: 8) {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Check Status")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [Color.orange, Color.pink],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(12)
                    .foregroundColor(.white)
                }
                .disabled(viewModel.isLoading || referralCode.isEmpty)
            }
            
            // Error message
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.footnote)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }
        }
    }
    
    // MARK: - Status Content
    
    private func statusContent(signup: WaitlistSignup) -> some View {
        VStack(spacing: 24) {
            // Status badge
            HStack(spacing: 8) {
                Circle()
                    .fill(statusColor(for: signup.status))
                    .frame(width: 12, height: 12)
                
                Text(statusText(for: signup.status))
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.white.opacity(0.1))
            .cornerRadius(20)
            
            // Email
            Text(signup.email)
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))
            
            // Stats
            HStack(spacing: 16) {
                statCard(title: "Position", value: "#\(signup.position)")
                statCard(title: "Referrals", value: "\(signup.referralCount)")
            }
            
            // Priority score
            VStack(spacing: 4) {
                Text("\(signup.priority)")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(.white)
                
                Text("Priority Score")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .background(
                LinearGradient(
                    colors: [Color.purple.opacity(0.3), Color.blue.opacity(0.3)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            
            // Referral link
            if let link = signup.referralLink {
                VStack(spacing: 12) {
                    Text("Your Referral Link")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                    
                    HStack {
                        Text(link.absoluteString)
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
            }
            
            // Check again button
            Button(action: {
                viewModel.reset()
                referralCode = ""
            }) {
                Text("Check Another Code")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.white.opacity(0.15))
                    .cornerRadius(12)
                    .foregroundColor(.white)
            }
        }
    }
    
    // MARK: - Helpers
    
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
    
    private func statusColor(for status: SignupStatus) -> Color {
        switch status {
        case .waiting:
            return .yellow
        case .verified:
            return .blue
        case .admitted:
            return .green
        }
    }
    
    private func statusText(for status: SignupStatus) -> String {
        switch status {
        case .waiting:
            return "Waiting"
        case .verified:
            return "Verified"
        case .admitted:
            return "Admitted"
        }
    }
}

// MARK: - Preview

#if DEBUG
struct WaitlistStatusView_Previews: PreviewProvider {
    static var previews: some View {
        WaitlistStatusView()
    }
}
#endif
