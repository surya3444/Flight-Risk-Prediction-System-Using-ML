const mongoose = require('mongoose');
const { SEVERITY } = require('../config/riskPolicy');

/**
 * Every notification attempt is recorded, including the failures. An incident
 * log that only shows successful sends is worse than no log — it tells the duty
 * manager they were informed when they were not.
 */
const notificationSchema = new mongoose.Schema(
  {
    channel: { type: String, required: true },
    target: { type: String, default: null },
    status: { type: String, enum: ['sent', 'failed', 'skipped'], required: true },
    detail: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const updateSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    riskProbability: { type: Number, required: true },
    severity: { type: String, required: true },
    flightPhase: { type: String, default: null },
    note: { type: String, default: null },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Null for one-shot dashboard predictions that escalated without being put
    // under continuous monitoring.
    flight: { type: mongoose.Schema.Types.ObjectId, ref: 'MonitoredFlight', default: null, index: true },
    snapshot: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskSnapshot', default: null },

    // Short human reference the OCC can read out loud, e.g. INC-7F3A21.
    reference: { type: String, required: true, unique: true },

    flightNumber: { type: String, default: null },
    route: { type: String, default: null },

    severity: {
      type: String,
      enum: Object.values(SEVERITY).filter((s) => s !== SEVERITY.NONE),
      required: true,
      index: true,
    },
    riskProbability: { type: Number, required: true },
    peakProbability: { type: Number, required: true },
    flightPhase: { type: String, default: null },

    triggeredRules: { type: Array, default: [] },
    contributingFactors: { type: Array, default: [] },
    summary: { type: String, required: true },

    source: { type: String, enum: ['monitor', 'manual-prediction'], default: 'monitor' },

    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
      index: true,
    },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, default: null },

    notifications: { type: [notificationSchema], default: [] },
    // Re-triggers within the cooldown window append here instead of opening a
    // duplicate incident.
    updates: { type: [updateSchema], default: [] },

    lastTriggeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// The OCC board query: my open incidents, worst and newest first.
incidentSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
