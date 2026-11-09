import fs from "fs";
import multer from "multer";
import path from "path";
import { Case } from "../models/Case.js";
import { toCaseDto } from "./dataController.js";
import { getIo } from "../socket.js";

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, uniqueSuffix + "-" + sanitizedName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // Increased to 25MB limit
}).single("document");

const uploadDocument = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("[UPLOAD ERROR]", err);
      let message = "File upload failed.";
      if (err.code === "LIMIT_FILE_SIZE") {
        message = "File is too large. Maximum limit is 25MB.";
      }
      return res.status(400).json({ message, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const { caseId } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    
    const fileInfo = {
      name: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      type: req.file.mimetype,
      uploadedAt: new Date(),
      uploadedBy: req.user.name,
    };

    // If caseId is provided, link the document to the case
    if (caseId) {
      try {
        const caseItem = await Case.findById(caseId);
        if (caseItem) {
          caseItem.documents.push(fileInfo);
          await caseItem.save();

          // Real-time update via Socket.io
          const dto = toCaseDto(caseItem.toObject());
          const io = getIo();
          io.to(caseItem.clientId.toString()).emit("case_update", dto);
          io.to(caseItem.lawyerId.toString()).emit("case_update", dto);
        }
      } catch (dbErr) {
        console.error("[DB ERROR]", dbErr);
      }
    }

    return res.status(200).json({
      message: "File uploaded successfully.",
      ...fileInfo
    });
  });
};

export { uploadDocument };
