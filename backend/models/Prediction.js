const mongoose = require('mongoose');

/**
 * A one-shot assessment made from the dashboard.
 *
 * Distinct from RiskSnapshot: a Prediction is a deliberate act by a dispatcher,
 * a snapshot is the monitoring loop doing its rounds. Keeping them apart means
 * the manual audit trail is not buried under thousands of automated checks.
 */
const predictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    flightData: {
      type: Object, // Keeping this flexible for the 24 inputs
      required: true,
    },
    predictionResult: {
      risk_prediction: { type: Number, required: true },
      risk_probability: { type: Number, required: true },
      risk_band: { type: String, default: null },
    },

    // Model-derived explanation: which inputs are actually driving this score.
    contributingFactors: { type: Array, default: [] },
    // Policy-derived explanation: which escalation rules fired.
    triggeredRules: { type: Array, default: [] },
    severity: { type: String, default: 'none' },

    // Set when this assessment was severe enough to raise an incident.
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },

    modelVersion: { type: String, default: null },
  },
  { timestamps: true }
);

predictionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
