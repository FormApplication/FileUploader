import express from "express";
import multer from "multer";
import File from "../models/File.js";
import path from "path";
import mongoose from "mongoose";
import fs from "fs";

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, `${Date.now()}-${originalName}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// ✅ Database connection check middleware
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.log("❌ Database not connected for request:", req.method, req.url);
    return res.status(503).json({ 
      error: "Database not connected. Please try again in a moment.",
      dbStatus: mongoose.connection.readyState
    });
  }
  next();
};

// ✅ Upload route
router.post("/upload", checkDBConnection, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📁 File upload attempt:", req.file.originalname);

    const newFile = new File({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: `/uploads/${req.file.filename}`
    });
    
    await newFile.save();
    console.log("✅ File saved to database:", newFile.filename);
    
    res.json({ 
      message: "File uploaded successfully!",
      file: {
        id: newFile._id,
        filename: newFile.filename,
        originalname: newFile.originalname
      }
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    
    if (err.name === 'MongoNetworkError' || err.message.includes('buffering timed out')) {
      return res.status(503).json({ error: "Database connection issue. Please try again." });
    }
    
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

// ✅ Get all files route
router.get("/files", checkDBConnection, async (req, res) => {
  try {
    console.log("📋 Fetching files from database...");
    
    const files = await File.find().sort({ uploadedAt: -1 }).maxTimeMS(15000);
    console.log(`✅ Found ${files.length} files`);
    
    res.json(files);
  } catch (err) {
    console.error("❌ Files fetch error:", err);
    
    if (err.name === 'MongoNetworkError' || err.message.includes('buffering timed out')) {
      return res.status(503).json({ 
        error: "Database connection timeout. Please refresh and try again." 
      });
    }
    
    res.status(500).json({ error: "Could not fetch files: " + err.message });
  }
});

// ✅ Multer error handling
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }
  }
  res.status(400).json({ error: error.message });
});

export default router;