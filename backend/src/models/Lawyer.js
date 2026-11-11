import mongoose from "mongoose";

const consultationSlotSchema = new mongoose.Schema({
  lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lawyer" },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isBooked: { type: Boolean, default: false },
});

const lawyerSchema = new mongoose.Schema(
  {
    clerkId: { type: String, unique: true, sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    name: { type: String, required: true },
    role: { type: String, default: "lawyer" },
    membershipTier: { type: String, enum: ["", "basic", "premium"], default: "" },
    specialization: [{ type: String }],
    experience: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    baseCaseFee: { type: Number, default: 5000 },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    location: { type: String },
    phone: { type: String, default: "" },
    bio: { type: String },
    verified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
    },
    verificationSubmittedAt: { type: Date, default: null },
    verificationReviewedAt: { type: Date, default: null },
    verificationNotes: { type: String, default: "" },
    reputationScore: { type: Number, default: 0 },
    barId: { type: String },
    barCouncil: { type: String, default: "" },
    education: { type: String, default: "" },
    professionalBackground: { type: String, default: "" },
    availability: { type: String, enum: ["available", "busy", "away"], default: "available" },
    avatar: { type: String },
    isPriority: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
    services: [
      {
        name: { type: String, required: true },
        fee: { type: Number, required: true },
        description: { type: String },
      },
    ],
    consultationSlots: [consultationSlotSchema],
  },
  { timestamps: true },
);

export const Lawyer = mongoose.model("Lawyer", lawyerSchema);
