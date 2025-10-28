const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Data Model
const dataSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['active', 'pending', 'completed'],
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now }
});

const Data = mongoose.model('Data', dataSchema);

// Routes

// GET - Fetch all data
app.get('/api/data', async (req, res) => {
  try {
    const data = await Data.find().sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Create new data
app.post('/api/data', async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const newData = new Data({ title, description, status });
    await newData.save();
    res.status(201).json({ success: true, data: newData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT - Update data
app.put('/api/data/:id', async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const updatedData = await Data.findByIdAndUpdate(
      req.params.id,
      { title, description, status },
      { new: true }
    );
    if (!updatedData) {
      return res.status(404).json({ success: false, error: 'Data not found' });
    }
    res.json({ success: true, data: updatedData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE - Delete data
app.delete('/api/data/:id', async (req, res) => {
  try {
    const deletedData = await Data.findByIdAndDelete(req.params.id);
    if (!deletedData) {
      return res.status(404).json({ success: false, error: 'Data not found' });
    }
    res.json({ success: true, message: 'Data deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
