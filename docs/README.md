# Velvet Documentation

Welcome to the Velvet documentation. Velvet is a complete waitlist management platform with:

- **REST API** - Backend service for managing waitlists
- **iOS SDK** - SwiftUI package with default UI and customization options
- **Dashboard** - Web-based admin interface

## Quick Links

| Document | Description |
|----------|-------------|
| [REST API Reference](./API.md) | Complete API endpoint documentation |
| [iOS SDK README](../ios-sdk/README.md) | Swift package installation and usage |

## API Base URL

**Production**: `https://velvetapi.com`

## Authentication Overview

| Method | Use Case | Header |
|--------|----------|--------|
| **JWT Token** | User dashboard, web app | `Authorization: Bearer <token>` |
| **API Key** | Programmatic/admin access | `X-API-Key: wl_xxxxx` |

## Getting Started

### For iOS Developers

1. Add the Swift Package to your Xcode project
2. Configure with your waitlist ID:
   ```swift
   Velvet.configure(waitlistId: "your-id")
   ```
3. Drop in `WaitlistView()`

### For Web Developers

1. Register at velvetapi.com
2. Create a waitlist to get your API key
3. Use the public signup endpoint:
   ```bash
   curl -X POST https://velvetapi.com/api/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","waitlist_id":"your-id"}'
   ```

## Core Concepts

### Waitlist
A single campaign with its own API key, signups, and settings.

### Signup
A user who has joined a waitlist. Has:
- **Position** - Original signup order
- **Priority** - Boosted by referrals
- **Referral Code** - Unique shareable code
- **Status** - `waiting`, `verified`, `admitted`

### Referral System
- Each signup gets a unique referral code
- When someone signs up with a referral code, the referrer's priority increases
- Higher priority = moves up in the queue

## Support

For issues, contact support@velvetapi.com
