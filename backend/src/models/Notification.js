import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "booking_created",
        "booking_confirmed",
        "booking_approved",
        "booking_cancelled",
        "booking_completed",
        "lawyer_approved",
        "lawyer_rejected",
        "new_message",
        "case_update",
        "review_received",
        "general",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    link: { type: String, default: "" }, // deep link e.g. /client/dashboard
  },
  { timestamps: true },
);

// Compound index for fast unread count queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export { Notification };
