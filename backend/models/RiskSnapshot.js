const mongoose = require('mongoose');

/**
 * One risk evaluation at one point in time — the time series behind the trend
 * chart. Written once per monitoring cycle and never updated.
 */
const riskSnapshotSchema = new mongoose.Schema(
  {
    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MonitoredFlight',
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    flightPhase: { type: String, required: true },
    // Progress through the block time, 0–1. Lets the chart mark where takeoff
    // and landing sat without recomputing from timestamps.
    progress: { type: Number, default: 0 },

    riskProbability: { type: Number, required: true },
    riskPrediction: { type: Number, required: true },
    riskBand: { type: String, required: true },
    // Change from the previous snapshot; null on the first one.
    delta: { type: Number, default: null },

    contributingFactors: { type: Array, default: [] },
    triggeredRules: { type: Array, default: [] },
    severity: { type: String, default: 'none' },

    // The weather actually used for this evaluation, kept so an investigator can
    // reconstruct why the model said what it said.
    weather: { type: Object, default: null },
    weatherSource: { type: String, default: 'live' },

    modelVersion: { type: String, default: null },
  },
  { timestamps: true }
);

// Trend queries are always "this flight, newest first".
riskSnapshotSchema.index({ flight: 1, createdAt: -1 });

module.exports = mongoose.model('RiskSnapshot', riskSnapshotSchema);
