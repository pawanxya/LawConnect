import { Router } from "express";
import {
  getNotifications,
  markAllRead,
  markOneRead,
} from "../controllers/notificationController.js";
import { authRequired } from "../middleware/auth.js";

const notificationRoutes = Router();

notificationRoutes.get("/", authRequired, getNotifications);
notificationRoutes.patch("/read-all", authRequired, markAllRead);
notificationRoutes.patch("/:id/read", authRequired, markOneRead);

export { notificationRoutes };
