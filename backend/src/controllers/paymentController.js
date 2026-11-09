import RazorpayPkg from "razorpay";
const Razorpay = RazorpayPkg.default || RazorpayPkg;

import crypto from "crypto";
import { Booking } from "../models/Booking.js";
import { Case } from "../models/Case.js";
import { Lawyer } from "../models/Lawyer.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import mongoose from "mongoose";
import { getIo } from "../socket.js";
import { toCaseDto, toBookingDto } from "./dataController.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure .env is loaded from the backend root
dotenv.config({ path: join(__dirname, "../../.env") });

// Initialize Razorpay lazily to ensure environment variables are loaded
let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    console.log("[PAYMENT] Checking Razorpay Config...");
    
    if (!keyId || !keySecret) {
      console.error("[PAYMENT] CRITICAL ERROR: Razorpay keys are MISSING in process.env!");
      throw new Error("Razorpay configuration is incomplete.");
    }

    try {
      razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      console.log(`[PAYMENT] Razorpay initialized with Key ID: ${keyId.substring(0, 8)}...`);
    } catch (err) {
      console.error("[PAYMENT] Failed to initialize Razorpay constructor:", err);
      throw err;
    }
  }
  return razorpayInstance;
};

export const createOrder = async (req, res) => {
  try {
    const { amount, bookingId, caseId } = req.body;
    console.log(`[PAYMENT] Request received - Amount: ${amount}, BookingID: ${bookingId}, CaseID: ${caseId}`);
    
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      console.warn(`[PAYMENT] Blocked 0 or invalid amount: ${amount}`);
      return res.status(400).json({ 
        message: "Payment is not required for ₹0 transactions." 
      });
    }

    if (!bookingId && !caseId) {
      return res.status(400).json({ message: "Booking ID or Case ID is required." });
    }

    const options = {
      amount: Math.round(Number(amount) * 100), 
      currency: "INR",
      receipt: `receipt_${bookingId || caseId}`,
    };

    const rzp = getRazorpay();
    console.log("[PAYMENT] Order options prepared:", JSON.stringify(options));
    console.log("[PAYMENT] Calling Razorpay SDK...");
    
    const order = await rzp.orders.create(options);
    console.log("[PAYMENT] Order created successfully ID:", order.id);
    
    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay Order Error Details:", error);
    return res.status(500).json({ 
      message: "Failed to create payment order.",
      error: error.message 
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
      caseId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification details." });
    }

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature." });
    }

    // --- CASE PAYMENT FLOW ---
    if (caseId) {
      const caseItem = await Case.findById(caseId);
      if (!caseItem) {
        return res.status(404).json({ message: "Case not found." });
      }

      caseItem.paymentStatus = "paid";
      caseItem.timeline.push({
        date: new Date().toISOString().split("T")[0],
        title: "Final Fee Paid",
        description: `Payment of INR ${caseItem.finalFee} verified (ID: ${razorpay_payment_id}).`,
        type: "payment",
        addedByRole: "system"
      });
      await caseItem.save();

      const lawyer = await Lawyer.findById(caseItem.lawyerId).lean();
      const client = await User.findById(caseItem.clientId).lean();

      const caseAmount = Number(caseItem.finalFee);
      const caseCommission = Number((caseAmount * 0.02).toFixed(2)); // 2% Commission
      const caseNet = Number((caseAmount - caseCommission).toFixed(2)); // 98% Net

      await Transaction.create({
        bookingId: new mongoose.Types.ObjectId(),
        clientId: caseItem.clientId,
        clientName: client?.name || "Client",
        lawyerId: caseItem.lawyerId,
        lawyerName: lawyer?.name || "Lawyer",
        caseTitle: caseItem.title,
        amount: caseAmount,
        commissionAmount: caseCommission,
        netAmount: caseNet,
        status: "completed",
        paidAt: new Date().toISOString().split("T")[0],
        method: "RAZORPAY",
      });

      // Notify parties via socket
      try {
        const io = getIo();
        const caseDto = toCaseDto(caseItem.toObject());
        io.to(caseItem.clientId.toString()).emit("case_update", caseDto);
        io.to(caseItem.lawyerId.toString()).emit("case_update", caseDto);

        // 1. Client Notification
        const clientNotif = await Notification.create({
          userId: caseItem.clientId.toString(),
          type: "case_update",
          title: "Payment Successful",
          body: `Payment of INR ${caseItem.finalFee} for case "${caseItem.title}" was verified successfully.`,
          link: "/dashboard",
        });

        if (io) {
          io.to(caseItem.clientId.toString()).emit("new_notification", {
            id: clientNotif._id.toString(),
            type: "case_update",
            title: clientNotif.title,
            body: clientNotif.body,
            link: clientNotif.link,
            read: false,
            createdAt: clientNotif.createdAt,
          });
        }

        // 2. Lawyer Notification
        const lawyerNotif = await Notification.create({
          userId: caseItem.lawyerId.toString(),
          type: "case_update",
          title: "Payment Received",
          body: `Payment of INR ${caseItem.finalFee} received for case "${caseItem.title}".`,
          link: "/dashboard",
        });

        if (io) {
          io.to(caseItem.lawyerId.toString()).emit("new_notification", {
            id: lawyerNotif._id.toString(),
            type: "case_update",
            title: lawyerNotif.title,
            body: lawyerNotif.body,
            link: lawyerNotif.link,
            read: false,
            createdAt: lawyerNotif.createdAt,
          });
        }
      } catch (e) {
        console.error("Socket emit error / notification error:", e);
      }

      return res.status(200).json({ 
        message: "Case payment verified successfully", 
        caseItem: toCaseDto(caseItem.toObject()) 
      });
    }

    // --- BOOKING PAYMENT FLOW ---
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    booking.status = "paid";
    booking.paymentStatus = "paid";
    await booking.save();

    const bookingAmount = Number(booking.amount);
    const bookingCommission = Number((bookingAmount * 0.02).toFixed(2)); // 2% Commission
    const bookingNet = Number((bookingAmount - bookingCommission).toFixed(2)); // 98% Net

    await Transaction.findOneAndUpdate(
      { bookingId: booking._id },
      {
        bookingId: booking._id,
        clientId: booking.clientId,
        clientName: booking.clientName,
        lawyerId: booking.lawyerId,
        lawyerName: booking.lawyerName,
        caseTitle: `Consultation on ${booking.date}`,
        amount: bookingAmount,
        commissionAmount: bookingCommission,
        netAmount: bookingNet,
        currency: "INR",
        status: "completed",
        paidAt: new Date().toISOString().split("T")[0],
        method: "RAZORPAY",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Notify parties via socket
    try {
      const io = getIo();
      const bookingDto = toBookingDto(booking.toObject());
      io.to(booking.clientId.toString()).emit("booking_updated", bookingDto);
      io.to(booking.lawyerId.toString()).emit("booking_updated", bookingDto);

      // 1. Client Notification
      const clientNotif = await Notification.create({
        userId: booking.clientId.toString(),
        type: "booking_completed",
        title: "Payment Successful",
        body: `Payment of INR ${booking.amount} for consultation with ${booking.lawyerName} was successful.`,
        link: "/dashboard",
      });

      if (io) {
        io.to(booking.clientId.toString()).emit("new_notification", {
          id: clientNotif._id.toString(),
          type: "booking_completed",
          title: clientNotif.title,
          body: clientNotif.body,
          link: clientNotif.link,
          read: false,
          createdAt: clientNotif.createdAt,
        });
      }

      // 2. Lawyer Notification
      const lawyerNotif = await Notification.create({
        userId: booking.lawyerId.toString(),
        type: "booking_completed",
        title: "Consultation Paid",
        body: `Consultation fee of INR ${booking.amount} paid by ${booking.clientName}.`,
        link: "/dashboard",
      });

      if (io) {
        io.to(booking.lawyerId.toString()).emit("new_notification", {
          id: lawyerNotif._id.toString(),
          type: "booking_completed",
          title: lawyerNotif.title,
          body: lawyerNotif.body,
          link: lawyerNotif.link,
          read: false,
          createdAt: lawyerNotif.createdAt,
        });
      }
    } catch (e) {
      console.error("Socket emit error / notification error:", e);
    }

    return res.status(200).json({ 
      message: "Payment verified successfully", 
      booking: toBookingDto(booking.toObject()) 
    });

  } catch (error) {
    console.error("Verification Error:", error);
    return res.status(500).json({ message: "Payment verification failed." });
  }
};

export const createSubscriptionOrder = async (req, res) => {
  try {
    const { plan } = req.body; // e.g. "premium" or "plus"
    if (plan !== "premium" && plan !== "plus") {
      return res.status(400).json({ message: "Invalid subscription plan." });
    }

    const planPrice = plan === "premium" ? 999 : 499;
    const options = {
      amount: planPrice * 100, // paise
      currency: "INR",
      receipt: `rcpt_sub_${req.user._id.toString().slice(-8)}_${Date.now()}`,
    };

    const rzp = getRazorpay();
    const order = await rzp.orders.create(options);

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay Subscription Order Error:", error);
    return res.status(500).json({ 
      message: "Failed to create subscription order.",
      error: error.message 
    });
  }
};

export const verifySubscriptionPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({ message: "Missing verification details." });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature." });
    }

    // Payment is valid! Upgrade the user account
    const userId = req.user._id;
    const role = req.user.role;
    
    let account;
    if (role === "lawyer") {
      account = await Lawyer.findById(userId);
    } else {
      account = await User.findById(userId);
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    account.membershipTier = plan;
    await account.save();

    // Cross-update if linked or necessary
    if (role === "lawyer" && account.userId) {
      await User.findByIdAndUpdate(account.userId, { membershipTier: plan });
    } else if (role === "client" && account.role === "lawyer") {
      await Lawyer.findOneAndUpdate({ userId: account._id }, { membershipTier: plan });
    }

    const planPrice = plan === "premium" ? 999 : 499;

    // Create a transaction record so it updates earnings or represents subscription purchase
    await Transaction.create({
      bookingId: new mongoose.Types.ObjectId(), // Virtual booking ID for subscription
      clientId: userId, 
      clientName: account.name,
      lawyerId: new mongoose.Types.ObjectId("000000000000000000000000"), // Platform itself
      lawyerName: "LawConnect Platform",
      caseTitle: `${plan === "premium" ? "Premium" : "Client Plus"} Membership Subscription (1 Month)`,
      amount: planPrice,
      status: "completed",
      paidAt: new Date().toISOString().split("T")[0],
      method: "RAZORPAY",
    });

    // Create and emit notification for membership upgrade
    try {
      const io = getIo();
      const notif = await Notification.create({
        userId: userId.toString(),
        type: "general",
        title: "Subscription Upgraded",
        body: `Your membership has been successfully upgraded to ${plan === "premium" ? "Premium" : "Client Plus"}!`,
        link: "/dashboard",
      });

      if (io) {
        io.to(userId.toString()).emit("new_notification", {
          id: notif._id.toString(),
          type: "general",
          title: notif.title,
          body: notif.body,
          link: notif.link,
          read: false,
          createdAt: notif.createdAt,
        });
      }
    } catch (err) {
      console.error("Failed to create subscription notification:", err);
    }

    return res.status(200).json({ 
      message: `Subscription successfully verified and upgraded to ${plan === "premium" ? "Premium" : "Client Plus"}!`, 
      membershipTier: plan 
    });
  } catch (error) {
    console.error("Subscription Verification Error:", error);
    return res.status(500).json({ message: "Subscription verification failed." });
  }
};
