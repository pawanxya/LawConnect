import mongoose from "mongoose";

// Keeps a server-side record of the amount and owner expected for every Razorpay order.
const paymentOrderSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    plan: { type: String, enum: ["plus", "premium"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    razorpayPaymentId: { type: String, default: "" },
  },
  { timestamps: true },
);

export const PaymentOrder = mongoose.model("PaymentOrder", paymentOrderSchema);
