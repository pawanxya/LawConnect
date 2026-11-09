# Session Management & Clerk Authentication Architecture

## 1. Overview

LawConnect utilizes **Clerk** as its modern Identity Provider (IdP) for authentication, session lifecycle management, and social logins, combined with a **MongoDB user profile synchronization layer** for role-based authorization.

---

## 2. Authentication Architecture

```
┌───────────────────────────────┐
│        Clerk Auth Cloud       │
│  (MFA, OAuth, Sessions, JWT)  │
└──────────────┬────────────────┘
               │ 1. Sign In / Token Issuance
               ▼
┌───────────────────────────────┐
│        Frontend (React)       │
│   • <ClerkProvider> Root      │
│   • <SignIn /> / <SignUp />   │
│   • AuthContext synchronization│
└──────────────┬────────────────┘
               │ 2. Sync Profile (POST /api/auth/sync)
               │ 3. API Requests with Bearer Token
               ▼
┌───────────────────────────────┐
│     Backend (Node/Express)    │
│   • authRequired Middleware   │
│   • Resolves User from Mongo  │
│   • Role-Based Access Control │
└──────────────┬────────────────┘
               │ 4. Read/Write Models
               ▼
┌───────────────────────────────┐
│     MongoDB Atlas Cluster     │
│   (Users, Lawyers, Bookings)  │
└───────────────────────────────┘
```

---

## 3. Session Lifecycle & Token Handling

### A. Token Issuance
- When a user signs in through Clerk, Clerk issues a cryptographically signed **JWT Session Token**.
- Tokens are automatically rotated and refreshed by `@clerk/clerk-react` in the browser without manual refresh token logic.

### B. Client-Side API Interception (`frontend/src/lib/apiClient.js`)
- Whenever `apiRequest(path, { auth: true })` is called, the client extracts the active Clerk session token:
```javascript
if (typeof window !== "undefined" && window.Clerk?.session) {
  const clerkToken = await window.Clerk.session.getToken();
  if (clerkToken) {
    headers.Authorization = `Bearer ${clerkToken}`;
  }
}
```

### C. Backend Authentication Middleware (`backend/src/middleware/auth.js`)
- The backend verifies the incoming request:
  1. Inspects Clerk authentication context or decodes the Bearer token payload to extract the Clerk user ID (`user_xxx`).
  2. Resolves the user record from the MongoDB database (`User` collection for clients/admins, or `Lawyer` collection for lawyers).
  3. Attaches `req.user` to the request object.
  4. Provides backwards-compatible fallback for legacy demo credentials during development.

---

## 4. Role-Based Access Control (RBAC)

The application enforces three distinct user roles:

| Role | Access Scope | Protected Routes |
|---|---|---|
| **Client** | Book consultations, hire lawyers, participate in gated chat, track hearings | `/client/dashboard`, `/lawyers`, `/bookings`, `/messages` |
| **Lawyer** | Accept/reject bookings, manage slots, view client case files, post hearing updates | `/lawyer/dashboard`, `/profile`, `/bookings`, `/messages` |
| **Admin** | System health, user verification, platform metrics, moderation | `/admin/dashboard` |

### Middleware Guards:
- **`authRequired`**: Ensures the caller has a valid authenticated session.
- **`requireVerifiedLawyer`**: Ensures only lawyers approved by the admin can manage public consultation slots and accept cases.
- **`adminOnly`**: Restricts admin-specific mutations to verified platform admins.
- **`requireRole(...roles)`**: Restricts endpoints to specific authorized roles.

---

## 5. Security Advantages Over Custom Session Storage

1. **Elimination of Password Storage Risk**: No passwords or password hashes are managed on the local server; credentials never touch application memory.
2. **Built-in Bot Protection & Rate Limiting**: Clerk provides brute-force mitigation and turnkey rate limiting out of the box.
3. **Multi-Factor & OAuth Support**: Google OAuth, GitHub, and email magic links/OTPs are supported without maintaining SMTP configurations.
4. **Stateless Scale**: Tokens are verified statelessly across horizontally scaled backend instances without requiring centralized server session stores (like Redis) for basic authentication.
