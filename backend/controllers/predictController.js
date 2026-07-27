const mlClient = require('../services/mlClient');
const escalationEngine = require('../services/escalationEngine');
const Prediction = require('../models/Prediction');

/**
 * One-shot risk assessment from the dashboard.
 *
 * Even a manual prediction runs through the escalation rules: if a dispatcher
 * scores a flight and it comes back high-risk on approach into a storm, the
 * duty manager should hear about it whether or not anyone remembered to put the
 * flight under continuous monitoring.
 */
exports.createPrediction = async (req, res) => {
  try {
    const flightData = req.body;

    const prediction = await mlClient.predict(flightData, { explain: true });

    const settings = await escalationEngine.settingsFor(req.user.id);
    const evaluation = escalationEngine.evaluate({
      probability: prediction.risk_probability,
      flightData,
      settings,
    });

    const escalation = await escalationEngine.escalate({
      userId: req.user.id,
      evaluation,
      probability: prediction.risk_probability,
      flightNumber: flightData.flight_number || null,
      route:
        flightData.departure_city && flightData.arrival_city
          ? `${flightData.departure_city} → ${flightData.arrival_city}`
          : null,
      flightPhase: flightData.flight_phase,
      contributingFactors: prediction.contributing_factors || [],
      source: 'manual-prediction',
      settings,
    });

    const newPrediction = await Prediction.create({
      user: req.user.id,
      flightData,
      predictionResult: {
        risk_prediction: prediction.risk_prediction,
        risk_probability: prediction.risk_probability,
        risk_band: prediction.risk_band,
      },
      contributingFactors: prediction.contributing_factors || [],
      triggeredRules: evaluation.triggeredRules,
      severity: evaluation.severity,
      incident: escalation?.incident?._id || null,
      modelVersion: prediction.model_version,
    });

    res.status(200).json({
      success: true,
      data: newPrediction,
      assessment: {
        severity: evaluation.severity,
        band: prediction.risk_band,
        triggeredRules: evaluation.triggeredRules,
        contributingFactors: prediction.contributing_factors || [],
      },
      incident: escalation
        ? {
            reference: escalation.incident.reference,
            severity: escalation.incident.severity,
            created: escalation.created,
            notifications: escalation.incident.notifications,
          }
        : null,
    });
  } catch (error) {
    console.error('Prediction failed:', error.message);
    res.status(502).json({
      success: false,
      error: error.message || 'Failed to retrieve prediction from the ML server.',
    });
  }
};

// Fetch all past predictions for the logged-in user
exports.getPredictionHistory = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const history = await Prediction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('incident', 'reference severity status');

    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    console.error('Database Error fetching history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server Error: Could not fetch prediction history.',
    });
  }
};
