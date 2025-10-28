import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  path: String,
  uploadedAt: { type: Date, default: Date.now }
});

export default mongoose.model("File", fileSchema);
