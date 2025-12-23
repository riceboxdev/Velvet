# Velvet REST API Documentation

**Base URL**: `https://velvetapi.com`

---

## Authentication

Velvet uses two authentication methods:

| Method | Use Case | Header |
|--------|----------|--------|
| **JWT Token** | User dashboard access | `Authorization: Bearer <token>` |
| **API Key** | Admin/programmatic access | `X-API-Key: wl_xxxxx` |

---

## Public Endpoints

### Health Check


**GET** `/health`
返回 API 状态。

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-22T16:00:00.000Z"
}
```

---

### Join Waitlist


**POST** `/api/signup`

Add an email to a waitlist.

**Request Body:**
```json
{
  "email": "user@example.com",
  "waitlist_id": "uuid-of-waitlist",
  "referral_link": "ABC123"  // optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "signup-uuid",
    "email": "user@example.com",
    "referral_code": "XYZ789",
    "referral_link": "https://velvetapi.com/join/waitlist-id?ref=XYZ789",
    "position": 42,
    "priority": 0,
    "total_signups": 100
  }
}
```

**Error Responses:**
| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing required fields` | Email or waitlist_id not provided |
| 400 | `Invalid email` | Email format invalid |
| 400 | `Waitlist closed` | Waitlist not accepting signups |
| 404 | `Waitlist not found` | Invalid waitlist_id |
| 409 | `Already registered` | Email already on waitlist (returns existing data) |

---

### Check Signup Status


**GET** `/api/signup/:referralCode`

Get signup status by referral code.

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "referral_code": "XYZ789",
    "referral_count": 5,
    "current_position": 12,
    "priority": 50,
    "status": "waiting",
    "created_at": "2025-12-22T10:00:00.000Z"
  }
}
```

---

### Check Registration


**GET** `/api/signup/check/:waitlistId/:email`

Check if an email is already registered.

**Response (not registered):**
```json
{ "registered": false }
```

**Response (registered):**
```json
{
  "registered": true,
  "data": {
    "referral_code": "XYZ789",
    "referral_count": 5,
    "current_position": 12,
    "status": "waiting"
  }
}
```

---

### Get Waitlist Info


**GET** `/api/waitlist/:waitlistId`

Get public waitlist information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "waitlist-uuid",
    "name": "My Product",
    "description": "Join our waitlist!",
    "total_signups": 500,
    "is_active": true,
    "settings": {
      "branding": {
        "primaryColor": "#6366f1",
        "secondaryColor": "#10b981",
        "widgetTitle": "Get Early Access"
      },
      "showLeaderboard": true
    }
  }
}
```

---

### Get Leaderboard


**GET** `/api/waitlist/:waitlistId/leaderboard?limit=10`

Get top referrers (emails are masked for privacy).

**Response:**
```json
{
  "success": true,
  "data": [
    { "rank": 1, "email": "joh***@example.com", "referral_count": 25, "priority": 250 },
    { "rank": 2, "email": "jan***@example.com", "referral_count": 18, "priority": 180 }
  ]
}
```

---

### List All Waitlists


**GET** `/api/waitlists`

List all public waitlists.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Product",
      "description": "...",
      "total_signups": 500,
      "is_active": true,
      "created_at": "2025-12-01T00:00:00.000Z"
    }
  ]
}
```

---

## User Dashboard Endpoints

> **Authentication**: Requires `Authorization: Bearer <token>`

### Auth Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |
| PUT | `/api/auth/password` | Change password |

#### Register User

**POST** `/api/auth/signup`

```json
{
  "email": "dev@example.com",
  "password": "securepass123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "user-uuid", "email": "dev@example.com", "name": "John Doe" },
    "token": "eyJhbGci..."
  }
}
```

#### Login

**POST** `/api/auth/login`

```json
{
  "email": "dev@example.com",
  "password": "securepass123"
}
```

---

### User Waitlist Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/waitlists` | List user's waitlists |
| POST | `/api/user/waitlists` | Create new waitlist |
| GET | `/api/user/waitlists/:id` | Get waitlist details |
| PATCH | `/api/user/waitlists/:id` | Update waitlist |
| DELETE | `/api/user/waitlists/:id` | Delete waitlist |
| POST | `/api/user/waitlists/:id/regenerate-key` | Regenerate API key |

### User Signup Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/waitlists/:id/signups` | List signups |
| PATCH | `/api/user/waitlists/:id/signups/:signupId/offboard` | Admit user |
| DELETE | `/api/user/waitlists/:id/signups/:signupId` | Remove signup |

### User Webhook Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/waitlists/:id/webhooks` | List webhooks |
| POST | `/api/user/waitlists/:id/webhooks` | Create webhook |
| DELETE | `/api/user/waitlists/:id/webhooks/:webhookId` | Delete webhook |

---

## Admin API (API Key)

> **Authentication**: Requires `X-API-Key: wl_xxxxx`

### Waitlist

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/waitlist` | Get waitlist with stats |
| PATCH | `/api/admin/waitlist` | Update settings |
| POST | `/api/admin/waitlist/regenerate-key` | New API key |

### Signups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/signups` | List all signups |
| GET | `/api/admin/signups/:signupId` | Get specific signup |
| PATCH | `/api/admin/signups/:signupId/offboard` | Admit user |
| PATCH | `/api/admin/signups/:signupId/advance` | Boost priority |
| DELETE | `/api/admin/signups/:signupId` | Remove signup |

**Query Parameters for List:**
- `limit` - Max results (default: 50, max: 500)
- `offset` - Pagination offset
- `status` - Filter: `waiting`, `verified`, `admitted`
- `sortBy` - Sort field: `position`, `created_at`, `referral_count`, `priority`
- `order` - `ASC` or `DESC`

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/webhooks` | List webhooks |
| POST | `/api/admin/webhooks` | Create webhook |
| PATCH | `/api/admin/webhooks/:webhookId` | Update webhook |
| DELETE | `/api/admin/webhooks/:webhookId` | Delete webhook |

**Webhook Events:**
- `new_signup` - New user joins
- `offboarded` - User admitted

---

## Settings (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/theme` | Get theme (public) |
| PUT | `/api/settings/theme` | Update theme |
| POST | `/api/settings/theme/reset` | Reset to defaults |

---

## Error Format

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable description"
}
```

## Rate Limiting

Signup endpoint is rate-limited to 10 requests per minute per IP.
