//
//  WaitlistAPIClient.swift
//  Velvet iOS SDK
//
//  HTTP client for all Velvet API interactions.
//

import Foundation

/// Errors that can occur during API operations
public enum VelvetError: LocalizedError {
    case notConfigured
    case invalidEmail
    case networkError(Error)
    case serverError(String)
    case decodingError(Error)
    case alreadyRegistered(WaitlistSignup)
    case waitlistClosed
    case waitlistNotFound
    
    public var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Velvet SDK has not been configured. Call Velvet.configure(waitlistId:) first."
        case .invalidEmail:
            return "Please enter a valid email address."
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .serverError(let message):
            return message
        case .decodingError:
            return "Failed to process server response."
        case .alreadyRegistered:
            return "This email is already on the waitlist."
        case .waitlistClosed:
            return "This waitlist is no longer accepting signups."
        case .waitlistNotFound:
            return "Waitlist not found."
        }
    }
}

/// Internal API client for communicating with the Velvet backend
internal final class WaitlistAPIClient {
    
    // MARK: - Singleton
    
    static let shared = WaitlistAPIClient()
    
    // MARK: - Properties
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private var baseURL: String {
        Velvet.shared.apiBaseURL
    }
    
    private var waitlistId: String? {
        Velvet.shared.waitlistId
    }
    
    // MARK: - Init
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
        
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }
    
    // MARK: - Public API
    
    /// Join the waitlist with an email
    func joinWaitlist(email: String, referralCode: String? = nil) async throws -> WaitlistSignup {
        guard let waitlistId = waitlistId else {
            throw VelvetError.notConfigured
        }
        
        // Validate email format
        guard isValidEmail(email) else {
            throw VelvetError.invalidEmail
        }
        
        let url = URL(string: "\(baseURL)/api/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var body: [String: Any] = [
            "email": email,
            "waitlist_id": waitlistId
        ]
        
        if let referralCode = referralCode {
            body["referral_link"] = referralCode
        }
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await performRequest(request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw VelvetError.serverError("Invalid response")
        }
        
        switch httpResponse.statusCode {
        case 200, 201:
            let apiResponse = try decoder.decode(APIResponse<SignupResponseData>.self, from: data)
            return apiResponse.data.toWaitlistSignup()
            
        case 409:
            // Already registered - parse and return existing signup data
            let apiResponse = try decoder.decode(APIErrorResponse.self, from: data)
            if let signupData = apiResponse.data {
                throw VelvetError.alreadyRegistered(signupData.toWaitlistSignup())
            }
            throw VelvetError.serverError(apiResponse.message ?? "Already registered")
            
        case 400:
            let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)
            if errorResponse?.error == "Waitlist closed" {
                throw VelvetError.waitlistClosed
            }
            throw VelvetError.serverError(errorResponse?.message ?? "Bad request")
            
        case 404:
            throw VelvetError.waitlistNotFound
            
        default:
            let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)
            throw VelvetError.serverError(errorResponse?.message ?? "Server error")
        }
    }
    
    /// Check signup status by referral code
    func checkStatus(referralCode: String) async throws -> WaitlistSignup {
        let url = URL(string: "\(baseURL)/api/signup/\(referralCode)")!
        let request = URLRequest(url: url)
        
        let (data, response) = try await performRequest(request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw VelvetError.serverError("Invalid response")
        }
        
        guard httpResponse.statusCode == 200 else {
            let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)
            throw VelvetError.serverError(errorResponse?.message ?? "Failed to check status")
        }
        
        let apiResponse = try decoder.decode(APIResponse<StatusResponseData>.self, from: data)
        return apiResponse.data.toWaitlistSignup()
    }
    
    /// Check if an email is already registered
    func checkRegistration(email: String) async throws -> RegistrationCheck {
        guard let waitlistId = waitlistId else {
            throw VelvetError.notConfigured
        }
        
        let encodedEmail = email.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? email
        let url = URL(string: "\(baseURL)/api/signup/check/\(waitlistId)/\(encodedEmail)")!
        let request = URLRequest(url: url)
        
        let (data, response) = try await performRequest(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw VelvetError.serverError("Failed to check registration")
        }
        
        return try decoder.decode(RegistrationCheck.self, from: data)
    }
    
    /// Get waitlist info
    func getWaitlistInfo() async throws -> WaitlistInfo {
        guard let waitlistId = waitlistId else {
            throw VelvetError.notConfigured
        }
        
        let url = URL(string: "\(baseURL)/api/waitlist/\(waitlistId)")!
        let request = URLRequest(url: url)
        
        let (data, response) = try await performRequest(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw VelvetError.serverError("Failed to get waitlist info")
        }
        
        let apiResponse = try decoder.decode(APIResponse<WaitlistInfo>.self, from: data)
        return apiResponse.data
    }
    
    /// Get leaderboard
    func getLeaderboard(limit: Int = 10) async throws -> [LeaderboardEntry] {
        guard let waitlistId = waitlistId else {
            throw VelvetError.notConfigured
        }
        
        let url = URL(string: "\(baseURL)/api/waitlist/\(waitlistId)/leaderboard?limit=\(limit)")!
        let request = URLRequest(url: url)
        
        let (data, response) = try await performRequest(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw VelvetError.serverError("Failed to get leaderboard")
        }
        
        let apiResponse = try decoder.decode(APIResponse<[LeaderboardEntry]>.self, from: data)
        return apiResponse.data
    }
    
    // MARK: - Private Helpers
    
    private func performRequest(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await session.data(for: request)
        } catch {
            throw VelvetError.networkError(error)
        }
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}

// MARK: - API Response Types

private struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T
}

private struct APIErrorResponse: Decodable {
    let error: String?
    let message: String?
    let data: SignupResponseData?
}

private struct SignupResponseData: Decodable {
    let id: String?
    let email: String?
    let referralCode: String
    let position: Int
    let referralCount: Int?
    let priority: Int?
    
    func toWaitlistSignup() -> WaitlistSignup {
        WaitlistSignup(
            id: id ?? "",
            email: email ?? "",
            referralCode: referralCode,
            position: position,
            referralCount: referralCount ?? 0,
            priority: priority ?? 0,
            status: .waiting
        )
    }
}

private struct StatusResponseData: Decodable {
    let email: String
    let referralCode: String
    let referralCount: Int
    let currentPosition: Int
    let priority: Int
    let status: String
    let createdAt: String?
    
    func toWaitlistSignup() -> WaitlistSignup {
        WaitlistSignup(
            id: "",
            email: email,
            referralCode: referralCode,
            position: currentPosition,
            referralCount: referralCount,
            priority: priority,
            status: SignupStatus(rawValue: status) ?? .waiting
        )
    }
}
