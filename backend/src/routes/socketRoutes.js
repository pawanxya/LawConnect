import jwt from "jsonwebtoken";
import { Router } from "express";
import { authRequired } from "../middleware/auth.js";

const socketRoutes = Router();

// A short-lived, server-signed ticket means Socket.IO never trusts a browser-supplied user id.
socketRoutes.post("/ticket", authRequired, (req, res) => {
  const ticket = jwt.sign(
    { sub: req.user._id.toString(), scope: "messaging" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );
  res.status(200).json({ ticket });
});

export { socketRoutes };
