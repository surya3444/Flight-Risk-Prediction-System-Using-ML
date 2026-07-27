const mongoose = require('mongoose');
const { SEVERITY, THRESHOLDS, DEFAULT_INTERVAL_MINUTES } = require('../config/riskPolicy');

/**
 * Per-operator alert routing. Who gets told, at what severity, and where.
 *
 * One document per user, created lazily on first read so the app works out of
 * the box with the account email as the fallback dispatcher address.
 */
const alertSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    occName: { type: String, default: 'Operations Control Centre' },

    dispatcherEmail: { type: String, default: null, trim: true, lowercase: true },
    dutyManagerEmail: { type: String, default: null, trim: true, lowercase: true },
    // E.164, e.g. +919876543210. SMS is only attempted for emergency-tier events.
    dutyManagerPhone: { type: String, default: null, trim: true },

    // Optional POST target so an existing OCC dashboard can consume the feed.
    occWebhookUrl: { type: String, default: null, trim: true },

    // Nothing below this severity sends anything; it is still written to the log.
    notifyFrom: {
      type: String,
      enum: [SEVERITY.WATCH, SEVERITY.ADVISORY, SEVERITY.ALERT, SEVERITY.EMERGENCY],
      default: SEVERITY.ADVISORY,
    },

    smsEnabled: { type: Boolean, default: false },
    emailEnabled: { type: Boolean, default: true },

    // Operator overrides for the two thresholds most likely to be tuned per
    // fleet. Everything else stays in riskPolicy.js.
    highRiskThreshold: { type: Number, default: THRESHOLDS.highRisk, min: 0.1, max: 0.99 },
    escalationDelta: { type: Number, default: THRESHOLDS.escalationDelta, min: 0.02, max: 0.9 },

    defaultIntervalMinutes: { type: Number, default: DEFAULT_INTERVAL_MINUTES, min: 1, max: 60 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AlertSettings', alertSettingsSchema);
