const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  flightData: { 
    type: Object, // Keeping this flexible for the 24 inputs
    required: true 
  },
  predictionResult: { 
    risk_prediction: { type: Number, required: true },
    risk_probability: { type: Number, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Prediction', predictionSchema);