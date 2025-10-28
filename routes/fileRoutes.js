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

// Multer config - ACCEPTS ALL FILE TYPES
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Clean filename and preserve extension
    const fileExt = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExt)
      .replace(/[^a-zA-Z0-9.\-]/g, '_');
    const finalFilename = `${Date.now()}-${baseName}${fileExt}`;
    cb(null, finalFilename);
  }
});

// ✅ ACCEPTS ALL FILE TYPES - Remove file filter
const upload = multer({ 
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // Increased to 25MB for larger files
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

// ✅ Upload route - ACCEPTS ALL FILES
router.post("/upload", checkDBConnection, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📁 File upload attempt:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const newFile = new File({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    await newFile.save();
    console.log("✅ File saved to database:", newFile.filename);
    
    res.json({ 
      message: "File uploaded successfully!",
      file: {
        id: newFile._id,
        filename: newFile.filename,
        originalname: newFile.originalname,
        mimetype: newFile.mimetype,
        size: newFile.size,
        downloadUrl: `/uploads/${newFile.filename}`
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

// ✅ Download/View file route
router.get("/files/:id", checkDBConnection, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = path.join(process.cwd(), 'uploads', file.filename);
    
    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    // Set appropriate headers for download/view
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalname}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (err) {
    console.error("❌ File download error:", err);
    res.status(500).json({ error: "Could not download file: " + err.message });
  }
});

// ✅ Multer error handling
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 25MB)' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
  }
  res.status(400).json({ error: error.message });
});

export default router;