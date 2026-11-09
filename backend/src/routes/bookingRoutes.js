import { Router } from "express";
import {
  cancelBooking,
  createBooking,
  getBookings,
  payBooking,
  updateBookingStatus,
} from "../controllers/bookingController.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const bookingRoutes = Router();

bookingRoutes.get("/", authRequired, getBookings);
bookingRoutes.post("/", authRequired, requireRole("client"), createBooking);
bookingRoutes.patch("/:id/pay", authRequired, requireRole("client"), payBooking);
bookingRoutes.patch("/:id/status", authRequired, requireRole("lawyer", "admin"), updateBookingStatus);
bookingRoutes.delete("/:id", authRequired, requireRole("client"), cancelBooking);

export { bookingRoutes };
