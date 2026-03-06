const axios = require('axios');
const Prediction = require('../models/Prediction');

// Fetch prediction from Flask and save to DB
exports.createPrediction = async (req, res) => {
  try {
    const flightData = req.body;

    const flaskResponse = await axios.post(
      process.env.FLIGHT_ML_API_URL,
      flightData,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.FLIGHT_ML_API_KEY
        }
      }
    );
    
    const newPrediction = new Prediction({
      user: req.user.id, 
      flightData: flightData,
      predictionResult: {
        risk_prediction: flaskResponse.data.risk_prediction,
        risk_probability: flaskResponse.data.risk_probability
      }
    });

    await newPrediction.save();

    res.status(200).json({
      success: true,
      data: newPrediction
    });

  } catch (error) {
    console.error("ML API Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve prediction from the ML server.' 
    });
  }
};

// Fetch all past predictions for the logged-in user
exports.getPredictionHistory = async (req, res) => {
  try {
    // req.user.id comes from the authMiddleware
    const history = await Prediction.find({ user: req.user.id })
                                    .sort({ createdAt: -1 }); // -1 for descending order (newest first)

    if (!history || history.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No prediction history found.',
        data: [] 
      });
    }

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });

  } catch (error) {
    console.error("Database Error fetching history:", error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Server Error: Could not fetch prediction history.' 
    });
  }
};