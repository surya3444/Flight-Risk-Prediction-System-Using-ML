const mongoose = require('mongoose');
const {
  DEFAULT_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  MAX_INTERVAL_MINUTES,
} = require('../config/riskPolicy');

/**
 * A flight the system is actively re-scoring on a cadence.
 *
 * `baselineData` holds the operator-supplied flight facts that do not change in
 * the air (airframe, crew, payload, route). Each monitoring cycle overlays live
 * weather and the derived flight phase on top of it, so we never re-ask the
 * dispatcher for the same 24 fields.
 */
const monitoredFlightSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    flightNumber: { type: String, required: true, trim: true, uppercase: true },
    departureCity: { type: String, required: true, trim: true },
    arrivalCity: { type: String, required: true, trim: true },

    scheduledDeparture: { type: Date, required: true },
    // Block time in minutes; drives both the phase model and the completion time.
    blockMinutes: { type: Number, required: true, min: 1 },

    baselineData: { type: Object, required: true },

    intervalMinutes: {
      type: Number,
      default: DEFAULT_INTERVAL_MINUTES,
      min: MIN_INTERVAL_MINUTES,
      max: MAX_INTERVAL_MINUTES,
    },

    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'stopped'],
      default: 'scheduled',
      index: true,
    },

    // When the scheduler should next pick this flight up. Indexed because the
    // scheduler's hot query is "everything due before now".
    nextCheckAt: { type: Date, default: Date.now, index: true },
    lastCheckedAt: { type: Date, default: null },

    currentPhase: { type: String, default: 'takeoff' },
    latestProbability: { type: Number, default: null },
    latestBand: { type: String, default: null },
    previousProbability: { type: Number, default: null },
    peakProbability: { type: Number, default: 0 },

    // Drives the SUSTAINED_HIGH_RISK rule.
    consecutiveHighChecks: { type: Number, default: 0 },

    highestSeverity: { type: String, default: 'none' },
    checkCount: { type: Number, default: 0 },
    // Consecutive failures talking to the weather or ML tier. Surfaced in the
    // OCC so a silent flight is never mistaken for a safe one.
    consecutiveFailures: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

// The scheduler's sweep: due, still running, oldest first.
monitoredFlightSchema.index({ status: 1, nextCheckAt: 1 });

monitoredFlightSchema.virtual('estimatedArrival').get(function () {
  return new Date(this.scheduledDeparture.getTime() + this.blockMinutes * 60000);
});

monitoredFlightSchema.set('toJSON', { virtuals: true });
monitoredFlightSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MonitoredFlight', monitoredFlightSchema);
