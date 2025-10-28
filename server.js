import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import File from "./models/File.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Folder setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// Upload route
app.post("/api/upload", upload.single("file"), async (req, res) => {
  const newFile = new File({
    filename: req.file.filename,
    originalname: req.file.originalname,
    path: req.file.path
  });
  await newFile.save();
  res.json({ message: "File uploaded successfully" });
});

// Fetch all uploaded files
app.get("/api/files", async (req, res) => {
  const files = await File.find();
  res.json(files);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
