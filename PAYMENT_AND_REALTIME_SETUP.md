# Payment and real-time messaging setup

## 1. Backend environment

Copy `backend/.env.example` to `backend/.env` and set these values:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/lawconnect
JWT_SECRET=a-long-unique-random-secret
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

Use Razorpay **test keys** during development and live keys only after a successful test payment. Keep `RAZORPAY_KEY_SECRET` private: it belongs in the backend `.env` only and must never be added to the frontend or committed to Git.

## 2. Frontend environment

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

The Razorpay key used by Checkout is returned by the backend after it creates an order, so no Razorpay secret is needed in the frontend.

## 3. Start locally

Run MongoDB, then in separate terminals:

```powershell
cd backend
npm install
npm run dev
```

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:8080`. The Vite proxy forwards API and Socket.IO traffic to port 4000.

## What is now protected

- Payment totals are calculated from the saved booking/case on the server; the browser cannot choose the amount.
- Subscription orders are linked to the account and plan before checkout; verification rejects a mismatched or already-used order.
- Only the free Basic plan can be selected without checkout. Client Plus and Lawyer Premium require Razorpay verification.
- Live chat uses a short-lived signed socket ticket, rather than trusting a user ID sent by the browser. The server also checks that both chat participants share a consultation booking.

Before production, configure a Razorpay webhook as an additional recovery path for payments completed while a user closes their browser. The current checkout verification remains required for the interactive flow.
