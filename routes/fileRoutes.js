import express from "express";
import multer from "multer";
import File from "../models/File.js";
import path from "path";

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ✅ Upload route
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const newFile = new File({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path
    });
    await newFile.save();
    res.json({ message: "File uploaded successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// 📂 Get all uploaded files
router.get("/files", async (req, res) => {
  try {
    const files = await File.find().sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch files" });
  }
});

export default router;
