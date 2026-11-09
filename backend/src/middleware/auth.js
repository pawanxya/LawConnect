import jwt from "jsonwebtoken";
import { Lawyer } from "../models/Lawyer.js";
import { User } from "../models/User.js";

/**
 * Authentication middleware supporting Clerk and legacy JWT tokens.
 * Automatically resolves the authenticated user from MongoDB by Clerk ID or Email.
 */
const authRequired = async (req, res, next) => {
  try {
    let clerkUserId = null;
    let authEmail = null;

    // 1. Check if @clerk/express has attached auth object to req
    if (req.auth && typeof req.auth.userId === "string") {
      clerkUserId = req.auth.userId;
    }

    // 2. Parse Bearer Authorization header
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!clerkUserId && token) {
      // Decode token payload to inspect issuer / subject
      const decodedPayload = jwt.decode(token);
      if (decodedPayload) {
        if (decodedPayload.sub && String(decodedPayload.sub).startsWith("user_")) {
          clerkUserId = decodedPayload.sub;
        }
        if (decodedPayload.email) {
          authEmail = decodedPayload.email;
        }
      }
    }

    // 3. Resolve user by Clerk ID
    if (clerkUserId) {
      let user = await User.findOne({ clerkId: clerkUserId }).lean();
      if (!user) {
        user = await Lawyer.findOne({ clerkId: clerkUserId }).lean();
      }
      
      // Fallback: If clerkId not yet recorded, search by email if available
      if (!user && authEmail) {
        const normalized = String(authEmail).trim().toLowerCase();
        user = (await User.findOne({ email: normalized }).lean()) || (await Lawyer.findOne({ email: normalized }).lean());
        if (user) {
          // Auto-link clerkId
          const Model = user.role === "lawyer" ? Lawyer : User;
          await Model.findByIdAndUpdate(user._id, { clerkId: clerkUserId });
        }
      }

      if (user) {
        req.user = user;
        req.clerkUserId = clerkUserId;
        return next();
      }
    }

    // 4. Legacy JWT verification fallback (for demo-credentials or non-Clerk tokens)
    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.userId) {
          const Model = decoded.role === "lawyer" ? Lawyer : User;
          const user = await Model.findById(decoded.userId).lean();
          if (user) {
            req.user = user;
            return next();
          }
        }
      } catch {
        // Fallback token verification failed
      }
    }

    return res.status(401).json({ message: "Unauthorized. Please login via Clerk." });
  } catch (error) {
    console.error("[AUTH ERROR]", error.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const requireVerifiedLawyer = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "lawyer") {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!req.user.verified) {
    return res.status(403).json({ 
      message: "Access denied. Lawyer profile pending verification.",
      code: "LAWYER_VERIFICATION_PENDING" 
    });
  }

  req.lawyerProfile = req.user;
  next();
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied." });
  }
  next();
};

export { adminOnly, authRequired, requireRole, requireVerifiedLawyer };
