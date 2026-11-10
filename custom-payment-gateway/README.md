# ApexPay 2D Payment Gateway Prototype ⚡

A high-performance, white-label **2D Payment Gateway Prototype** designed for seamless client booking integrations (like **LawConnect** or any e-commerce/service platform).

It simulates direct acquirer routing (2D authorization) where card transactions are authenticated and settled instantly without the 3D-Secure (SMS OTP redirect) friction, alongside direct UPI and NetBanking channels.

---

## 🌟 Key Architecture & Capabilities

1. **Merchant / Client Management**:
   - Unique API Key pair:
     - `Public Key` (`pk_live_apex_...`) for frontend checkout integration.
     - `Secret Key` (`sk_live_apex_...`) for server-to-server requests.
   - Merchant control center with real-time settled balance, transaction volume, and 2D approval rate.

2. **2D Direct Authorization Engine**:
   - Performs instant Luhn checksum validation, card brand detection (Visa, Mastercard, RuPay, Amex), expiry check, and CVV match.
   - Returns Acquirer Auth Code, ARN (Acquirer Reference Number), and RRN without OTP redirects.
   - Built-in simulation for UPI Intent/QR and NetBanking.

3. **Booking Integration (2 Options)**:
   - **Hosted 2D Checkout**: Client redirects to `http://localhost:5050/checkout?orderId=...`.
   - **Headless In-Page 2D Direct Post**: Client's booking form charges card details directly via `POST /api/v1/charge/direct-2d`.

4. **Cryptographic Webhook Dispatcher**:
   - Automatically signs webhook events (`payment.captured`, `payment.failed`, `refund.processed`) with HMAC-SHA256 and dispatches them to the client's registered callback URL.

---

## 🚀 How to Run

Because this prototype is built using **pure native Node.js (v18+) standard library**, it requires **zero external npm dependencies** to run!

```bash
# 1. Navigate to directory
cd custom-payment-gateway

# 2. Start the gateway server
npm start
```

The gateway will boot on port `5050`:
- 📊 **Merchant Dashboard**: [http://localhost:5050/dashboard](http://localhost:5050/dashboard)
- 💳 **Hosted 2D Checkout**: [http://localhost:5050/checkout](http://localhost:5050/checkout)
- 📅 **Client Booking Demo (LawConnect)**: [http://localhost:5050/demo-booking](http://localhost:5050/demo-booking)
- 📖 **Interactive API Docs**: [http://localhost:5050/docs](http://localhost:5050/docs)

---

## 🧪 Test Cards Cheat-Sheet

| Card Number | Expiry | CVV | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `4111 1111 1111 1111` | Any future (e.g. `12/28`) | Any (e.g. `892`) | **APPROVED** (Visa 2D Instant Auth) |
| `5555 5555 5555 4444` | Any future | Any | **APPROVED** (Mastercard 2D Instant Auth) |
| `6070 1234 5678 9010` | Any future | Any | **APPROVED** (RuPay 2D Instant Auth) |
| `4000 0000 0000 0002` | Any future | Any | **DECLINED** (Code 51: Insufficient Balance) |
| `4000 0000 0000 0004` | Any future | Any | **DECLINED** (Code 59: Suspected Fraud / Risk) |

---

## 📡 API Endpoints Reference

### 1. Initialize Booking Order
```http
POST /api/v1/orders/create
Content-Type: application/json
X-Api-Key: pk_live_apex_9381lawconnect_pub

{
  "amount": 1500,
  "currency": "INR",
  "bookingId": "BK_LAW_74921",
  "customer": {
    "name": "Pankaj Sharma",
    "email": "pankaj@example.com",
    "phone": "+91 98765 43210"
  },
  "notes": "Civil Case Consultation",
  "returnUrl": "http://localhost:5050/demo-booking"
}
```

### 2. Direct 2D Card Charge (Headless / Zero Redirect)
```http
POST /api/v1/charge/direct-2d
Content-Type: application/json
X-Api-Key: pk_live_apex_9381lawconnect_pub

{
  "amount": 1500,
  "currency": "INR",
  "bookingId": "BK_LAW_74921",
  "paymentMethod": "card",
  "cardNumber": "4111111111111111",
  "cardExpiry": "12/28",
  "cardCvv": "892",
  "cardHolderName": "Pankaj Sharma"
}
```

### 3. Webhook Payload Sample
```json
{
  "id": "evt_9102839102",
  "event": "payment.captured",
  "created_at": "2026-11-07T09:30:00.000Z",
  "data": {
    "transactionId": "txn_8391028401",
    "orderId": "ord_7281903",
    "bookingId": "BK_LAW_74921",
    "amount": 1500,
    "currency": "INR",
    "status": "APPROVED",
    "authCode": "AUTH593310"
  }
}
```
Header includes: `X-Gateway-Signature: <hex_hmac_sha256>`
