import cors from "cors";
import express from "express";
import path from "path";
import { corsOptions } from "./config/cors.js";

import { authRoutes } from "./routes/authRoutes.js";
import { bookingRoutes } from "./routes/bookingRoutes.js";
import { dataRoutes } from "./routes/dataRoutes.js";
import { notificationRoutes } from "./routes/notificationRoutes.js";
import { uploadRoutes } from "./routes/uploadRoutes.js";
import { paymentRoutes } from "./routes/paymentRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import { socketRoutes } from "./routes/socketRoutes.js";

const app = express();

app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Clerk express middleware (auto-attaches req.auth when @clerk/express is installed)
try {
  const clerkModule = await import("@clerk/express");
  if (clerkModule?.clerkMiddleware) {
    app.use(clerkModule.clerkMiddleware());
  }
} catch {
  // @clerk/express will be attached once npm install is run
}

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "lawconnect-api", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/socket", socketRoutes);
app.use("/api", dataRoutes);
app.use("/api/ai", aiRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || "Internal server error.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export { app };
