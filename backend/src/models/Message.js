import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    attachment: { type: Object, default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    timestamp: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Message = mongoose.model("Message", messageSchema);

export { Message };
