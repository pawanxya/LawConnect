import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clientName: { type: String, required: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lawyer", required: true },
    lawyerName: { type: String, required: true },
    caseTitle: { type: String, required: true },
    amount: { type: Number, required: true },
    commissionAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["completed", "pending", "disputed", "refunded"],
      default: "pending",
    },
    paidAt: { type: String, required: true },
    method: { type: String, default: "UPI" },
  },
  { timestamps: true },
);

transactionSchema.index({ bookingId: 1 }, { unique: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

export { Transaction };
