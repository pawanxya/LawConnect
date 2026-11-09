import { Router } from "express";
import { uploadDocument } from "../controllers/uploadController.js";
import { authRequired } from "../middleware/auth.js";

const uploadRoutes = Router();

uploadRoutes.post("/", authRequired, uploadDocument);

export { uploadRoutes };
