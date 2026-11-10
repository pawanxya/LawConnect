import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Booking } from "./models/Booking.js";
import { Lawyer } from "./models/Lawyer.js";
import { Message } from "./models/Message.js";
import { Notification } from "./models/Notification.js";
import { corsOptions } from "./config/cors.js";

let io;
const onlineUsers = new Map(); // roomId -> Set<socketId>

const addOnlineRoom = (roomId, socketId) => {
  if (!roomId) return;

  const roomKey = roomId.toString();
  const sockets = onlineUsers.get(roomKey) || new Set();
  sockets.add(socketId);
  onlineUsers.set(roomKey, sockets);
};

const removeOnlineRoom = (roomId, socketId) => {
  if (!roomId) return;

  const roomKey = roomId.toString();
  const sockets = onlineUsers.get(roomKey);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(roomKey);
  }
};

const isRoomOnline = (roomId) => {
  if (!roomId) return false;
  return (onlineUsers.get(roomId.toString())?.size || 0) > 0;
};

const resolveMessagingRoomIds = async (identifier) => {
  if (!identifier) {
    return [];
  }

  const normalizedId = identifier.toString();
  const roomIds = new Set([normalizedId]);

  // For backward compatibility and to ensure we catch all sessions, 
  // check if this ID is a lawyer's _id or userId
  const lawyer = await Lawyer.findOne({
    $or: [{ _id: normalizedId }, { userId: normalizedId }],
  }).select("_id userId").lean();

  if (lawyer) {
    roomIds.add(lawyer._id.toString());
    if (lawyer.userId) {
      roomIds.add(lawyer.userId.toString());
    }
  }

  return Array.from(roomIds);
};

const emitToResolvedRooms = async (identifier, eventName, payload) => {
  const roomIds = await resolveMessagingRoomIds(identifier);
  roomIds.forEach((roomId) => io.to(roomId).emit(eventName, payload));
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: corsOptions,
  });

  io.use((socket, next) => {
    try {
      const ticket = socket.handshake.auth?.ticket;
      const payload = jwt.verify(ticket, process.env.JWT_SECRET);
      if (payload.scope !== "messaging" || !payload.sub) throw new Error("Invalid ticket");
      socket.userId = payload.sub.toString();
      next();
    } catch {
      next(new Error("Unauthorized socket connection"));
    }
  });

  io.on("connection", (socket) => {
    socket.joinedRoomIds = new Set();
    console.log(`Client connected: ${socket.id}`);

    // Join room & mark online
    socket.on("join", async () => {
      const roomIds = await resolveMessagingRoomIds(socket.userId);

      roomIds.forEach((roomId) => {
        socket.join(roomId);
        socket.joinedRoomIds.add(roomId);
        addOnlineRoom(roomId, socket.id);
      });

      console.log(`Socket ${socket.id} joined rooms: ${roomIds.join(", ")}`);
      socket.broadcast.emit("user_status", { userId: socket.userId, status: "online" });
    });

    // Check online status of another user
    socket.on("check_status", async (userId, callback) => {
      if (!callback) return;

      const roomIds = await resolveMessagingRoomIds(userId);
      const isOnline = roomIds.some((roomId) => isRoomOnline(roomId));
      callback({ status: isOnline ? "online" : "offline" });
    });

    // Send message
    socket.on("send_message", async (data, callback) => {
      try {
        const { receiverId, content, senderName, attachment, bookingId } = data;
        const trimmedContent = typeof content === "string" ? content.trim() : "";

        if (!socket.userId) {
          callback?.({ success: false, error: "Join the socket before sending messages." });
          return;
        }

        if (!receiverId || (!trimmedContent && !attachment)) {
          callback?.({ success: false, error: "Missing receiverId or content/attachment" });
          return;
        }

        // A room is not enough authorization: both participants must share a consultation.
        const senderAsLawyer = await Lawyer.exists({ _id: socket.userId });
        const bookingFilter = senderAsLawyer
          ? { lawyerId: socket.userId, clientId: receiverId, status: { $in: ["pending", "approved", "completed", "paid"] } }
          : { clientId: socket.userId, lawyerId: receiverId, status: { $in: ["pending", "approved", "completed", "paid"] } };
        const booking = await Booking.findOne(bookingFilter).select("_id").lean();
        if (!booking) {
          callback?.({ success: false, error: "Messaging is available after a consultation booking." });
          return;
        }

        const message = new Message({
          senderId: socket.userId,
          senderName,
          receiverId: receiverId.toString(),
          content: trimmedContent || "Attachment shared",
          attachment: attachment || null,
          bookingId: booking._id,
          timestamp: new Date().toISOString(),
          read: false,
        });

        await message.save();

        const payload = {
          _id: message._id.toString(),
          id: message._id.toString(),
          senderId: message.senderId.toString(),
          senderName: message.senderName,
          receiverId: message.receiverId.toString(),
          content: message.content,
          attachment: message.attachment,
          bookingId: message.bookingId?.toString() || "",
          timestamp: message.timestamp,
          read: false,
          tempId: data.tempId,
        };

        // Emit to receiver
        await emitToResolvedRooms(receiverId, "receive_message", payload);
        // Emit back to sender so they see their own message in real-time (frontend deduplicates by ID)
        await emitToResolvedRooms(socket.userId, "receive_message", payload);

        // Create a database notification for the receiver
        try {
          const notification = await Notification.create({
            userId: receiverId.toString(),
            type: "new_message",
            title: `New message from ${senderName}`,
            body: trimmedContent.length > 60 ? `${trimmedContent.substring(0, 60)}...` : trimmedContent || "Attachment shared",
            link: "/messages",
          });

          const notifPayload = {
            id: notification._id.toString(),
            type: "new_message",
            title: notification.title,
            body: notification.body,
            link: notification.link,
            read: false,
            createdAt: notification.createdAt,
          };
          await emitToResolvedRooms(receiverId, "new_notification", notifPayload);
        } catch (err) {
          console.error("Failed to create message notification in socket:", err);
        }

        callback?.({ success: true, messageId: message._id.toString(), message: payload });
      } catch (error) {
        console.error("Error sending message:", error);
        callback?.({ success: false, error: error.message });
      }
    });

    // Typing indicators
    socket.on("typing", ({ to }) => {
      if (to) {
        resolveMessagingRoomIds(to).then((roomIds) => {
          roomIds.forEach((roomId) => socket.to(roomId).emit("user_typing", { userId: socket.userId }));
        });
      }
    });

    socket.on("stop_typing", ({ to }) => {
      if (to) {
        resolveMessagingRoomIds(to).then((roomIds) => {
          roomIds.forEach((roomId) => socket.to(roomId).emit("user_stopped_typing", { userId: socket.userId }));
        });
      }
    });

    // Read receipts
    socket.on("mark_read", async ({ messageIds, to }) => {
      try {
        if (messageIds && messageIds.length > 0) {
          await Message.updateMany(
            { _id: { $in: messageIds } },
            { read: true },
          );

          const roomIds = await resolveMessagingRoomIds(to);
          roomIds.forEach((roomId) => socket.to(roomId).emit("messages_read", { messageIds }));
        }
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    });

    socket.on("disconnect", () => {
      if (socket.joinedRoomIds?.size) {
        socket.joinedRoomIds.forEach((roomId) => removeOnlineRoom(roomId, socket.id));
      }

      if (socket.userId) {
        socket.broadcast.emit("user_status", { userId: socket.userId, status: "offline" });
      }
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

export const getIo = () => io;
