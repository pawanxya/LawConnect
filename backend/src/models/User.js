import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    role: {
      type: String,
      enum: ["client", "lawyer", "admin"],
      default: "client",
      required: true,
    },
    avatar: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    bio: { type: String, default: "" },
    membershipTier: {
      type: String,
      enum: ["basic", "plus", ""],
      default: "",
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema, "clients");

export { User };
