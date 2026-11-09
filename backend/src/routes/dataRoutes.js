import { Router } from "express";

import {
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
  getLawyerSlots,
  getLawyers,
  getMessages,
  addCaseTimelineEvent,
  updateCaseTimelineEvent,
  updateCaseStatus,
  updateHearingStatus,
  addCaseHearing,
  updateLawyerSlot,
  updateLawyerVerification,
  updateTransactionStatus,
  submitReview,
  getLawyerEarnings,
  payCaseFee,
  updateMembershipTier,
  updateCaseFee,
  updateLawyerProfile,
} from "../controllers/dataController.js";
import { authRequired, requireRole, requireVerifiedLawyer } from "../middleware/auth.js";

const dataRoutes = Router();

dataRoutes.get("/lawyers", getLawyers);
dataRoutes.get("/lawyers/:id", getLawyerById);
dataRoutes.get("/cases", authRequired, getCases);
dataRoutes.post("/cases", authRequired, requireRole("client"), createCase);
dataRoutes.patch("/cases/:id/status", authRequired, updateCaseStatus);
dataRoutes.patch("/cases/:id/hearings/:hearingId", authRequired, requireRole("lawyer"), updateHearingStatus);
dataRoutes.post("/cases/:id/timeline", authRequired, addCaseTimelineEvent);
dataRoutes.post("/cases/:id/hearings", authRequired, requireRole("lawyer"), addCaseHearing);
dataRoutes.patch("/cases/:id/timeline/:eventId", authRequired, updateCaseTimelineEvent);
dataRoutes.post("/cases/:id/pay", authRequired, requireRole("client"), payCaseFee);
dataRoutes.get("/messages", authRequired, getMessages);
dataRoutes.post("/messages", authRequired, createMessage);
dataRoutes.get("/lawyers/me/slots", authRequired, requireRole("lawyer"), requireVerifiedLawyer, getLawyerSlots);
dataRoutes.post("/lawyers/me/slots", authRequired, requireRole("lawyer"), requireVerifiedLawyer, createLawyerSlot);
dataRoutes.patch("/lawyers/me/slots/:slotId", authRequired, requireRole("lawyer"), requireVerifiedLawyer, updateLawyerSlot);
dataRoutes.delete("/lawyers/me/slots/:slotId", authRequired, requireRole("lawyer"), requireVerifiedLawyer, deleteLawyerSlot);
dataRoutes.get("/admin/overview", authRequired, requireRole("admin"), getAdminOverview);
dataRoutes.patch(
  "/admin/lawyers/:id/verification",
  authRequired,
  requireRole("admin"),
  updateLawyerVerification,
);
dataRoutes.patch(
  "/admin/transactions/:id/status",
  authRequired,
  requireRole("admin"),
  updateTransactionStatus,
);
dataRoutes.delete("/admin/lawyers/:id", authRequired, requireRole("admin"), deleteLawyerByAdmin);
dataRoutes.delete("/admin/users/:id", authRequired, requireRole("admin"), deleteUserByAdmin);
dataRoutes.delete(
  "/admin/lawyers/:id/slots/:slotId",
  authRequired,
  requireRole("admin"),
  deleteLawyerSlotByAdmin,
);

dataRoutes.post("/reviews", authRequired, requireRole("client"), submitReview);
dataRoutes.get("/lawyers/me/earnings", authRequired, requireRole("lawyer"), requireVerifiedLawyer, getLawyerEarnings);
dataRoutes.post("/membership", authRequired, updateMembershipTier);
dataRoutes.patch("/lawyers/me", authRequired, requireRole("lawyer"), requireVerifiedLawyer, updateLawyerProfile);
dataRoutes.patch("/cases/:id/fee", authRequired, requireRole("lawyer"), requireVerifiedLawyer, updateCaseFee);

export { dataRoutes };
