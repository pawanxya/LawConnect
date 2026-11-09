import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, "../data/store.json");

// Default initial state
const initialState = {
  merchants: [
    {
      id: "mer_lawconnect_01",
      name: "LawConnect Legal Services",
      email: "billing@lawconnect.in",
      apiKey: "pk_live_apex_9381lawconnect_pub",
      apiSecret: "sk_live_apex_4729lawconnect_sec_token",
      webhookUrl: "http://localhost:5050/api/v1/demo-webhook-receiver",
      currency: "INR",
      balance: 45000,
      status: "active",
      createdAt: new Date().toISOString()
    }
  ],
  orders: [],
  transactions: [],
  webhooks: []
};

class Storage {
  constructor() {
    this.data = initialState;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.data = { ...initialState, ...JSON.parse(raw) };
      } else {
        this.save();
      }
    } catch (err) {
      console.error("[STORAGE] Failed to load data, using memory store:", err.message);
    }
  }

  save() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("[STORAGE] Failed to write data:", err.message);
    }
  }

  // Merchant methods
  getMerchantByApiKey(apiKey) {
    return this.data.merchants.find(m => m.apiKey === apiKey);
  }

  getMerchantBySecret(apiSecret) {
    return this.data.merchants.find(m => m.apiSecret === apiSecret);
  }

  getMerchant(id) {
    return this.data.merchants.find(m => m.id === id) || this.data.merchants[0];
  }

  updateMerchant(id, updates) {
    const idx = this.data.merchants.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.data.merchants[idx] = { ...this.data.merchants[idx], ...updates };
      this.save();
      return this.data.merchants[idx];
    }
    return null;
  }

  // Order methods
  createOrder(order) {
    this.data.orders.unshift(order);
    this.save();
    return order;
  }

  getOrder(id) {
    return this.data.orders.find(o => o.id === id);
  }

  updateOrder(id, updates) {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.orders[idx];
    }
    return null;
  }

  // Transaction methods
  createTransaction(txn) {
    this.data.transactions.unshift(txn);
    // Update merchant balance if approved
    if (txn.status === "APPROVED") {
      const merchant = this.getMerchant(txn.merchantId);
      if (merchant) {
        merchant.balance = (merchant.balance || 0) + Number(txn.amount);
      }
    }
    this.save();
    return txn;
  }

  getTransaction(id) {
    return this.data.transactions.find(t => t.id === id);
  }

  listTransactions(merchantId, limit = 50) {
    return this.data.transactions
      .filter(t => !merchantId || t.merchantId === merchantId)
      .slice(0, limit);
  }

  updateTransaction(id, updates) {
    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.transactions[idx] = { ...this.data.transactions[idx], ...updates };
      this.save();
      return this.data.transactions[idx];
    }
    return null;
  }

  // Webhook log methods
  logWebhook(entry) {
    this.data.webhooks.unshift(entry);
    if (this.data.webhooks.length > 100) this.data.webhooks.pop();
    this.save();
    return entry;
  }

  listWebhooks(merchantId, limit = 30) {
    return this.data.webhooks
      .filter(w => !merchantId || w.merchantId === merchantId)
      .slice(0, limit);
  }
}

export const db = new Storage();
