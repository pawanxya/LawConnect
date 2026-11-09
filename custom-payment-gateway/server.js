import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import crypto from "node:crypto";
import { db } from "./src/storage.js";
import {
  process2DCardPayment,
  processUpiPayment,
  processNetBankingPayment,
  detectCardBrand
} from "./src/processor.js";
import { dispatchWebhook } from "./src/webhook.js";

const PORT = process.env.PORT || 5050;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key"
  });
  res.end(JSON.stringify(data, null, 2));
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// Helper to serve static files
function serveStaticFile(res, filePath, contentType = "text/html") {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*"
      });
      res.end(content);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error: " + err.message);
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key"
    });
    return res.end();
  }

  try {
    // =========================================================================
    // 1. UI Web Pages
    // =========================================================================
    if (method === "GET" && (pathname === "/" || pathname === "/dashboard")) {
      return serveStaticFile(res, path.join(PUBLIC_DIR, "dashboard.html"), "text/html");
    }

    if (method === "GET" && pathname === "/checkout") {
      return serveStaticFile(res, path.join(PUBLIC_DIR, "checkout.html"), "text/html");
    }

    if (method === "GET" && pathname === "/demo-booking") {
      return serveStaticFile(res, path.join(PUBLIC_DIR, "demo-client.html"), "text/html");
    }

    if (method === "GET" && pathname === "/docs") {
      return serveStaticFile(res, path.join(PUBLIC_DIR, "docs.html"), "text/html");
    }

    // =========================================================================
    // 2. Client Payment Gateway APIs (Order & 2D Processing)
    // =========================================================================

    // POST /api/v1/orders/create
    // Used by client booking systems to register a payable order
    if (method === "POST" && pathname === "/api/v1/orders/create") {
      const body = await parseBody(req);
      const apiKey = req.headers["x-api-key"] || body.apiKey;

      const merchant = db.getMerchantByApiKey(apiKey) || db.getMerchantBySecret(apiKey) || db.getMerchant("mer_lawconnect_01");
      if (!merchant) {
        return sendJson(res, 401, { success: false, message: "Invalid API Key or Merchant Not Found" });
      }

      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        return sendJson(res, 400, { success: false, message: "Invalid amount. Must be greater than 0." });
      }

      const orderId = "ord_" + crypto.randomUUID().slice(0, 16);
      const order = {
        id: orderId,
        merchantId: merchant.id,
        merchantName: merchant.name,
        amount: Math.round(amount * 100) / 100,
        currency: body.currency || merchant.currency || "INR",
        bookingId: body.bookingId || "BK_" + Math.floor(100000 + Math.random() * 900000),
        customer: {
          name: body.customer?.name || "Customer",
          email: body.customer?.email || "customer@example.com",
          phone: body.customer?.phone || ""
        },
        notes: body.notes || "Booking Consultation Fee",
        returnUrl: body.returnUrl || `http://localhost:${PORT}/demo-booking`,
        status: "PENDING",
        checkoutUrl: `http://localhost:${PORT}/checkout?orderId=${orderId}`,
        createdAt: new Date().toISOString()
      };

      db.createOrder(order);

      return sendJson(res, 201, {
        success: true,
        message: "Payment order initialized successfully",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        checkoutUrl: order.checkoutUrl,
        bookingId: order.bookingId,
        order
      });
    }

    // GET /api/v1/orders/:orderId
    if (method === "GET" && pathname.startsWith("/api/v1/orders/")) {
      const orderId = pathname.replace("/api/v1/orders/", "");
      const order = db.getOrder(orderId);
      if (!order) {
        return sendJson(res, 404, { success: false, message: "Order not found" });
      }
      return sendJson(res, 200, { success: true, order });
    }

    // POST /api/v1/charge/direct-2d
    // Direct 2D API for server-to-server or headless checkout (Zero OTP challenge)
    if (method === "POST" && (pathname === "/api/v1/charge/direct-2d" || pathname === "/api/v1/charge/checkout-pay")) {
      const body = await parseBody(req);
      const apiKey = req.headers["x-api-key"] || body.apiKey;

      let order = null;
      if (body.orderId) {
        order = db.getOrder(body.orderId);
      }

      const merchant = order
        ? db.getMerchant(order.merchantId)
        : (db.getMerchantByApiKey(apiKey) || db.getMerchantBySecret(apiKey) || db.getMerchant("mer_lawconnect_01"));

      if (!merchant) {
        return sendJson(res, 401, { success: false, message: "Unauthorized merchant" });
      }

      const amount = order ? order.amount : Number(body.amount);
      const currency = order ? order.currency : (body.currency || "INR");
      const bookingId = order ? order.bookingId : (body.bookingId || "BK_DIRECT");
      const customer = order ? order.customer : (body.customer || { name: body.cardHolderName || "Customer" });

      if (!amount || amount <= 0) {
        return sendJson(res, 400, { success: false, message: "Invalid payment amount" });
      }

      const paymentMethod = body.paymentMethod || "card";
      let authResult = null;

      // Execute 2D processing based on method
      if (paymentMethod === "card") {
        authResult = await process2DCardPayment({
          cardNumber: body.cardNumber,
          cardExpiry: body.cardExpiry,
          cardCvv: body.cardCvv,
          cardHolderName: body.cardHolderName || customer.name,
          amount,
          currency,
          orderId: order?.id,
          customerDetails: customer
        });
      } else if (paymentMethod === "upi") {
        authResult = await processUpiPayment({
          vpa: body.vpa,
          amount,
          currency,
          orderId: order?.id,
          customerDetails: customer
        });
      } else if (paymentMethod === "netbanking") {
        authResult = await processNetBankingPayment({
          bankCode: body.bankCode || "HDFC",
          amount,
          currency,
          orderId: order?.id
        });
      } else {
        return sendJson(res, 400, { success: false, message: "Unsupported payment method: " + paymentMethod });
      }

      // Generate Transaction Record
      const txnId = "txn_" + crypto.randomUUID().slice(0, 16);
      const isApproved = authResult.status === "APPROVED";

      const transaction = {
        id: txnId,
        orderId: order?.id || null,
        merchantId: merchant.id,
        merchantName: merchant.name,
        bookingId,
        amount,
        currency,
        customer,
        paymentMethod,
        cardBrand: authResult.cardBrand || (paymentMethod === "upi" ? "UPI" : "NetBanking"),
        cardMasked: authResult.cardMasked || (paymentMethod === "upi" ? authResult.vpa : "Bank " + authResult.bankCode),
        status: authResult.status,
        responseCode: authResult.responseCode,
        message: authResult.message,
        authCode: authResult.authCode || null,
        arn: authResult.arn || null,
        rrn: authResult.rrn || null,
        utr: authResult.utr || null,
        threeDsBypassed: true,
        gatewayType: "2D_DIRECT_SWITCH",
        declineReason: authResult.declineReason || null,
        createdAt: new Date().toISOString()
      };

      db.createTransaction(transaction);

      // Update order status if order was provided
      if (order) {
        db.updateOrder(order.id, {
          status: isApproved ? "PAID" : "FAILED",
          transactionId: txnId,
          paymentMethod
        });
      }

      // Asynchronously trigger Webhook to Merchant
      const webhookEvent = isApproved ? "payment.captured" : "payment.failed";
      dispatchWebhook({
        merchantId: merchant.id,
        event: webhookEvent,
        data: {
          transactionId: transaction.id,
          orderId: transaction.orderId,
          bookingId: transaction.bookingId,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          customer: transaction.customer,
          authCode: transaction.authCode,
          timestamp: transaction.createdAt
        }
      }).catch(err => console.error("[WEBHOOK] Error firing webhook:", err.message));

      const httpCode = isApproved ? 200 : 402;
      return sendJson(res, httpCode, {
        success: isApproved,
        status: authResult.status,
        message: authResult.message,
        transactionId: txnId,
        orderId: order?.id,
        bookingId,
        amount,
        currency,
        authCode: authResult.authCode,
        arn: authResult.arn,
        rrn: authResult.rrn,
        utr: authResult.utr,
        receipt: {
          txnId,
          bookingId,
          date: transaction.createdAt,
          method: paymentMethod.toUpperCase(),
          status: transaction.status
        }
      });
    }

    // GET /api/v1/transactions/:txnId
    if (method === "GET" && pathname.startsWith("/api/v1/transactions/")) {
      const txnId = pathname.replace("/api/v1/transactions/", "");
      const txn = db.getTransaction(txnId);
      if (!txn) {
        return sendJson(res, 404, { success: false, message: "Transaction not found" });
      }
      return sendJson(res, 200, { success: true, transaction: txn });
    }

    // POST /api/v1/refund
    if (method === "POST" && pathname === "/api/v1/refund") {
      const body = await parseBody(req);
      const { transactionId, reason } = body;

      const txn = db.getTransaction(transactionId);
      if (!txn) {
        return sendJson(res, 404, { success: false, message: "Transaction not found" });
      }

      if (txn.status !== "APPROVED") {
        return sendJson(res, 400, { success: false, message: "Cannot refund transaction with status: " + txn.status });
      }

      const updated = db.updateTransaction(transactionId, {
        status: "REFUNDED",
        refundReason: reason || "Merchant initiated refund",
        refundedAt: new Date().toISOString()
      });

      // Deduct balance
      const merchant = db.getMerchant(txn.merchantId);
      if (merchant) {
        merchant.balance = Math.max(0, (merchant.balance || 0) - Number(txn.amount));
        db.save();
      }

      // Fire webhook
      dispatchWebhook({
        merchantId: txn.merchantId,
        event: "refund.processed",
        data: {
          transactionId: txn.id,
          bookingId: txn.bookingId,
          amount: txn.amount,
          status: "REFUNDED",
          reason: reason || "Merchant initiated refund"
        }
      }).catch(console.error);

      return sendJson(res, 200, {
        success: true,
        message: "Refund processed successfully",
        transaction: updated
      });
    }

    // =========================================================================
    // 3. Demo Webhook Receiver (To demonstrate how clients receive webhook events)
    // =========================================================================
    if (method === "POST" && pathname === "/api/v1/demo-webhook-receiver") {
      const body = await parseBody(req);
      const signature = req.headers["x-gateway-signature"];
      const event = req.headers["x-gateway-event"];

      console.log(`[DEMO RECEIVER] Received Webhook Event: ${event}`);
      console.log(`[DEMO RECEIVER] Verified signature: ${signature ? "VALID" : "UNSET"}`);

      return sendJson(res, 200, {
        received: true,
        verified: true,
        event,
        bookingUpdated: body?.data?.bookingId || null,
        message: "Client booking status marked as CONFIRMED via webhook"
      });
    }

    // =========================================================================
    // 4. Merchant Portal APIs
    // =========================================================================
    if (method === "GET" && pathname === "/api/v1/merchant/profile") {
      const merchant = db.getMerchant("mer_lawconnect_01");
      const transactions = db.listTransactions(merchant.id, 100);

      const totalVolume = transactions
        .filter(t => t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalCount = transactions.length;
      const approvedCount = transactions.filter(t => t.status === "APPROVED").length;
      const successRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 100;

      return sendJson(res, 200, {
        success: true,
        merchant,
        stats: {
          totalVolume,
          totalCount,
          approvedCount,
          successRate,
          currency: merchant.currency
        }
      });
    }

    if (method === "GET" && pathname === "/api/v1/merchant/transactions") {
      const transactions = db.listTransactions("mer_lawconnect_01", 100);
      return sendJson(res, 200, { success: true, transactions });
    }

    if (method === "GET" && pathname === "/api/v1/merchant/webhooks") {
      const webhooks = db.listWebhooks("mer_lawconnect_01", 30);
      return sendJson(res, 200, { success: true, webhooks });
    }

    if (method === "POST" && pathname === "/api/v1/merchant/webhook-url") {
      const body = await parseBody(req);
      const merchant = db.updateMerchant("mer_lawconnect_01", { webhookUrl: body.webhookUrl });
      return sendJson(res, 200, { success: true, webhookUrl: merchant.webhookUrl });
    }

    if (method === "POST" && pathname === "/api/v1/merchant/keys/rotate") {
      const newApiKey = "pk_live_apex_" + crypto.randomBytes(8).toString("hex");
      const newApiSecret = "sk_live_apex_" + crypto.randomBytes(16).toString("hex");
      const merchant = db.updateMerchant("mer_lawconnect_01", { apiKey: newApiKey, apiSecret: newApiSecret });
      return sendJson(res, 200, { success: true, apiKey: merchant.apiKey, apiSecret: merchant.apiSecret });
    }

    // Default 404
    return sendJson(res, 404, { success: false, message: `Route not found: ${method} ${pathname}` });

  } catch (err) {
    console.error("[SERVER] Unhandled error:", err);
    return sendJson(res, 500, { success: false, message: "Internal server error: " + err.message });
  }
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` 🚀 APEXPAY 2D PAYMENT GATEWAY IS RUNNING ON PORT ${PORT} `);
  console.log(`================================================================`);
  console.log(` 📊 Merchant Dashboard:   http://localhost:${PORT}/dashboard`);
  console.log(` 💳 Hosted 2D Checkout:   http://localhost:${PORT}/checkout`);
  console.log(` 📅 Client Booking Demo:   http://localhost:${PORT}/demo-booking`);
  console.log(` 📖 API Documentation:    http://localhost:${PORT}/docs`);
  console.log(`================================================================`);
});
