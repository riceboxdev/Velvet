//
//  VelvetTests.swift
//  Velvet iOS SDK Tests
//

import XCTest
@testable import Velvet

final class VelvetTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
        Velvet.shared.reset()
    }
    
    func testConfiguration() {
        XCTAssertFalse(Velvet.shared.isConfigured)
        
        Velvet.configure(waitlistId: "test-waitlist-123")
        
        XCTAssertTrue(Velvet.shared.isConfigured)
        XCTAssertEqual(Velvet.shared.waitlistId, "test-waitlist-123")
    }
    
    func testAPIBaseURL() {
        XCTAssertEqual(Velvet.shared.apiBaseURL, "https://velvetapi.com")
    }
}
