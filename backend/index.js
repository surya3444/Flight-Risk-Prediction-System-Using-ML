const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// 1. Import Routes at the top
const authRoutes = require('./routes/authRoutes');
const predictRoutes = require('./routes/predictRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// 2. Mount Routes using the imported variables
app.use('/api/auth', authRoutes);
app.use('/api/predict', predictRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Node server running on port ${PORT}`));