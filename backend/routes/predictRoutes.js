const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { createPrediction, getPredictionHistory } = require('../controllers/predictController');

// POST /api/predict
router.post('/', authMiddleware, createPrediction);

router.get('/history', authMiddleware, getPredictionHistory);

module.exports = router;