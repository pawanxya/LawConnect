import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Lawyer } from "../models/Lawyer.js";
import { User } from "../models/User.js";
import { getAvatar } from "../lib/avatarUtils.js";

const sanitizeUser = (user) => {
  const nextUser = { ...user };
  delete nextUser.passwordHash;
  return nextUser;
};

const getJwtSecret = () => process.env.JWT_SECRET || "lawconnect_jwt_secret_fallback";

const generateToken = (user) =>
  jwt.sign({ userId: user._id.toString(), role: user.role }, getJwtSecret(), {
    expiresIn: "24h",
  });

const hydrateUser = async (userDocument) => {
  const baseUser = sanitizeUser(userDocument.toObject ? userDocument.toObject() : userDocument);
  baseUser.id = baseUser._id.toString();

  if (baseUser.role === "lawyer") {
    return {
      ...baseUser,
      lawyerProfileId: baseUser.id,
      verified: baseUser.verified || false,
    };
  }

  return baseUser;
};

/**
 * Synchronizes Clerk authenticated user with MongoDB (User / Lawyer models).
 * Called by frontend whenever a user logs in or signs up via Clerk.
 */
const syncUser = async (req, res) => {
  try {
    const { clerkId, email, name, role = "client", avatar, ...rest } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!clerkId && !normalizedEmail) {
      return res.status(400).json({ message: "Clerk ID or email is required for user synchronization." });
    }

    // 1. Check if user already exists by clerkId or email
    let user = null;
    const requestedRole = role === "lawyer" ? "lawyer" : "client";

    if (clerkId) {
      user = (await User.findOne({ clerkId })) || (await Lawyer.findOne({ clerkId }));
    }

    if (!user && normalizedEmail) {
      user = (await User.findOne({ email: normalizedEmail })) || (await Lawyer.findOne({ email: normalizedEmail }));
      if (user) {
        // Link existing user to Clerk ID
        const Model = user.role === "lawyer" ? Lawyer : User;
        user = await Model.findByIdAndUpdate(user._id, { clerkId, ...(avatar && { avatar }) }, { new: true });
        return res.status(200).json({ user: await hydrateUser(user) });
      }
    }

    if (user) {
      // User already exists, return hydrated user
      return res.status(200).json({ user: await hydrateUser(user) });
    }

    // 2. User doesn't exist yet: Create new record in MongoDB
    const userAvatar = avatar || getAvatar(name || normalizedEmail.split("@")[0]);
    const nextRole = requestedRole;

    if (nextRole === "lawyer") {
      user = await Lawyer.create({
        clerkId,
        name: name || "Lawyer",
        email: normalizedEmail,
        role: "lawyer",
        avatar: userAvatar,
        verified: false,
        ...rest,
      });
    } else {
      user = await User.create({
        clerkId,
        name: name || "User",
        email: normalizedEmail,
        role: nextRole,
        avatar: userAvatar,
        ...rest,
      });
    }

    return res.status(201).json({ user: await hydrateUser(user) });
  } catch (error) {
    console.error("Error in syncUser:", error);
    return res.status(500).json({ message: "Failed to synchronize user profile." });
  }
};

const me = async (req, res) => res.status(200).json({ user: await hydrateUser(req.user) });

const logout = async (_req, res) => res.status(204).send();

const updateMe = async (req, res) => {
  const { name, phone, location, bio, avatar, email } = req.body;
  const role = req.user.role;
  const Model = role === "lawyer" ? Lawyer : User;

  const user = await Model.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const [existingUser, existingLawyer] = await Promise.all([
      User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).lean(),
      Lawyer.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).lean(),
    ]);

    if (existingUser || existingLawyer) {
      return res.status(400).json({ message: "This email is already in use." });
    }
    user.email = normalizedEmail;
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (location !== undefined) user.location = location;
  if (bio !== undefined) user.bio = bio;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  return res.status(200).json({ user: await hydrateUser(user) });
};

// Fallback login for demo/seed accounts
const login = async (req, res) => {
  const { email, password, role } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  let user;
  if (role === "lawyer") {
    user = await Lawyer.findOne({ email: normalizedEmail });
  } else {
    user = await User.findOne({ email: normalizedEmail, role });
  }

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  if (user.passwordHash) {
    const matches = await bcrypt.compare(String(password || ""), user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
  }

  const token = generateToken(user);
  return res.status(200).json({ user: await hydrateUser(user), token });
};

export { login, logout, me, syncUser, updateMe };
