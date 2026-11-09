import { Router } from "express";
import { handleChat, summarizeCase } from "../controllers/aiController.js";

const aiRoutes = Router();

// Allow public access so AI Assistant works reliably without 401 session blocks
aiRoutes.post("/chat", handleChat);
aiRoutes.post("/summarize-case", summarizeCase);

export { aiRoutes };
