import mongoose from "mongoose";

const hearingSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
  },
  { timestamps: false },
);

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: "" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, default: "" },
    url: { type: String, default: "#" },
  },
  { timestamps: false },
);

const timelineSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, default: "update" },
    addedByRole: { type: String, enum: ["lawyer", "client", "system"], default: "system" },
  },
  { timestamps: false },
);

const caseSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: "Lawyer", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "active", "closed", "rejected"],
      default: "pending",
    },
    finalFee: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    hearingDates: { type: [hearingSchema], default: [] },
    documents: { type: [documentSchema], default: [] },
    timeline: { type: [timelineSchema], default: [] },
  },
  { timestamps: true },
);

const Case = mongoose.model("Case", caseSchema);

export { Case };
