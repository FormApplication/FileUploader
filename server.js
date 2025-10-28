import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fileRoutes from "./routes/fileRoutes.js";

dotenv.config();

const app = express();

// ✅ Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Configure CORS - simplified for Render
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://candy01.netlify.app"
  ],
  credentials: true,
}));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Improved MongoDB connection with timeout settings
const MONGODB_URI = process.env.MONGODB_URI;

console.log("🔧 Attempting MongoDB connection...");

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  bufferCommands: false,
};

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err);
    console.log("💡 Check your MONGODB_URI in environment variables");
    console.log("💡 Make sure your MongoDB Atlas cluster allows connections from all IPs (0.0.0.0/0)");
  });

// ✅ Routes
app.use("/api", fileRoutes);

// ✅ Enhanced Health check route
app.get("/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    
    res.status(200).json({ 
      message: "Server is running!",
      database: dbStatus,
      timestamp: new Date().toISOString(),
      port: process.env.PORT
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
});

// ✅ Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "File Upload Backend API",
    endpoints: {
      health: "/health",
      upload: "/api/upload",
      files: "/api/files"
    }
  });
});

// ✅ Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server Error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// ✅ Use Render's PORT (10000) or default to 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
});