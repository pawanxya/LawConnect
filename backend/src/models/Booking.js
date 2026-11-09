import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lawyer",
      required: true,
      index: true,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      default: null,
    },
    slotId: {
      type: String,
      default: "",
      index: true,
    },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    timeSlot: { type: String, required: true }, // "10:00-11:00"
    status: {
      type: String,
      enum: ["pending", "approved", "completed", "cancelled", "paid"],
      default: "pending",
      index: true,
    },
    notes: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    // Denormalized for quick display
    clientName: { type: String, required: true },
    lawyerName: { type: String, required: true },
  },
  { timestamps: true },
);

// Compound index for overlap checks
bookingSchema.index({ lawyerId: 1, date: 1, timeSlot: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export { Booking };
