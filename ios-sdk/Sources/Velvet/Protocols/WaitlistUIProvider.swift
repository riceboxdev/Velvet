//
//  WaitlistUIProvider.swift
//  Velvet iOS SDK
//
//  Protocol for creating custom waitlist UI.
//

import SwiftUI

/// Protocol for providing custom UI components for the waitlist flow.
/// Implement this protocol to completely customize the look and feel
/// while keeping all the business logic handled by the SDK.
public protocol WaitlistUIProvider {
    
    /// The type of view for the join form
    associatedtype JoinFormContent: View
    
    /// The type of view for the success state
    associatedtype SuccessContent: View
    
    /// The type of view for the loading state
    associatedtype LoadingContent: View
    
    /// The type of view for the error state
    associatedtype ErrorContent: View
    
    /// Create the join form view
    /// - Parameters:
    ///   - email: Binding to the email input
    ///   - isLoading: Whether the form is currently submitting
    ///   - waitlistInfo: Optional waitlist info for branding
    ///   - onSubmit: Closure to call when user submits the form
    /// - Returns: A view for the join form
    @ViewBuilder
    func makeJoinForm(
        email: Binding<String>,
        isLoading: Bool,
        waitlistInfo: WaitlistInfo?,
        onSubmit: @escaping () -> Void
    ) -> JoinFormContent
    
    /// Create the success view shown after joining
    /// - Parameters:
    ///   - signup: The signup data with position, referral code, etc.
    ///   - waitlistInfo: Optional waitlist info for branding
    ///   - onCopyLink: Closure to copy the referral link
    /// - Returns: A view for the success state
    @ViewBuilder
    func makeSuccessView(
        signup: WaitlistSignup,
        waitlistInfo: WaitlistInfo?,
        onCopyLink: @escaping () -> Void
    ) -> SuccessContent
    
    /// Create the loading view
    /// - Returns: A view shown during loading
    @ViewBuilder
    func makeLoadingView() -> LoadingContent
    
    /// Create the error view
    /// - Parameters:
    ///   - error: The error message to display
    ///   - onRetry: Closure to retry the operation
    /// - Returns: A view for the error state
    @ViewBuilder
    func makeErrorView(
        error: String,
        onRetry: @escaping () -> Void
    ) -> ErrorContent
}

// MARK: - Default Implementations

/// Default implementation of WaitlistUIProvider for minimal customization
public struct DefaultWaitlistUIProvider: WaitlistUIProvider {
    
    public init() {}
    
    public func makeJoinForm(
        email: Binding<String>,
        isLoading: Bool,
        waitlistInfo: WaitlistInfo?,
        onSubmit: @escaping () -> Void
    ) -> some View {
        VStack(spacing: 16) {
            TextField("Enter your email", text: email)
                .textFieldStyle(.roundedBorder)
                #if os(iOS)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                #endif
                .autocorrectionDisabled()
                .disabled(isLoading)
            
            Button(action: onSubmit) {
                HStack {
                    if isLoading {
                        ProgressView()
                    } else {
                        Text("Join Waitlist")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .disabled(isLoading)
        }
        .padding()
    }
    
    public func makeSuccessView(
        signup: WaitlistSignup,
        waitlistInfo: WaitlistInfo?,
        onCopyLink: @escaping () -> Void
    ) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            Text("You're #\(signup.position)!")
                .font(.title.bold())
            
            Text("Referrals: \(signup.referralCount)")
                .foregroundColor(.secondary)
            
            if signup.referralLink != nil {
                Button("Copy Referral Link", action: onCopyLink)
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
    
    public func makeLoadingView() -> some View {
        ProgressView("Loading...")
            .padding()
    }
    
    public func makeErrorView(
        error: String,
        onRetry: @escaping () -> Void
    ) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundColor(.red)
            
            Text(error)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
            
            Button("Try Again", action: onRetry)
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
