# LawConnect

A comprehensive, production-ready legal tech platform connecting clients with verified lawyers for consultations, real-time messaging, case tracking, and schedule management. Built with **React 18**, **Node.js**, **Express**, **MongoDB Atlas**, **Socket.io**, and **Clerk Authentication**.

---

## 🌟 Key Highlights

- **Modern Authentication & Authorization**: Integrated with **Clerk** supporting Google OAuth, Email/Passwordless verification, and session token rotation with role-based access control (**Client**, **Lawyer**, **Admin**).
- **Lawyer Discovery & Search**: Filter lawyers by specialization, experience, hourly rate, and client reviews.
- **Slot-Based Consultation Booking**: Dynamic consultation slots with conflict prevention and state transitions (`Pending` → `Approved` → `Completed` / `Cancelled`).
- **Real-Time Messaging & Sockets**: Socket.io-powered messaging with strict **Message Gating** (messaging is only permitted for participants with an active booking).
- **Live Notifications**: Real-time Socket events for booking status changes, case updates, and incoming messages.
- **Lawyer & Client Dashboards**: Specialized dashboards for tracking active cases, consultation history, timeline hearings, and reviews.
- **Cloud-Native Database**: Backed by **MongoDB Atlas** with automatic DNS SRV resilience.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Authentication**: `@clerk/clerk-react`
- **Styling**: Tailwind CSS & Lucide Icons
- **UI Components**: Shadcn UI with Radix UI primitives
- **Real-time Client**: Socket.io-client
- **State & Data**: React Context API & TanStack React Query

### Backend
- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **Database**: MongoDB Atlas with Mongoose ODM
- **Auth & Security**: `@clerk/express`, JWT Verification, CORS
- **WebSockets**: Socket.io (Room-based event dispatching)
- **File Uploads**: Multer
- **AI Integrations**: Google Gemini API (`@google/generative-ai`)

---

## 📐 Architecture Overview

```
                      ┌──────────────────────┐
                      │   Clerk Auth Cloud   │
                      └──────────┬───────────┘
                                 │ (JWT Tokens & OAuth)
                                 ▼
┌──────────────────┐      ┌─────────────────────────┐      ┌─────────────────────┐
│  React Frontend  │ ───► │  Express Backend API    │ ───► │ MongoDB Atlas Cloud │
│ (Vite + Tailwind)│      │  (Port 4000)            │      │ (Clients & Lawyers) │
└────────┬─────────┘      └────────────┬────────────┘      └─────────────────────┘
         │                             │
         └────── Socket.io Duplex ─────┘
            (Gated Real-time Rooms)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9+)
- **MongoDB Atlas** account (or local MongoDB)
- **Clerk** account ([dashboard.clerk.com](https://dashboard.clerk.com))

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/LawConnect.git
cd LawConnect

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables Configuration

#### Backend (`backend/.env`)
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/lawconnect?retryWrites=true&w=majority
JWT_SECRET=your_secure_random_64_char_secret
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLIENT_ORIGIN=http://localhost:8080
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 3. Run the Development Servers

In two separate terminals:

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Running on http://localhost:4000

# Terminal 2: Frontend
cd frontend
npm run dev
# Running on http://localhost:8080
```

---

## 🛡️ Authentication & Authorization Flow

1. **User Sign-In / Sign-Up**: The frontend renders Clerk pre-built `<SignIn />` and `<SignUp />` components supporting email OTP and Google OAuth.
2. **Session Token**: On successful authentication, Clerk issues a session JWT token.
3. **Backend Synchronization (`POST /api/auth/sync`)**: The frontend sends the Clerk user profile (name, email, role) to the backend. The backend links or creates the MongoDB document (`User` for clients/admins or `Lawyer` for legal professionals).
4. **Authorized Requests**: All protected API requests pass the Clerk Bearer token in the `Authorization` header. The backend middleware resolves `req.user` directly from MongoDB.
5. **Role-Based Guards**:
   - `authRequired`: Enforces valid authentication.
   - `requireVerifiedLawyer`: Restricts lawyer management actions to verified profiles.
   - `adminOnly`: Restricts administrative management routes.

---

## 📅 Booking Lifecycle & Message Gating

```
Client Requests Consultation
         │
         ▼
    [ PENDING ] ──────► Lawyer Reviews Case
         │
         ├─── (Approved) ───► [ APPROVED ] ──► Room Unlocks: Real-time Chat Enabled
         │                                 ──► Status Updates & Hearing Timeline
         │                                 ──► Mark Session as [ COMPLETED ]
         │
         └─── (Rejected) ───► [ CANCELLED ] ──► Slot Released
```

- **Message Gating**: Sockets verify whether a booking exists between the two users and is in an `approved` state before allowing messages to be sent or read.

---

## 📂 Project Structure

```
LawConnect/
├── backend/
│   ├── src/
│   │   ├── app.js               # Express application configuration
│   │   ├── socket.js            # Socket.io connection and room handling
│   │   ├── config/db.js         # Resilient MongoDB Atlas connection
│   │   ├── controllers/         # Auth, Booking, Message, Lawyer controllers
│   │   ├── middleware/auth.js   # Clerk & JWT role-based middleware
│   │   ├── models/              # Mongoose Schemas (User, Lawyer, Booking, etc.)
│   │   ├── routes/              # Express API Route declarations
│   │   └── seed/                # Initial seed data for platform testing
│   ├── server.js                # Server entry point with graceful shutdown
│   └── .env                     # Backend environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI (Navbar, Dialogs, RouteGuards)
│   │   ├── context/AuthContext  # Clerk user sync and state provider
│   │   ├── lib/apiClient.js     # Centralized fetch client with Clerk token injection
│   │   ├── pages/               # Landing, Dashboards, Booking, Messages
│   │   ├── App.jsx              # Protected route trees and navigation
│   │   └── main.jsx             # React DOM root wrapped with ClerkProvider
│   └── .env                     # Frontend environment configuration
│
├── BOOKING_GUIDE.md             # Detailed booking state machine documentation
├── MESSAGING_GUIDE.md           # Real-time WebSockets & event schemas
├── SESSION_MANAGEMENT.md        # Clerk session & security architecture
└── README.md                    # Main platform documentation
```

For production environment variables and host configuration, see [DEPLOYMENT.md](DEPLOYMENT.md). For payment and Socket.IO setup details, see [PAYMENT_AND_REALTIME_SETUP.md](PAYMENT_AND_REALTIME_SETUP.md).

---

## 📜 License

MIT License. Developed for modern legal technology solutions and portfolio demonstrations.
