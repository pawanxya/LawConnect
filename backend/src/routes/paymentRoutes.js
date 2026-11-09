import { Router } from "express";
import { createOrder, verifyPayment, createSubscriptionOrder, verifySubscriptionPayment } from "../controllers/paymentController.js";
import { authRequired } from "../middleware/auth.js";

const paymentRoutes = Router();

paymentRoutes.post("/create-order", authRequired, createOrder);
paymentRoutes.post("/verify-payment", authRequired, verifyPayment);
paymentRoutes.post("/subscription/order", authRequired, createSubscriptionOrder);
paymentRoutes.post("/subscription/verify", authRequired, verifySubscriptionPayment);

export { paymentRoutes };
