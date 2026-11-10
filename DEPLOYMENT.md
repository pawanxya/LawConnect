# Deployment checklist

## Backend

Deploy `backend` to a Node.js host such as Render, Railway, Fly.io, or a VPS. Set the service start command to `npm start` and configure all values in the host's secret/environment manager:

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long unique random secret>
CLIENT_ORIGIN=https://app.yourdomain.com
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=<live Razorpay secret>
```

Do not upload `backend/.env` or `frontend/.env`; both are ignored by Git. Use the hosting provider's environment-variable settings instead. The backend health check is `GET /api/health`.

## Frontend

Deploy `frontend` to Vercel, Netlify, or any static host:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

Build command: `npm run build`
Output directory: `dist`

## Required provider configuration

1. Add the frontend URL as `CLIENT_ORIGIN` on the backend. Multiple origins can be comma-separated for a staging environment.
2. In Clerk, add the production frontend domain to allowed origins, redirect URLs, and OAuth callback URLs.
3. In Razorpay, switch to live keys only after validating payments with test keys. Add a payment webhook before relying on asynchronous payment recovery (for example, when a buyer closes the browser before verification completes).
4. Use MongoDB Atlas Network Access to permit only the backend host or its documented outbound IP range.
5. Use HTTPS for both frontend and backend; Socket.IO will then connect using secure WebSockets automatically.

## Before launch

- Test registration, login, bookings, payment success/failure, file upload, and a two-browser real-time chat.
- Confirm the deployed `/api/health` endpoint responds with `{ "ok": true }`.
- Rotate test credentials before using live credentials. Never expose a Razorpay secret in a Vite variable or client-side code.
