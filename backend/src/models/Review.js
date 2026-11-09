import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clientName: { type: String, required: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lawyer", required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    date: { type: String, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case" },
  },
  { timestamps: true },
);

const Review = mongoose.model("Review", reviewSchema);

export { Review };
