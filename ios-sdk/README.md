# Velvet iOS SDK Documentation

**Package**: `Velvet`  
**Platforms**: iOS 15+, macOS 12+  
**Swift**: 5.9+

---

## Installation

### Swift Package Manager

Add via Xcode: **File → Add Package Dependencies**, then enter the repository URL.

Or add to `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/your-org/velvet-ios-sdk", from: "1.0.0")
]
```

---

## Quick Start

### 1. Configure on Launch

```swift
import Velvet

@main
struct MyApp: App {
    init() {
        Velvet.configure(waitlistId: "your-waitlist-id")
    }
    
    var body: some Scene {
        WindowGroup {
            WaitlistView()
        }
    }
}
```

### 2. Show the Waitlist

```swift
// Full-screen view with default beautiful UI
WaitlistView()

// With referral code (from deep link)
WaitlistView(referralCode: "ABC123")
```

---

## Views

### WaitlistView

Main join form that handles the entire flow:
- Email input with validation
- Loading state
- Success with position & referral link
- Share sheet integration

```swift
WaitlistView(referralCode: nil)
```

### WaitlistStatusView

Let users check their status using a referral code:

```swift
WaitlistStatusView()
```

### LeaderboardView

Display top referrers:

```swift
LeaderboardView(limit: 10)
```

---

## Custom UI

For complete control over the appearance, implement `WaitlistUIProvider`:

```swift
import Velvet

struct MyCustomUI: WaitlistUIProvider {
    
    func makeJoinForm(
        email: Binding<String>,
        isLoading: Bool,
        waitlistInfo: WaitlistInfo?,
        onSubmit: @escaping () -> Void
    ) -> some View {
        VStack(spacing: 20) {
            Text("Join \(waitlistInfo?.name ?? "the waitlist")")
                .font(.largeTitle)
            
            TextField("Your email", text: email)
                .textFieldStyle(.roundedBorder)
            
            Button(action: onSubmit) {
                if isLoading {
                    ProgressView()
                } else {
                    Text("Get Early Access")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
        }
        .padding()
    }
    
    func makeSuccessView(
        signup: WaitlistSignup,
        waitlistInfo: WaitlistInfo?,
        onCopyLink: @escaping () -> Void
    ) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            Text("You're #\(signup.position)!")
                .font(.title.bold())
            
            Text("Referrals: \(signup.referralCount)")
            
            Button("Copy Referral Link", action: onCopyLink)
        }
    }
    
    func makeLoadingView() -> some View {
        ProgressView("Loading...")
    }
    
    func makeErrorView(
        error: String,
        onRetry: @escaping () -> Void
    ) -> some View {
        VStack {
            Text(error).foregroundColor(.red)
            Button("Retry", action: onRetry)
        }
    }
}
```

Then use it:

```swift
CustomWaitlistView(provider: MyCustomUI())
```

---

## ViewModel Direct Access

For even more control, use `WaitlistViewModel` directly:

```swift
import Velvet

struct MyView: View {
    @StateObject private var vm = WaitlistViewModel()
    
    var body: some View {
        VStack {
            TextField("Email", text: $vm.email)
            
            Button("Join") {
                Task { await vm.joinWaitlist() }
            }
            
            if let signup = vm.signup {
                Text("Position: #\(signup.position)")
                Text("Your link: \(signup.referralLink?.absoluteString ?? "")")
            }
            
            if let error = vm.errorMessage {
                Text(error).foregroundColor(.red)
            }
        }
    }
}
```

### ViewModel Properties

| Property | Type | Description |
|----------|------|-------------|
| `email` | `String` | Email input binding |
| `state` | `WaitlistViewState` | Current state |
| `waitlistInfo` | `WaitlistInfo?` | Waitlist metadata |
| `leaderboard` | `[LeaderboardEntry]` | Top referrers |
| `isLoading` | `Bool` | Loading state |
| `signup` | `WaitlistSignup?` | Successful signup |
| `errorMessage` | `String?` | Error message |

### ViewModel Methods

| Method | Description |
|--------|-------------|
| `joinWaitlist()` | Submit email to join |
| `checkStatus(referralCode:)` | Check status by code |
| `loadWaitlistInfo()` | Fetch waitlist metadata |
| `loadLeaderboard(limit:)` | Load leaderboard |
| `copyReferralLink()` | Copy to clipboard |
| `reset()` | Reset to initial state |

---

## Models

### WaitlistSignup

```swift
public struct WaitlistSignup {
    let id: String
    let email: String
    let referralCode: String
    let position: Int
    let referralCount: Int
    let priority: Int
    let status: SignupStatus    // .waiting, .verified, .admitted
    var referralLink: URL?      // Generated share link
}
```

### WaitlistInfo

```swift
public struct WaitlistInfo {
    let id: String
    let name: String
    let description: String?
    let totalSignups: Int?
    let isActive: Bool?
    let settings: WaitlistSettings?
}
```

### LeaderboardEntry

```swift
public struct LeaderboardEntry {
    let rank: Int
    let email: String          // Masked: "joh***@example.com"
    let referralCount: Int
    let priority: Int
}
```

---

## Error Handling

```swift
do {
    let signup = try await WaitlistAPIClient.shared.joinWaitlist(email: email)
} catch VelvetError.invalidEmail {
    // Show email validation error
} catch VelvetError.alreadyRegistered(let existingSignup) {
    // User already on waitlist - show their existing data
} catch VelvetError.waitlistClosed {
    // Waitlist not accepting signups
} catch VelvetError.networkError(let underlyingError) {
    // Network issue
} catch {
    // Other error
}
```

### VelvetError Cases

| Case | Description |
|------|-------------|
| `.notConfigured` | Call `Velvet.configure()` first |
| `.invalidEmail` | Email validation failed |
| `.networkError(Error)` | Network request failed |
| `.serverError(String)` | Server returned error |
| `.alreadyRegistered(WaitlistSignup)` | Email already on list |
| `.waitlistClosed` | Not accepting signups |
| `.waitlistNotFound` | Invalid waitlist ID |

---

## Deep Links

Handle referral links in your app:

```swift
.onOpenURL { url in
    // Example: yourapp://join?ref=ABC123
    if let ref = URLComponents(url: url, resolvingAgainstBaseURL: false)?
        .queryItems?.first(where: { $0.name == "ref" })?.value {
        // Show waitlist with referral
        WaitlistView(referralCode: ref)
    }
}
```

---

## Requirements

- iOS 15.0+ / macOS 12.0+
- Swift 5.9+
- No external dependencies
