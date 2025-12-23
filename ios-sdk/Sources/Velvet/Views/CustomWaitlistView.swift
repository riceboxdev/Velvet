//
//  CustomWaitlistView.swift
//  Velvet iOS SDK
//
//  Generic view that accepts a custom UI provider.
//

import SwiftUI

/// A waitlist view that uses a custom UI provider for complete visual customization.
///
/// Use this when you want to provide your own UI while keeping the SDK's business logic:
///
/// ```swift
/// struct MyProvider: WaitlistUIProvider {
///     // Implement custom views...
/// }
///
/// struct ContentView: View {
///     var body: some View {
///         CustomWaitlistView(provider: MyProvider())
///     }
/// }
/// ```
public struct CustomWaitlistView<Provider: WaitlistUIProvider>: View {
    
    @StateObject private var viewModel: WaitlistViewModel
    
    private let provider: Provider
    
    /// Initialize with a custom UI provider
    /// - Parameters:
    ///   - provider: Your custom WaitlistUIProvider implementation
    ///   - referralCode: Optional referral code from a referral link
    public init(provider: Provider, referralCode: String? = nil) {
        self.provider = provider
        _viewModel = StateObject(wrappedValue: WaitlistViewModel(referralCode: referralCode))
    }
    
    public var body: some View {
        Group {
            switch viewModel.state {
            case .idle:
                provider.makeJoinForm(
                    email: $viewModel.email,
                    isLoading: false,
                    waitlistInfo: viewModel.waitlistInfo,
                    onSubmit: {
                        Task {
                            await viewModel.joinWaitlist()
                        }
                    }
                )
                
            case .loading:
                provider.makeLoadingView()
                
            case .success(let signup):
                provider.makeSuccessView(
                    signup: signup,
                    waitlistInfo: viewModel.waitlistInfo,
                    onCopyLink: {
                        viewModel.copyReferralLink()
                    }
                )
                
            case .error(let message):
                provider.makeErrorView(
                    error: message,
                    onRetry: {
                        viewModel.reset()
                    }
                )
            }
        }
        .task {
            await viewModel.loadWaitlistInfo()
        }
    }
}

// MARK: - Preview

#if DEBUG
struct CustomWaitlistView_Previews: PreviewProvider {
    static var previews: some View {
        CustomWaitlistView(provider: DefaultWaitlistUIProvider())
    }
}
#endif
