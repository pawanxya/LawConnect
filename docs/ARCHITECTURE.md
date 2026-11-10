# LawConnect Architecture

This document explains the boundaries between the frontend, API, persistence layer, and external services.

## Components

### Frontend

The Vite-powered React application is organized by responsibility:

- `pages/` contains product screens and role-based dashboards.
- `components/` contains reusable interface elements and dialogs.
- `context/` contains authentication and shared application state.
- `lib/` contains API, payment, Socket.IO, and domain helpers.
- `hooks/` contains reusable browser behavior.

The frontend sends Clerk bearer tokens through the shared API client. Route guards prevent users from opening screens outside their role.

### Backend

The Express API follows a route-controller-model structure:

```text
HTTP route
  -> authentication / role middleware
  -> controller
  -> Mongoose model
  -> response + notification/socket event
```

- `routes/` defines the HTTP surface.
- `middleware/` owns authentication and authorization checks.
- `controllers/` owns request validation and business workflows.
- `models/` defines MongoDB documents.
- `socket.js` owns authenticated realtime messaging and presence.
- `server.js` owns startup, database initialization, and graceful shutdown.

## Important workflows

### Consultation booking

1. The client submits a lawyer and slot ID.
2. MongoDB atomically updates the matching slot only if it is still available.
3. If no document matches, the API returns a conflict instead of creating a duplicate booking.
4. If booking creation fails after reservation, the slot is released.
5. Successful updates emit a Socket.IO event so open dashboards refresh.

### Messaging

1. An authenticated user requests a short-lived socket ticket.
2. Socket.IO verifies the ticket before accepting the connection.
3. Sending a message requires an existing consultation relationship.
4. Messages are persisted before delivery events are emitted.
5. Notifications are created for the receiver.

### Payments

1. The server creates a Razorpay order from trusted booking or case data.
2. The browser completes checkout using the public key.
3. The server verifies the payment signature and stored order ownership.
4. Transaction state is persisted and reflected in the relevant dashboard.

## External services

| Service | Responsibility |
| --- | --- |
| Clerk | Authentication, OAuth, and session tokens |
| MongoDB / Mongoose | Users, lawyers, bookings, cases, messages, payments, and notifications |
| Socket.IO | Presence, chat, booking updates, and case events |
| Razorpay | Consultation, case, and membership payments |
| Google Gemini | Optional AI assistant and case summarization |

## Design principles

- Keep authorization close to the data-changing operation.
- Treat the browser as untrusted for identity, ownership, and payment amounts.
- Prefer atomic database operations for shared resources.
- Keep external integrations behind service/controller boundaries.
- Make local setup possible with documented environment examples and fallback behavior.
