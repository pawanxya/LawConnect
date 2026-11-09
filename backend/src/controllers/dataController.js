import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Case } from "../models/Case.js";
import { Lawyer } from "../models/Lawyer.js";
import { Message } from "../models/Message.js";
import { Notification } from "../models/Notification.js";
import { Review } from "../models/Review.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { getIo } from "../socket.js";

const updateLawyerReputation = async (lawyerId) => {
  try {
    const lawyer = await Lawyer.findById(lawyerId);
    if (!lawyer) return;

    // 1. Rating Factor (Max 50 points)
    const ratingPoints = (lawyer.rating || 0) * 10;

    // 2. Review Volume Factor (Max 20 points)
    // 2 points per review, capped at 20
    const reviewPoints = Math.min((lawyer.totalReviews || 0) * 2, 20);

    // 3. Case Success/Completion Factor (Max 30 points)
    const cases = await Case.find({ lawyerId: lawyer._id }).lean();
    let successPoints = 0;
    if (cases.length > 0) {
      const closedCases = cases.filter(c => c.status === "closed").length;
      successPoints = Math.round((closedCases / cases.length) * 30);
    }

    lawyer.reputationScore = Math.min(Math.round(ratingPoints + reviewPoints + successPoints), 100);
    await lawyer.save();
    console.log(`Updated reputation for ${lawyer.name}: ${lawyer.reputationScore}`);
  } catch (error) {
    console.error("Error updating reputation score:", error);
  }
};

const toSlotDto = (slot) => ({
  id: slot._id?.toString(),
  lawyerId: slot.lawyerId?.toString() || "",
  bookingId: slot.bookingId?.toString() || "",
  day: slot.day || "",
  date: slot.date || "",
  startTime: slot.startTime,
  endTime: slot.endTime,
  duration: slot.duration || 30,
  status: slot.status || (slot.isBooked ? "booked" : "available"),
  isBooked: Boolean(slot.isBooked || slot.status === "booked"),
});

const toLawyerDto = (lawyer) => ({
  id: lawyer._id.toString(),
  userId: lawyer.userId?.toString() || "",
  email: lawyer.email,
  name: lawyer.name,
  role: lawyer.role,
  membershipTier: lawyer.membershipTier,
  specialization: lawyer.specialization,
  experience: lawyer.experience || 0,
  hourlyRate: lawyer.hourlyRate || 1000,
  baseCaseFee: lawyer.baseCaseFee || 5000,
  rating: lawyer.rating,
  totalReviews: lawyer.totalReviews,
  location: lawyer.location || "India",
  bio: lawyer.bio || `${lawyer.name} is available on LAWCONNECT for legal consultation and case support.`,
  verified: lawyer.verified,
  reputationScore: lawyer.reputationScore,
  barId: lawyer.barId,
  availability: lawyer.availability,
  avatar: lawyer.avatar,
  isPriority: lawyer.isPriority,
  isSponsored: lawyer.isSponsored,
  services: (lawyer.services || []).map(s => ({ id: s._id?.toString(), name: s.name, fee: s.fee, description: s.description })),
  consultationSlots: (lawyer.consultationSlots || []).map(toSlotDto),
  verificationStatus: lawyer.verified ? "verified" : "pending",
});

const toUserDto = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  phone: user.phone || "",
  location: user.location || "",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const toCaseDto = (caseItem) => ({
  id: caseItem._id.toString(),
  clientId: caseItem.clientId?.toString(),
  lawyerId: caseItem.lawyerId?.toString(),
  title: caseItem.title,
  description: caseItem.description,
  status: caseItem.status,
  finalFee: caseItem.finalFee || 0,
  paymentStatus: caseItem.paymentStatus || "unpaid",
  createdAt: caseItem.createdAt,
  updatedAt: caseItem.updatedAt,
  hearingDates: (caseItem.hearingDates || []).map((h) => ({
    id: h._id?.toString(),
    date: h.date,
    title: h.title,
    location: h.location,
    notes: h.notes,
    status: h.status || "pending",
  })),
  documents: (caseItem.documents || []).map((d) => ({
    id: d._id?.toString(),
    name: d.name,
    type: d.type,
    size: d.size,
    uploadedAt: d.uploadedAt,
    uploadedBy: d.uploadedBy,
    url: d.url,
  })),
  timeline: (caseItem.timeline || []).map((t) => ({
    id: t._id?.toString(),
    date: t.date,
    title: t.title,
    description: t.description,
    type: t.type,
    addedByRole: t.addedByRole || (["Progress Update", "Client Update"].includes(t.title) ? "client" : "lawyer"),
  })),
});

const toReviewDto = (review) => ({
  id: review._id.toString(),
  clientId: review.clientId?.toString(),
  clientName: review.clientName,
  lawyerId: review.lawyerId?.toString(),
  rating: review.rating,
  comment: review.comment,
  date: review.date,
});

const toMessageDto = (message) => ({
  id: message._id.toString(),
  senderId: message.senderId?.toString(),
  senderName: message.senderName,
  receiverId: message.receiverId?.toString(),
  content: message.content,
  attachment: message.attachment,
  bookingId: message.bookingId?.toString() || "",
  timestamp: message.timestamp,
  read: message.read,
});

const toTransactionDto = (transaction) => {
  const isSubscription = String(transaction.caseTitle).includes("Membership Subscription");
  const commission = transaction.commissionAmount !== undefined && transaction.commissionAmount !== null && transaction.commissionAmount > 0
    ? transaction.commissionAmount
    : (isSubscription ? 0 : Number((transaction.amount * 0.02).toFixed(2)));
  
  const net = transaction.netAmount !== undefined && transaction.netAmount !== null && transaction.netAmount > 0
    ? transaction.netAmount
    : (isSubscription ? transaction.amount : Number((transaction.amount * 0.98).toFixed(2)));

  return {
    id: transaction._id.toString(),
    bookingId: transaction.bookingId?.toString() || "",
    clientId: transaction.clientId?.toString(),
    clientName: transaction.clientName,
    lawyerId: transaction.lawyerId?.toString(),
    lawyerName: transaction.lawyerName,
    caseTitle: transaction.caseTitle,
    amount: transaction.amount,
    commissionAmount: commission,
    netAmount: net,
    currency: transaction.currency,
    status: transaction.status,
    paidAt: transaction.paidAt,
    method: transaction.method,
  };
};

export const toBookingDto = (b) => ({
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

const emitLawyerSlotsUpdated = (lawyer) => {
  try {
    const io = getIo();
    io.emit("lawyer_slots_updated", {
      lawyerId: lawyer._id.toString(),
      userId: lawyer.userId?.toString() || "",
      slots: lawyer.consultationSlots.map(toSlotDto),
    });
  } catch (error) {
    console.error("Socket emission failed:", error);
  }
};

const emitBookingUpdated = (booking) => {
  try {
    const io = getIo();
    io.to(booking.clientId?.toString()).emit("booking_updated", toBookingDto(booking));
    io.to(booking.lawyerId?.toString()).emit("booking_updated", toBookingDto(booking));
  } catch (error) {
    console.error("Socket emission failed:", error);
  }
};

const timeToMinutes = (timeValue) => {
  const [hours, minutes] = String(timeValue || "").split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return NaN;
  }

  return hours * 60 + minutes;
};

const getSlotValidation = ({ startTime, endTime }) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const duration = endMinutes - startMinutes;

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
    return { error: "Invalid start or end time." };
  }

  if (startMinutes < 10 * 60 || endMinutes > 16 * 60) {
    return { error: "Slots must stay between 10:00 AM and 4:00 PM." };
  }

  if (duration <= 0) {
    return { error: "End time must be after start time." };
  }

  if (duration !== 60) {
    return { error: "Each consultation slot must be exactly 1 hour." };
  }

  return { duration };
};

const getLawyers = async (req, res) => {
  const {
    q = "",
    specialization = "",
    location = "",
    verified = "",
  } = req.query;
  const filters = {};

  if (specialization && specialization !== "all") {
    filters.specialization = { $regex: String(specialization), $options: "i" };
  }
  if (location && location !== "all") {
    filters.location = { $regex: String(location), $options: "i" };
  }
  
  // Only apply verification filter if explicitly requested as true
  if (verified === "true") {
    filters.verified = true;
  }

  let lawyers = await Lawyer.find(filters).lean();

  if (q && q.trim() !== "") {
    const normalizedQuery = String(q).trim().toLowerCase();
    lawyers = lawyers.filter(
      (lawyer) =>
        (lawyer.name && lawyer.name.toLowerCase().includes(normalizedQuery)) ||
        (lawyer.specialization && lawyer.specialization.some((item) => item.toLowerCase().includes(normalizedQuery))) ||
        (lawyer.location && lawyer.location.toLowerCase().includes(normalizedQuery)),
    );
  }

  return res.status(200).json({ lawyers: lawyers.map(toLawyerDto) });
};

const getLawyerById = async (req, res) => {
  const lawyer = await Lawyer.findById(req.params.id).lean();
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer not found." });
  }

  const isAdmin = req.user?.role === "admin";
  const isOwner = req.user?._id && lawyer.userId?.toString() === req.user._id.toString();
  if (!lawyer.verified && !isAdmin && !isOwner) {
    return res.status(404).json({ message: "Lawyer not found." });
  }

  const reviews = await Review.find({ lawyerId: req.params.id }).lean();
  return res.status(200).json({
    lawyer: toLawyerDto(lawyer),
    reviews: reviews.map(toReviewDto),
  });
};

const getCases = async (req, res) => {
  console.log("Fetching cases for user:", req.user._id);
  const { role, _id: userId } = req.user;
  let filter = {};

  if (role === "client") {
    filter = { clientId: userId };
  } else if (role === "lawyer") {
    filter = { lawyerId: userId };
  }

  const cases = await Case.find(filter).sort({ createdAt: -1 }).lean();
  return res.status(200).json({ cases: cases.map(toCaseDto) });
};

const createCase = async (req, res) => {
  const { lawyerId, title, description } = req.body;
  if (!lawyerId || !title || !description) {
    return res.status(400).json({ message: "lawyerId, title and description required." });
  }

  if (req.user.role === "client") {
    if (req.user.membershipTier !== "plus") {
      return res.status(403).json({ 
        message: "To register or add a case, you must purchase the Client Plus plan. Please upgrade your membership." 
      });
    }
  }

  const lawyerData = await Lawyer.findById(lawyerId).select("verified baseCaseFee").lean();
  if (!lawyerData || !lawyerData.verified) {
    return res.status(404).json({ message: "Verified lawyer not found." });
  }

  const initialFee = lawyerData.baseCaseFee && lawyerData.baseCaseFee > 0 ? lawyerData.baseCaseFee : 5000;

  const newCase = await Case.create({
    clientId: req.user._id,
    lawyerId,
    title,
    description,
    status: "pending",
    finalFee: initialFee,
    timeline: [
      {
        date: new Date().toISOString().split("T")[0],
        title: "Consultation Request Sent",
        description: `Case request sent to lawyer with an estimated fee of INR ${initialFee}.`,
        type: "update",
      },
    ],
  });

  const dto = toCaseDto(newCase.toObject());
  try {
    const io = getIo();
    io.to(lawyerId.toString()).emit("case_update", dto);
  } catch (error) {
    console.error("Socket emission failed:", error);
  }

  return res.status(201).json({ caseItem: dto });
};

const updateCaseStatus = async (req, res) => {
  console.log("Updating case status:", req.params.id, "to", req.body.status);
  const { status, paymentStatus, finalFee } = req.body;
  if (status && !["pending", "active", "closed", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  const caseItem = await Case.findById(req.params.id);
  if (!caseItem) {
    return res.status(404).json({ message: "Case not found." });
  }

  if (req.user.role === "client") {
    if (status && status !== "closed") {
      return res.status(403).json({ message: "Clients can only mark a case as closed." });
    }
  }

  if (req.user.role === "lawyer") {
    if (!req.user.verified) {
      return res.status(403).json({ message: "Your lawyer account is pending verification." });
    }

    if (req.user._id.toString() !== caseItem.lawyerId.toString()) {
      return res.status(403).json({ message: "You can only update your assigned cases." });
    }

    if (status === "active") {
      const lawyer = await Lawyer.findById(caseItem.lawyerId).select("membershipTier").lean();
      if (!lawyer || lawyer.membershipTier !== "premium") {
        return res.status(403).json({ 
          message: "You must upgrade to the Premium Plan to accept and manage cases. The free Basic Plan only supports exactly 1 consultation." 
        });
      }
    }
  }

  if (status) {
    caseItem.status = status;
    
    if (status === "closed") {
      if (finalFee !== undefined) {
        caseItem.finalFee = Number(finalFee);
      } else if (!caseItem.finalFee || caseItem.finalFee === 0) {
        const lawyer = await Lawyer.findById(caseItem.lawyerId).select("baseCaseFee").lean();
        caseItem.finalFee = (lawyer && lawyer.baseCaseFee && lawyer.baseCaseFee > 0) ? lawyer.baseCaseFee : 5000;
      }
    }

    caseItem.timeline.push({
      date: new Date().toISOString().split("T")[0],
      title: `Case Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      description: status === "closed" 
        ? `The case has been marked as completed with a final fee of INR ${caseItem.finalFee}.`
        : `The case status was successfully updated to ${status}.`,
      type: "update",
    });
  }

  if (paymentStatus) {
    caseItem.paymentStatus = paymentStatus;
    if (paymentStatus === "paid") {
      caseItem.timeline.push({
        date: new Date().toISOString().split("T")[0],
        title: "Payment Verified",
        description: `Payment of INR ${caseItem.finalFee} settled successfully.`,
        type: "payment",
      });
    }
  }

  await caseItem.save();
  await updateLawyerReputation(caseItem.lawyerId);
  const dto = toCaseDto(caseItem.toObject());

  try {
    const io = getIo();
    io.to(caseItem.clientId.toString()).emit("case_update", dto);
    io.to(caseItem.lawyerId.toString()).emit("case_update", dto);
  } catch (error) {
    console.error("Socket emission failed:", error);
  }

  return res.status(200).json({ caseItem: dto });
};

const updateCaseFee = async (req, res) => {
  try {
    const { finalFee } = req.body;
    if (finalFee === undefined || isNaN(finalFee)) {
      return res.status(400).json({ message: "Valid finalFee is required." });
    }

    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ message: "Case not found." });
    }

    if (req.user._id.toString() !== caseItem.lawyerId.toString()) {
      return res.status(403).json({ message: "Only the assigned lawyer can update the case fee." });
    }

    caseItem.finalFee = Number(finalFee);
    
    // Add to timeline
    caseItem.timeline.push({
      date: new Date().toISOString().split("T")[0],
      title: "Case Fee Updated",
      description: `The lawyer has updated the final fee for this case to INR ${finalFee}.`,
      type: "update",
      addedByRole: "lawyer"
    });

    await caseItem.save();
    const dto = toCaseDto(caseItem.toObject());

    try {
      const io = getIo();
      io.to(caseItem.clientId.toString()).emit("case_update", dto);
      io.to(caseItem.lawyerId.toString()).emit("case_update", dto);
    } catch (e) {
      console.error("Socket error:", e);
    }

    return res.status(200).json({ caseItem: dto });
  } catch (error) {
    console.error("Error updating case fee:", error);
    return res.status(500).json({ message: "Failed to update case fee." });
  }
};

const addCaseTimelineEvent = async (req, res) => {
  const { title, description, type } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: "title and description are required." });
  }

  const caseItem = await Case.findById(req.params.id);
  if (!caseItem) {
    return res.status(404).json({ message: "Case not found." });
  }

  if (req.user.role === "client" && caseItem.clientId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You can only update your own cases." });
  }

  if (req.user.role === "lawyer") {
    if (!req.user.verified) {
      return res.status(403).json({ message: "Your lawyer account is pending verification." });
    }

    if (req.user._id.toString() !== caseItem.lawyerId.toString()) {
      return res.status(403).json({ message: "You can only update your assigned cases." });
    }
  }

  caseItem.timeline.push({
    date: new Date().toISOString().split("T")[0],
    title,
    description,
    type: type || "update",
    addedByRole: req.user.role,
  });
  await caseItem.save();

  const dto = toCaseDto(caseItem.toObject());

  try {
    const io = getIo();
    io.to(caseItem.clientId.toString()).emit("timeline_update", dto);
    io.to(caseItem.lawyerId.toString()).emit("timeline_update", dto);
  } catch (error) {
    console.error("Socket emission failed:", error);
  }

  return res.status(200).json({ caseItem: dto });
};

const addCaseHearing = async (req, res) => {
  try {
    const { date, title, location, notes } = req.body;
    if (!date || !title || !location) {
      return res.status(400).json({ message: "Date, title and location are required." });
    }

    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ message: "Case not found." });
    }

  // Permission check: only assigned lawyer can add hearings
  if (req.user._id.toString() !== caseItem.lawyerId.toString()) {
    return res.status(403).json({ message: "You can only add hearings to your assigned cases." });
  }

  // Add to hearingDates with default status
  caseItem.hearingDates.push({ 
    date, 
    title, 
    location, 
    notes,
    status: "pending" 
  });

  // Also add to timeline for visibility
  caseItem.timeline.push({
    date: new Date().toISOString().split("T")[0],
    title: "New Hearing Scheduled",
    description: `Hearing on ${date} at ${location}. Subject: ${title}`,
    type: "hearing",
    addedByRole: "lawyer",
  });

  await caseItem.save();
  const dto = toCaseDto(caseItem.toObject());

  try {
    const io = getIo();
    io.to(caseItem.clientId.toString()).emit("case_update", dto);
    io.to(caseItem.lawyerId.toString()).emit("case_update", dto);
  } catch (error) {
    console.error("Socket emission failed:", error);
  }

  return res.status(200).json({ caseItem: dto });
  } catch (error) {
    console.error("Error in addCaseHearing:", error);
    return res.status(500).json({ message: "Internal server error while scheduling hearing." });
  }
};

const updateHearingStatus = async (req, res) => {
  const { status } = req.body;
  const { id, hearingId } = req.params;

  const caseItem = await Case.findById(id);
  if (!caseItem) {
    return res.status(404).json({ message: "Case not found." });
  }

  // Permission check
  if (req.user._id.toString() !== caseItem.lawyerId.toString()) {
    return res.status(403).json({ message: "You are not authorized to update this case." });
  }

  const hearing = caseItem.hearingDates.find(h => (h._id ? h._id.toString() : h.id) === hearingId);
  if (!hearing) {
    return res.status(404).json({ message: "Hearing not found." });
  }

  hearing.status = status;

  if (status === "completed") {
    caseItem.timeline.push({
      date: new Date().toISOString().split("T")[0],
      title: "Hearing Completed",
      description: `Hearing on ${hearing.date} (${hearing.title}) has been marked as completed.`,
      type: "hearing",
      addedByRole: "lawyer",
    });
  }

  await caseItem.save();
  const dto = toCaseDto(caseItem.toObject());

  try {
    const io = getIo();
    io.to(caseItem.clientId.toString()).emit("case_update", dto);
    io.to(caseItem.lawyerId.toString()).emit("case_update", dto);
  } catch (error) {
    console.error("Socket emission failed:", error);
  }

  return res.status(200).json({ caseItem: dto });
};

const getMessages = async (req, res) => {
  const userId = req.user._id;
  const messages = await Message.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
  })
    .sort({ createdAt: 1 })
    .lean();

  return res.status(200).json({ messages: messages.map(toMessageDto) });
};

const createMessage = async (req, res) => {
  const { receiverId, content, attachment, bookingId } = req.body;
  if (!receiverId || (!content && !attachment)) {
    return res.status(400).json({ message: "receiverId and content (or attachment) are required." });
  }

  const sender = req.user;
  let linkedBooking = null;

  if (bookingId) {
    linkedBooking = await Booking.findById(bookingId).lean();
  }

  if (!linkedBooking) {
    if (sender.role === "client") {
      linkedBooking = await Booking.findOne({
        clientId: sender._id,
        lawyerId: receiverId,
        status: { $in: ["pending", "approved", "completed"] },
      }).lean();
    } else if (sender.role === "lawyer") {
      linkedBooking = await Booking.findOne({
        clientId: receiverId,
        lawyerId: sender._id,
        status: { $in: ["pending", "approved", "completed"] },
      }).lean();
    }
  }

  if (!linkedBooking) {
    return res.status(403).json({
      message: "Messaging is available only after a consultation booking exists.",
    });
  }

  const message = await Message.create({
    senderId: sender._id,
    senderName: sender.name,
    receiverId,
    content: content ? String(content).trim() : "",
    attachment: attachment || null,
    bookingId: linkedBooking._id,
    timestamp: new Date().toISOString(),
    read: false,
  });

  const dto = toMessageDto(message.toObject());

  // Create a database notification for the receiver
  try {
    const notification = await Notification.create({
      userId: receiverId.toString(),
      type: "new_message",
      title: `New message from ${sender.name}`,
      body: content ? (String(content).length > 60 ? `${String(content).substring(0, 60)}...` : String(content)) : "Attachment shared",
      link: "/messages",
    });

    const io = getIo();
    if (io) {
      const notifPayload = {
        id: notification._id.toString(),
        type: "new_message",
        title: notification.title,
        body: notification.body,
        link: notification.link,
        read: false,
        createdAt: notification.createdAt,
      };
      io.to(receiverId.toString()).emit("new_notification", notifPayload);
    }
  } catch (err) {
    console.error("Failed to create message notification in API createMessage:", err);
  }

  return res.status(201).json({ message: dto });
};

const getLawyerSlots = async (req, res) => {
  return res.status(200).json({ slots: (req.user.consultationSlots || []).map(toSlotDto) });
};

const createLawyerSlot = async (req, res) => {
  const { date, startTime, endTime } = req.body;
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: "date, startTime, and endTime are required." });
  }

  const slotValidation = getSlotValidation({ startTime, endTime });
  if (slotValidation.error) {
    return res.status(400).json({ message: slotValidation.error });
  }

  const lawyer = await Lawyer.findById(req.user._id);
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer profile not found." });
  }

  const duplicate = lawyer.consultationSlots.find(
    (slot) => slot.date === date && slot.startTime === startTime && slot.endTime === endTime,
  );
  if (duplicate) {
    return res.status(409).json({ message: "A slot already exists for this date and time." });
  }

  lawyer.consultationSlots.push({
    lawyerId: lawyer._id,
    date,
    startTime,
    endTime,
    duration: slotValidation.duration,
    status: "available",
    isBooked: false,
  });
  await lawyer.save();
  emitLawyerSlotsUpdated(lawyer);

  return res.status(201).json({
    slot: toSlotDto(lawyer.consultationSlots[lawyer.consultationSlots.length - 1]),
    slots: lawyer.consultationSlots.map(toSlotDto),
  });
};

const updateLawyerSlot = async (req, res) => {
  const { date, startTime, endTime } = req.body;
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: "date, startTime, and endTime are required." });
  }

  const slotValidation = getSlotValidation({ startTime, endTime });
  if (slotValidation.error) {
    return res.status(400).json({ message: slotValidation.error });
  }

  const lawyer = await Lawyer.findById(req.user._id);
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer profile not found." });
  }

  const slot = lawyer.consultationSlots.id(req.params.slotId);
  if (!slot) {
    return res.status(404).json({ message: "Slot not found." });
  }
  if (slot.status === "booked" || slot.isBooked) {
    return res.status(400).json({ message: "Booked slots cannot be edited." });
  }

  slot.date = date;
  slot.startTime = startTime;
  slot.endTime = endTime;
  slot.duration = slotValidation.duration;
  await lawyer.save();
  emitLawyerSlotsUpdated(lawyer);

  return res.status(200).json({
    slot: toSlotDto(slot),
    slots: lawyer.consultationSlots.map(toSlotDto),
  });
};

const deleteLawyerSlot = async (req, res) => {
  const lawyer = await Lawyer.findById(req.user._id);
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer profile not found." });
  }

  const slot = lawyer.consultationSlots.id(req.params.slotId);
  if (!slot) {
    return res.status(404).json({ message: "Slot not found." });
  }
  if (slot.status === "booked" || slot.isBooked) {
    return res.status(400).json({ message: "Booked slots cannot be deleted." });
  }

  slot.deleteOne();
  await lawyer.save();
  emitLawyerSlotsUpdated(lawyer);

  return res.status(200).json({ slots: lawyer.consultationSlots.map(toSlotDto) });
};

const getAdminOverview = async (_req, res) => {
  const [users, lawyers, cases, messages, reviews, transactions, bookings] = await Promise.all([
    User.find({}).lean(),
    Lawyer.find({}).lean(),
    Case.find({}).lean(),
    Message.find({}).lean(),
    Review.find({}).lean(),
    Transaction.find({}).sort({ createdAt: -1 }).lean(),
    Booking.find({}).sort({ createdAt: -1 }).lean(),
  ]);

  const subscriptionRevenue = transactions
    .filter((t) => t.status === "completed" && String(t.caseTitle).includes("Membership Subscription"))
    .reduce((sum, t) => sum + t.amount, 0);

  const commissionRevenue = transactions
    .filter((t) => t.status === "completed" && !String(t.caseTitle).includes("Membership Subscription"))
    .reduce((sum, t) => {
      const comm = t.commissionAmount !== undefined && t.commissionAmount !== null && t.commissionAmount > 0
        ? t.commissionAmount
        : Number((t.amount * 0.02).toFixed(2));
      return sum + comm;
    }, 0);

  const totalRevenue = Number((subscriptionRevenue + commissionRevenue).toFixed(2));

  return res.status(200).json({
    stats: {
      totalUsers: users.filter((u) => u.role === "client").length,
      totalLawyers: lawyers.filter((l) => l.verified).length,
      pendingLawyers: lawyers.filter((l) => !l.verified).length,
      totalTransactions: transactions.length,
      totalBookings: bookings.length,
      totalRevenue,
      activeCases: cases.filter((c) => c.status === "active").length,
      openDisputes: transactions.filter((t) => t.status === "disputed").length,
      totalMessages: messages.length,
      totalReviews: reviews.length,
    },
    users: users.filter((u) => u.role === "client").map(toUserDto),
    lawyers: lawyers.map(toLawyerDto),
    bookings: bookings.map(toBookingDto),
    transactions: transactions.map(toTransactionDto),
    cases: cases.map(toCaseDto),
  });
};

const updateLawyerVerification = async (req, res) => {
  const { verified } = req.body;
  const lawyer = await Lawyer.findById(req.params.id);
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer not found." });
  }

  lawyer.verified = Boolean(verified);
  await lawyer.save();

  return res.status(200).json({ lawyer: toLawyerDto(lawyer.toObject()) });
};

const deleteLawyerSlotByAdmin = async (req, res) => {
  const lawyer = await Lawyer.findById(req.params.id);
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer not found." });
  }

  const slot = lawyer.consultationSlots.id(req.params.slotId);
  if (!slot) {
    return res.status(404).json({ message: "Slot not found." });
  }
  if (slot.status === "booked" || slot.isBooked) {
    return res.status(400).json({ message: "Booked slots cannot be removed." });
  }

  slot.deleteOne();
  await lawyer.save();

  return res.status(200).json({ lawyer: toLawyerDto(lawyer.toObject()) });
};

const deleteLawyerByAdmin = async (req, res) => {
  const lawyer = await Lawyer.findById(req.params.id);
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer not found." });
  }

  if (lawyer.userId) {
    await User.deleteOne({ _id: lawyer.userId });
  }
  await Booking.deleteMany({ lawyerId: lawyer._id });
  await Case.deleteMany({ lawyerId: lawyer._id });
  await Review.deleteMany({ lawyerId: lawyer._id });
  await Transaction.deleteMany({ lawyerId: lawyer._id });
  await Lawyer.deleteOne({ _id: lawyer._id });

  return res.status(200).json({ success: true });
};

const deleteUserByAdmin = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (user.role === "admin") {
    return res.status(403).json({ message: "Cannot remove an admin user." });
  }

  await Booking.deleteMany({ clientId: user._id });
  await Case.deleteMany({ clientId: user._id });
  await Review.deleteMany({ clientId: user._id });
  await Transaction.deleteMany({ clientId: user._id });
  await User.deleteOne({ _id: user._id });

  return res.status(200).json({ success: true });
};

const updateTransactionStatus = async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["completed", "pending", "disputed", "refunded"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid transaction status." });
  }

  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found." });
  }

  transaction.status = status;
  await transaction.save();

  const booking = await Booking.findById(transaction.bookingId);
  if (booking) {
    if (status === "completed") {
      booking.paymentStatus = "paid";
    } else if (status === "refunded") {
      booking.paymentStatus = "refunded";
      if (booking.status !== "cancelled") {
        booking.status = "cancelled";
      }

       if (booking.slotId) {
         const lawyer = await Lawyer.findById(booking.lawyerId);
         const slot = lawyer?.consultationSlots.id(booking.slotId);
         if (slot) {
           slot.status = "available";
           slot.isBooked = false;
           slot.clientId = null;
           slot.bookingId = null;
           await lawyer.save();
           emitLawyerSlotsUpdated(lawyer);
         }
       }
    } else {
      booking.paymentStatus = "unpaid";
    }
    await booking.save();
    emitBookingUpdated(booking.toObject());
  }

  return res.status(200).json({ transaction: toTransactionDto(transaction.toObject()) });
};

const submitReview = async (req, res) => {
  const { lawyerId, rating, comment, bookingId, caseId } = req.body;

  if (!lawyerId || !rating || !comment) {
    return res.status(400).json({ message: "Lawyer ID, rating, and comment are required." });
  }

  const lawyer = await Lawyer.findById(lawyerId);
  if (!lawyer) {
    return res.status(404).json({ message: "Lawyer not found." });
  }

  // Verification check: Client must have a completed booking or case with this lawyer
  let checkFilter = { clientId: req.user._id, lawyerId };
  if (bookingId) checkFilter.bookingId = bookingId;
  if (caseId) checkFilter.caseId = caseId;

  const existingReview = await Review.findOne(checkFilter).lean();
  if (existingReview) {
    return res.status(409).json({ message: "You have already submitted a review for this activity." });
  }

  const review = await Review.create({
    clientId: req.user._id,
    lawyerId,
    clientName: req.user.name,
    rating,
    comment,
    bookingId,
    caseId,
    date: new Date().toISOString().split("T")[0],
  });

  const allReviews = await Review.find({ lawyerId });
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  lawyer.rating = Number(avgRating.toFixed(1));
  lawyer.totalReviews = allReviews.length;
  await lawyer.save();
  await updateLawyerReputation(lawyerId);

  return res.status(201).json({ review: toReviewDto(review.toObject()) });
};

const getLawyerEarnings = async (req, res) => {
  if (req.user.role !== "lawyer") {
    return res.status(403).json({ message: "Access denied." });
  }

  // Recalculate reputation score to ensure it's up to date on dashboard load
  await updateLawyerReputation(req.user._id);
  const lawyer = await Lawyer.findById(req.user._id).lean();

  const transactions = await Transaction.find({
    lawyerId: req.user._id,
    status: "completed",
  });

  const consultationTransactions = transactions.filter(t => String(t.caseTitle).startsWith("Consultation on "));
  const caseTransactions = transactions.filter(t => !String(t.caseTitle).startsWith("Consultation on "));

  // Helper to safely get netAmount (98%) and handle legacy transactions beautifully
  const getNet = (t) => t.netAmount !== undefined && t.netAmount !== null && t.netAmount > 0
    ? t.netAmount
    : Number((t.amount * 0.98).toFixed(2));

  const consultationEarnings = Number(consultationTransactions.reduce((sum, t) => sum + getNet(t), 0).toFixed(2));
  const caseEarnings = Number(caseTransactions.reduce((sum, t) => sum + getNet(t), 0).toFixed(2));
  const totalEarnings = Number(transactions.reduce((sum, t) => sum + getNet(t), 0).toFixed(2));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const thisMonthEarnings = Number(transactions
    .filter((t) => t.paidAt >= monthStart)
    .reduce((sum, t) => sum + getNet(t), 0).toFixed(2));

  // Count bookings directly to ensure free consultations are correctly counted
  const consultationsCount = await Booking.countDocuments({
    lawyerId: req.user._id,
    status: { $in: ["approved", "completed", "paid"] },
  });

  return res.status(200).json({ 
    totalEarnings, 
    consultationEarnings,
    caseEarnings,
    thisMonthEarnings, 
    transactionsCount: transactions.length,
    consultationsCount,
    casesCount: caseTransactions.length,
    reputationScore: lawyer?.reputationScore || 0,
    rating: lawyer?.rating || 0,
    totalReviews: lawyer?.totalReviews || 0,
  });
};

const updateCaseTimelineEvent = async (req, res) => {
  const { eventId } = req.params;
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: "title and description are required." });
  }

  const caseItem = await Case.findById(req.params.id);
  if (!caseItem) {
    return res.status(404).json({ message: "Case not found." });
  }

  // Permission check
  if (req.user.role === "client" && caseItem.clientId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You can only update your own cases." });
  }
  if (req.user.role === "lawyer" && req.user._id.toString() !== caseItem.lawyerId.toString()) {
    return res.status(403).json({ message: "You can only update your assigned cases." });
  }

  const event = caseItem.timeline.id(eventId);
  if (!event) {
    return res.status(404).json({ message: "Timeline event not found." });
  }

  // Role-based restriction: Only the creator role can edit
  if (event.addedByRole !== req.user.role) {
    return res.status(403).json({ message: `Only the ${event.addedByRole} can edit this event.` });
  }

  event.title = title;
  event.description = description;
  await caseItem.save();

  const dto = toCaseDto(caseItem.toObject());
  try {
    const io = getIo();
    io.to(caseItem.clientId.toString()).emit("timeline_update", dto);
    io.to(caseItem.lawyerId.toString()).emit("timeline_update", dto);
  } catch (error) {
    console.error("Socket emission failed:", error);
  }

  return res.status(200).json({ caseItem: dto });
};

const payCaseFee = async (req, res) => {
  console.log("Processing case fee payment for case:", req.params.id);
  const { method = "UPI" } = req.body;
  const caseItem = await Case.findById(req.params.id);

  if (!caseItem) {
    return res.status(404).json({ message: "Case not found." });
  }

  if (caseItem.clientId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the client can pay the case fee." });
  }

  if (caseItem.status !== "closed") {
    return res.status(400).json({ message: "Fee can only be paid for completed (closed) cases." });
  }

  if (caseItem.paymentStatus === "paid") {
    return res.status(400).json({ message: "Case fee has already been paid." });
  }

  caseItem.paymentStatus = "paid";
  caseItem.timeline.push({
    date: new Date().toISOString().split("T")[0],
    title: "Final Fee Paid",
    description: `The final case fee of INR ${caseItem.finalFee} has been successfully paid via ${method}.`,
    type: "update",
    addedByRole: "client",
  });

  await caseItem.save();

  // Create a transaction record
  const lawyer = await Lawyer.findById(caseItem.lawyerId).lean();
  await Transaction.create({
    bookingId: new mongoose.Types.ObjectId(), // Virtual booking ID for case fee
    clientId: caseItem.clientId,
    clientName: req.user.name,
    lawyerId: caseItem.lawyerId,
    lawyerName: lawyer?.name || "Lawyer",
    caseTitle: caseItem.title,
    amount: caseItem.finalFee,
    currency: "INR",
    status: "completed",
    paidAt: new Date().toISOString().split("T")[0],
    method: method,
  });

  const dto = toCaseDto(caseItem.toObject());

  try {
    const io = getIo();
    io.to(caseItem.clientId.toString()).emit("case_update", dto);
    io.to(caseItem.lawyerId.toString()).emit("case_update", dto);
  } catch (error) {
    console.error("Socket emission failed:", error);
  }

  return res.status(200).json({ caseItem: dto, message: "Payment successful." });
};

const updateMembershipTier = async (req, res) => {
  const { tier } = req.body;
  const validTiers = ["basic", "premium", "plus"];
  
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ message: "Invalid membership tier." });
  }

  let account = await User.findById(req.user._id);
  let isLawyerAccount = false;

  if (!account) {
    account = await Lawyer.findById(req.user._id);
    isLawyerAccount = true;
  }

  if (!account) {
    return res.status(404).json({ message: "Account not found." });
  }

  account.membershipTier = tier;
  await account.save();

  // Cross-update if linked
  if (isLawyerAccount && account.userId) {
    await User.findByIdAndUpdate(account.userId, { membershipTier: tier });
  } else if (!isLawyerAccount && account.role === "lawyer") {
    await Lawyer.findOneAndUpdate({ userId: account._id }, { membershipTier: tier });
  }

  return res.status(200).json({ 
    message: `Successfully upgraded to ${tier} plan.`,
    user: {
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      role: account.role,
      membershipTier: account.membershipTier
    }
  });
};

const updateLawyerProfile = async (req, res) => {
  try {
    const { hourlyRate, baseCaseFee, bio, location, specialization, services, experience } = req.body;
    const lawyer = await Lawyer.findById(req.user._id);
    if (!lawyer) {
      return res.status(404).json({ message: "Lawyer not found." });
    }

    if (hourlyRate !== undefined) lawyer.hourlyRate = Number(hourlyRate);
    if (baseCaseFee !== undefined) lawyer.baseCaseFee = Number(baseCaseFee);
    if (experience !== undefined) lawyer.experience = Number(experience);
    if (bio !== undefined) lawyer.bio = bio;
    if (location !== undefined) lawyer.location = location;
    if (specialization !== undefined) lawyer.specialization = specialization;
    if (services !== undefined) lawyer.services = services;

    await lawyer.save();
    return res.status(200).json({ message: "Profile updated successfully.", lawyer: toLawyerDto(lawyer) });
  } catch (error) {
    console.error("Error updating lawyer profile:", error);
    return res.status(500).json({ message: "Failed to update profile." });
  }
};

export {
  addCaseTimelineEvent,
  addCaseHearing,
  updateHearingStatus,
  createCase,
  createLawyerSlot,
  createMessage,
  deleteLawyerByAdmin,
  deleteUserByAdmin,
  deleteLawyerSlot,
  deleteLawyerSlotByAdmin,
  getAdminOverview,
  getCases,
  getLawyerById,
  getLawyerEarnings,
  getLawyerSlots,
  getLawyers,
  getMessages,
  payCaseFee,
  submitReview,
  updateCaseStatus,
  updateCaseTimelineEvent,
  updateLawyerSlot,
  updateLawyerVerification,
  updateTransactionStatus,
  updateMembershipTier,
  updateCaseFee,
  updateLawyerProfile,
};
