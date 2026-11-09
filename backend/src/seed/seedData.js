import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { Booking } from "../models/Booking.js";
import { Case } from "../models/Case.js";
import { Lawyer } from "../models/Lawyer.js";
import { Message } from "../models/Message.js";
import { Review } from "../models/Review.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

import { getAvatar } from "../lib/avatarUtils.js";

const ensureDefaultAdmin = async () => {
  const adminEmail = "admin@lawconnect.com";
  const defaultPassword = "admin123";
  const adminHash = await bcrypt.hash(defaultPassword, 10);

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    // If admin exists, reset password to default to ensure login works
    existingAdmin.passwordHash = adminHash;
    await existingAdmin.save();
    return;
  }

  await User.create({
    name: "System Admin",
    email: adminEmail,
    role: "admin",
    avatar: getAvatar("System Admin"),
    passwordHash: adminHash,
    phone: "+91-9000000000",
    location: "Admin Console",
  });
};

const ensureSeedData = async () => {
  await ensureDefaultAdmin();

  const nonAdminUserCount = await User.countDocuments({ role: { $ne: "admin" } });
  if (nonAdminUserCount > 0) {
    return;
  }

  console.log("Seeding initial data...");

  const [clientHash, lawyerHash] = await Promise.all([
    bcrypt.hash("client123", 10),
    bcrypt.hash("lawyer123", 10),
  ]);

  const clientId = new mongoose.Types.ObjectId();
  const lawyerId = new mongoose.Types.ObjectId(); // This will be the Lawyer document _id

  await User.insertMany([
    {
      _id: clientId,
      name: "Rahul Mehta",
      email: "client@example.com",
      role: "client",
      avatar: getAvatar("Rahul Mehta"),
      passwordHash: clientHash,
      phone: "+91-9876543210",
      location: "Mumbai, India",
    },
  ]);

  await Lawyer.insertMany([
    {
      _id: lawyerId,
      email: "lawyer@example.com",
      passwordHash: lawyerHash,
      name: "Sarah Johnson",
      role: "lawyer",
      membershipTier: "premium",
      specialization: ["Criminal Law", "Family Law"],
      experience: 8,
      hourlyRate: 3500,
      rating: 4.8,
      totalReviews: 1,
      location: "Delhi, India",
      phone: "+91-9988776655",
      bio: "Sarah Johnson is a highly experienced advocate with expertise in criminal and family law matters. Available on LAWCONNECT for consultation.",
      verified: true,
      reputationScore: 92,
      barId: "DL-BAR-2015-4821",
      availability: "available",
      avatar: getAvatar("Sarah Johnson"),
      isPriority: true,
      isSponsored: false,
      consultationSlots: [
        { lawyerId: lawyerId, date: "2026-04-20", startTime: "10:00", endTime: "11:00", isBooked: false },
        { lawyerId: lawyerId, date: "2026-04-21", startTime: "14:00", endTime: "15:00", isBooked: false },
        { lawyerId: lawyerId, date: "2026-04-22", startTime: "16:00", endTime: "17:00", isBooked: false },
      ],
    },
  ]);

  const lawyerProfileId = lawyerId;
  const caseId = new mongoose.Types.ObjectId();
  const today = new Date().toISOString().split("T")[0];

  await Case.insertMany([
    {
      _id: caseId,
      clientId,
      lawyerId: lawyerProfileId,
      title: "Property Dispute - Residential Land",
      description:
        "Client is facing a property dispute over 500 sq. yard residential land in South Delhi. Neighbor has encroached and constructed illegal extension.",
      status: "active",
      hearingDates: [
        {
          date: "2024-05-15",
          title: "First Hearing",
          location: "District Court, Delhi",
          notes: "Submit property documents",
        },
        {
          date: "2024-06-20",
          title: "Evidence Submission",
          location: "District Court, Delhi",
          notes: "Photographs and survey report required",
        },
      ],
      documents: [
        {
          name: "Property Registration Certificate.pdf",
          type: "application/pdf",
          size: 245000,
          uploadedBy: "Rahul Mehta",
          url: "#",
        },
        {
          name: "Survey Report.pdf",
          type: "application/pdf",
          size: 128000,
          uploadedBy: "Sarah Johnson",
          url: "#",
        },
      ],
      timeline: [
        {
          date: "2024-03-01",
          title: "Case Filed",
          description: "Property dispute case officially filed in District Court.",
          type: "update",
          addedByRole: "lawyer",
        },
        {
          date: "2024-03-15",
          title: "Lawyer Assigned",
          description: "Sarah Johnson assigned as counsel for the case.",
          type: "update",
          addedByRole: "lawyer",
        },
        {
          date: "2024-05-15",
          title: "First Hearing Completed",
          description: "Court reviewed primary evidence. Next hearing set for June 20.",
          type: "hearing",
          addedByRole: "lawyer",
        },
      ],
    },
  ]);

  await Message.insertMany([
    {
      senderId: clientId,
      senderName: "Rahul Mehta",
      receiverId: lawyerId,
      content: "Hello Sarah, I wanted to follow up on my property case. When is the next hearing?",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      senderId: lawyerId,
      senderName: "Sarah Johnson",
      receiverId: clientId,
      content: "Hi Rahul, the next hearing is on June 20th. Please bring the survey report original copy.",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
  ]);

  await Review.insertMany([
    {
      clientId,
      clientName: "Rahul Mehta",
      lawyerId: lawyerProfileId,
      rating: 5,
      comment:
        "Sarah is extremely professional and knowledgeable. She explained every step clearly and I feel confident about my case.",
      date: today,
    },
  ]);

  const paidBookingId = new mongoose.Types.ObjectId();
  const pendingBookingId = new mongoose.Types.ObjectId();

  await Booking.insertMany([
    {
      _id: paidBookingId,
      clientId,
      lawyerId: lawyerProfileId,
      caseId: null,
      date: "2024-06-01",
      timeSlot: "10:00 AM - 11:00 AM",
      status: "approved",
      notes: "First initial consultation about the property dispute.",
      amount: 7000,
      paymentStatus: "paid",
      clientName: "Rahul Mehta",
      lawyerName: "Sarah Johnson",
    },
    {
      _id: pendingBookingId,
      clientId,
      lawyerId: lawyerProfileId,
      caseId: null,
      date: "2024-06-15",
      timeSlot: "02:00 PM - 03:00 PM",
      status: "pending",
      notes: "Follow-up consultation.",
      amount: 7000,
      paymentStatus: "unpaid",
      clientName: "Rahul Mehta",
      lawyerName: "Sarah Johnson",
    },
  ]);

  await Transaction.insertMany([
    {
      bookingId: paidBookingId,
      clientId,
      clientName: "Rahul Mehta",
      lawyerId: lawyerProfileId,
      lawyerName: "Sarah Johnson",
      caseTitle: "Consultation on 2024-06-01",
      amount: 7000,
      currency: "INR",
      status: "completed",
      paidAt: today,
      method: "UPI",
    },
  ]);

  console.log("Seed data inserted successfully.");
};

export { ensureDefaultAdmin, ensureSeedData };
