import { Booking } from "../models/Booking.js";
import { Lawyer } from "../models/Lawyer.js";
import { Notification } from "../models/Notification.js";
import { Transaction } from "../models/Transaction.js";
import { getIo } from "../socket.js";

const toBookingDto = (b) => ({
  id: b._id.toString(),
  clientId: (b.clientId?._id || b.clientId)?.toString(),
  lawyerId: (b.lawyerId?._id || b.lawyerId)?.toString(),
  caseId: b.caseId?.toString() || null,
  slotId: b.slotId || "",
  clientName: b.clientName,
  clientAvatar: b.clientId?.avatar || "",
  lawyerName: b.lawyerName,
  lawyerAvatar: b.lawyerId?.avatar || "",
  date: b.date,
  timeSlot: b.timeSlot,
  status: b.status,
  notes: b.notes,
  amount: b.amount,
  paymentStatus: b.paymentStatus,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

const PAYMENT_METHODS = ["upi", "card", "netbanking"];

const emitLawyerSlotsUpdated = (lawyer) => {
  try {
    const io = getIo();
    io.emit("lawyer_slots_updated", {
      lawyerId: lawyer._id.toString(),
      userId: lawyer._id.toString(),
      slots: (lawyer.consultationSlots || []).map((slot) => ({
        id: slot._id?.toString(),
        lawyerId: slot.lawyerId?.toString() || lawyer._id.toString(),
        bookingId: slot.bookingId?.toString() || "",
        day: slot.day || "",
        date: slot.date || "",
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.duration || 60,
        status: slot.status || (slot.isBooked ? "booked" : "available"),
        isBooked: Boolean(slot.isBooked || slot.status === "booked"),
      })),
    });
  } catch (error) {
    console.error("Failed to emit lawyer slot update", error);
  }
};

const emitBookingUpdated = (booking) => {
  try {
    const io = getIo();
    const payload = {
      id: booking._id.toString(),
      clientId: booking.clientId?.toString(),
      lawyerId: booking.lawyerId?.toString(),
      caseId: booking.caseId?.toString() || null,
      slotId: booking.slotId || "",
      clientName: booking.clientName,
      lawyerName: booking.lawyerName,
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: booking.status,
      notes: booking.notes,
      amount: booking.amount,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };

    io.to(payload.clientId).emit("booking_updated", payload);
    io.to(payload.lawyerId).emit("booking_updated", payload);
  } catch (error) {
    console.error("Failed to emit booking update", error);
  }
};

const createNotification = async ({ userId, type, title, body, link = "" }) => {
  try {
    const notification = await Notification.create({ userId, type, title, body, link });
    const io = getIo();
    io.to(userId.toString()).emit("new_notification", {
      id: notification._id.toString(),
      type,
      title,
      body,
      link,
      read: false,
      createdAt: notification.createdAt,
    });
  } catch (err) {
    console.error("Notification creation failed:", err.message);
  }
};

const syncTransactionWithBooking = async ({ booking, status, method }) => {
  if (!booking) {
    return null;
  }

  const nextMethod = method
    ? String(method).toUpperCase()
    : status === "refunded"
      ? "REFUND"
      : "UPI";

  const transactionPayload = {
    bookingId: booking._id,
    clientId: booking.clientId,
    clientName: booking.clientName,
    lawyerId: booking.lawyerId,
    lawyerName: booking.lawyerName,
    caseTitle: `Consultation on ${booking.date}`,
    amount: booking.amount,
    currency: "INR",
    status,
    paidAt: new Date().toISOString().split("T")[0],
    method: nextMethod,
  };

  return await Transaction.findOneAndUpdate(
    { bookingId: booking._id },
    transactionPayload,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

const isPastDate = (dateValue) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(dateValue);

  return Number.isNaN(selectedDate.getTime()) || selectedDate < today;
};

const releaseBookedSlot = async (booking) => {
  if (!booking?.slotId) {
    return;
  }

  const lawyer = await Lawyer.findById(booking.lawyerId);
  if (!lawyer) {
    return;
  }

  const slot = lawyer.consultationSlots.id(booking.slotId);
  if (!slot) {
    return;
  }

  slot.status = "available";
  slot.isBooked = false;
  slot.clientId = null;
  slot.bookingId = null;
  await lawyer.save();
  emitLawyerSlotsUpdated(lawyer);
};

const createBooking = async (req, res) => {
  const { lawyerId, date, timeSlot, notes, caseId, slotId } = req.body;

  if (!lawyerId) {
    return res.status(400).json({ message: "lawyerId is required." });
  }

  const lawyer = await Lawyer.findById(lawyerId);
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer not found." });
  }

  if (!lawyer.verified) {
    return res.status(403).json({ message: "This lawyer is not yet available for consultation." });
  }

  let bookingDate = date;
  let bookingTimeSlot = timeSlot;
  let lockedLawyer = null;

  // -------------------------------------------------------------
  // ATOMIC CONCURRENCY CONTROL (Race Condition & Double-Booking Prevention)
  // Atomically flips isBooked from false to true using MongoDB's document-level lock.
  // -------------------------------------------------------------
  if (slotId) {
    lockedLawyer = await Lawyer.findOneAndUpdate(
      {
        _id: lawyerId,
        "consultationSlots._id": slotId,
        "consultationSlots.isBooked": false,
        "consultationSlots.status": { $ne: "booked" },
      },
      {
        $set: {
          "consultationSlots.$.isBooked": true,
          "consultationSlots.$.status": "booked",
          "consultationSlots.$.clientId": req.user._id,
        },
      },
      { new: true },
    );

    if (!lockedLawyer) {
      return res.status(409).json({
        message: "This consultation slot was just acquired by another client. Please select an alternate slot.",
        code: "SLOT_CONFLICT_RACE_PREVENTED",
      });
    }

    const slot = lockedLawyer.consultationSlots.id(slotId);
    if (!slot || !slot.date) {
      // Revert if slot data invalid
      await Lawyer.updateOne(
        { _id: lawyerId, "consultationSlots._id": slotId },
        { $set: { "consultationSlots.$.isBooked": false, "consultationSlots.$.status": "available", "consultationSlots.$.clientId": null } },
      );
      return res.status(400).json({ message: "Selected slot is incomplete." });
    }

    bookingDate = slot.date;
    bookingTimeSlot = `${slot.startTime} - ${slot.endTime}`;
  }

  if (!bookingDate || !bookingTimeSlot) {
    if (slotId) {
      await Lawyer.updateOne(
        { _id: lawyerId, "consultationSlots._id": slotId },
        { $set: { "consultationSlots.$.isBooked": false, "consultationSlots.$.status": "available", "consultationSlots.$.clientId": null } },
      );
    }
    return res.status(400).json({ message: "Please select an available slot." });
  }

  if (isPastDate(bookingDate)) {
    if (slotId) {
      await Lawyer.updateOne(
        { _id: lawyerId, "consultationSlots._id": slotId },
        { $set: { "consultationSlots.$.isBooked": false, "consultationSlots.$.status": "available", "consultationSlots.$.clientId": null } },
      );
    }
    return res.status(400).json({ message: "Past consultation dates cannot be booked." });
  }

  if (req.user.role === "client") {
    if (!req.user.membershipTier || (req.user.membershipTier !== "basic" && req.user.membershipTier !== "plus")) {
      if (slotId) {
        await Lawyer.updateOne(
          { _id: lawyerId, "consultationSlots._id": slotId },
          { $set: { "consultationSlots.$.isBooked": false, "consultationSlots.$.status": "available", "consultationSlots.$.clientId": null } },
        );
      }
      return res.status(403).json({ message: "Please choose a membership plan before booking a consultation." });
    }

    if (req.user.membershipTier === "basic") {
      const existingBookingsCount = await Booking.countDocuments({ 
        clientId: req.user._id, 
        status: { $ne: "cancelled" } 
      });
      if (existingBookingsCount >= 1) {
        if (slotId) {
          await Lawyer.updateOne(
            { _id: lawyerId, "consultationSlots._id": slotId },
            { $set: { "consultationSlots.$.isBooked": false, "consultationSlots.$.status": "available", "consultationSlots.$.clientId": null } },
          );
        }
        return res.status(403).json({ 
          message: "Under the free Basic Plan, you can only book exactly 1 consultation. Please upgrade to Client Plus for unlimited bookings." 
        });
      }
    }
  }

  const conflict = await Booking.findOne({
    lawyerId,
    date: bookingDate,
    timeSlot: bookingTimeSlot,
    status: { $in: ["pending", "approved"] },
  });
  if (conflict) {
    if (slotId) {
      await Lawyer.updateOne(
        { _id: lawyerId, "consultationSlots._id": slotId },
        { $set: { "consultationSlots.$.isBooked": false, "consultationSlots.$.status": "available", "consultationSlots.$.clientId": null } },
      );
    }
    return res.status(409).json({ message: "This time slot is already booked. Please choose another." });
  }

  let booking;
  try {
    booking = await Booking.create({
      clientId: req.user._id,
      clientName: req.user.name,
      lawyerId,
      lawyerName: lawyer.name,
      caseId: caseId || null,
      slotId: slotId || "",
      date: bookingDate,
      timeSlot: bookingTimeSlot,
      notes: notes || "",
      amount: lawyer.hourlyRate || 0,
      status: "pending",
      paymentStatus: "unpaid",
    });

    if (slotId && lockedLawyer) {
      await Lawyer.updateOne(
        { _id: lawyerId, "consultationSlots._id": slotId },
        { $set: { "consultationSlots.$.bookingId": booking._id } },
      );
      emitLawyerSlotsUpdated(lockedLawyer);
    }
  } catch (creationError) {
    // Automatic Rollback of slot reservation if booking persistence fails
    if (slotId) {
      await Lawyer.updateOne(
        { _id: lawyerId, "consultationSlots._id": slotId },
        { $set: { "consultationSlots.$.isBooked": false, "consultationSlots.$.status": "available", "consultationSlots.$.clientId": null } },
      );
    }
    throw creationError;
  }

  if (lawyer._id) {
    await createNotification({
      userId: lawyer._id,
      type: "booking_created",
      title: "New Consultation Booking",
      body: `${req.user.name} has booked a consultation on ${bookingDate} at ${bookingTimeSlot}.`,
      link: "/lawyer/dashboard",
    });
  }

  emitBookingUpdated(booking);

  return res.status(201).json({ booking: toBookingDto(booking.toObject()) });
};

const payBooking = async (req, res) => {
  const { method = "upi" } = req.body || {};
  const normalizedMethod = String(method || "").trim().toLowerCase();

  if (!PAYMENT_METHODS.includes(normalizedMethod)) {
    return res.status(400).json({ message: "Invalid payment method." });
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({ message: "Booking not found." });
  }

  if (booking.clientId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You can only pay for your own bookings." });
  }

  if (booking.status === "cancelled") {
    return res.status(400).json({ message: "Cancelled bookings cannot be paid." });
  }

  if (booking.paymentStatus === "paid") {
    const existingTransaction = await Transaction.findOne({ bookingId: booking._id }).lean();
    return res.status(200).json({
      booking: toBookingDto(booking.toObject()),
      transactionId: existingTransaction?._id?.toString() || "",
      message: "This consultation has already been paid.",
    });
  }

  booking.paymentStatus = "paid";
  await booking.save();

  const transaction = await syncTransactionWithBooking({
    booking,
    status: "completed",
    method: normalizedMethod,
  });

  const lawyer = await Lawyer.findById(booking.lawyerId).select("_id").lean();
  if (lawyer?._id) {
    await createNotification({
      userId: lawyer._id,
      type: "payment_received",
      title: "Consultation Payment Received",
      body: `${booking.clientName} paid for the consultation scheduled on ${booking.date} at ${booking.timeSlot}.`,
      link: "/lawyer/dashboard",
    });
  }

  await createNotification({
    userId: booking.clientId,
    type: "payment_completed",
    title: "Payment Successful",
    body: `Your payment for the consultation on ${booking.date} at ${booking.timeSlot} was successful.`,
    link: "/bookings",
  });

  emitBookingUpdated(booking);

  return res.status(200).json({
    booking: toBookingDto(booking.toObject()),
    transactionId: transaction?._id?.toString() || "",
    message: "Payment completed successfully.",
  });
};

const getBookings = async (req, res) => {
  const { role, _id: userId } = req.user;
  let filter = {};

  if (role === "client") {
    filter = { clientId: userId };
  } else if (role === "lawyer") {
    filter = { lawyerId: userId };
  }

  const bookings = await Booking.find(filter)
    .populate("clientId", "avatar")
    .populate("lawyerId", "avatar")
    .sort({ date: -1, createdAt: -1 })
    .lean();
  return res.status(200).json({ bookings: bookings.map(toBookingDto) });
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "approved", "cancelled", "completed", "paid"];

    console.log(`[BOOKING] Attempting status update to: ${status} for ID: ${req.params.id}`);

    if (!req.params.id || req.params.id === "undefined") {
      return res.status(400).json({ message: "Invalid booking ID." });
    }

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    console.log(`[BOOKING] Current status: ${booking.status}, Target status: ${status}`);

    if (req.user.role === "lawyer") {
      if (req.user._id.toString() !== booking.lawyerId.toString()) {
        return res.status(403).json({ message: "You can only manage your own bookings." });
      }

      if (status === "approved" && booking.status !== "approved") {
        if (req.user.membershipTier === "basic" || !req.user.membershipTier) {
          const approvedCount = await Booking.countDocuments({
            lawyerId: req.user._id,
            status: { $in: ["approved", "completed", "paid"] },
          });
          if (approvedCount >= 1) {
            return res.status(403).json({ 
              message: "Under the free Basic Plan, you can only approve exactly 1 consultation. Please upgrade to Premium." 
            });
          }
        }
      }
    }

    const transitionMap = {
      pending: ["approved", "cancelled", "paid"],
      approved: ["completed", "cancelled", "paid"],
      paid: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    const currentStatus = booking.status || "pending";
    if (currentStatus !== status && !transitionMap[currentStatus]?.includes(status)) {
      console.error(`[BOOKING] Blocked invalid transition: ${currentStatus} -> ${status}`);
      return res.status(400).json({ message: `Cannot change status from ${currentStatus} to ${status}` });
    }

    if (status === "completed" && booking.amount > 0 && booking.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Only paid consultations can be marked as completed." });
    }

    booking.status = status;
    console.log(`[BOOKING] Saving new status: ${status}`);
    await booking.save();

    if (status === "cancelled") {
      await releaseBookedSlot(booking);
      if (booking.paymentStatus === "paid") {
        booking.paymentStatus = "refunded";
        await booking.save();
        await syncTransactionWithBooking({ booking, status: "refunded", method: "refund" });
      }
    }

    const dto = toBookingDto(booking.toObject());

    const notifMap = {
      approved: {
        type: "booking_approved",
        title: "Booking Approved!",
        body: `Your consultation on ${booking.date} at ${booking.timeSlot} has been approved.`,
      },
      cancelled: {
        type: "booking_cancelled",
        title: "Booking Cancelled",
        body: `Your consultation on ${booking.date} at ${booking.timeSlot} was cancelled.`,
      },
      completed: {
        type: "booking_completed",
        title: "Consultation Completed",
        body: `Your consultation with ${booking.lawyerName} is now marked as completed.`,
      },
    };

    if (notifMap[status]) {
      await createNotification({
        userId: booking.clientId,
        ...notifMap[status],
        link: "/client/dashboard",
      });
    }

    if (booking.slotId) {
      const lawyer = await Lawyer.findById(booking.lawyerId);
      if (lawyer) {
        emitLawyerSlotsUpdated(lawyer);
      }
    }

    emitBookingUpdated(booking);

    return res.status(200).json({ booking: dto });
  } catch (error) {
    console.error("[BOOKING ERROR]", error);
    return res.status(500).json({ message: "Internal server error during status update." });
  }
};

const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({ message: "Booking not found." });
  }

  if (booking.clientId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You can only cancel your own bookings." });
  }

  if (!["pending", "approved"].includes(booking.status)) {
    return res.status(400).json({ message: "Only pending or approved bookings can be cancelled." });
  }

  booking.status = "cancelled";
  await booking.save();
  await releaseBookedSlot(booking);

  if (booking.paymentStatus === "paid") {
    booking.paymentStatus = "refunded";
    await booking.save();
    await syncTransactionWithBooking({ booking, status: "refunded", method: "refund" });
  }

  const lawyer = await Lawyer.findById(booking.lawyerId).select("_id").lean();
  if (lawyer?._id) {
    await createNotification({
      userId: lawyer._id,
      type: "booking_cancelled",
      title: "Consultation Cancelled",
      body: `${booking.clientName} cancelled the consultation scheduled on ${booking.date} at ${booking.timeSlot}.`,
      link: "/lawyer/dashboard",
    });
  }

  emitBookingUpdated(booking);

  return res.status(200).json({ booking: toBookingDto(booking.toObject()) });
};

export { cancelBooking, createBooking, getBookings, payBooking, updateBookingStatus };
