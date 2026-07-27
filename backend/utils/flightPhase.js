/**
 * Derives the flight phase from the clock.
 *
 * The system has no ADS-B feed, so phase is modelled from scheduled departure
 * plus block time. That is honest and sufficient: the point is to know *which*
 * phase the risk applies to, and the phase boundaries below match the profile
 * of a typical commercial sector.
 */

const PHASE_PROFILE = [
  { until: 0.05, phase: 'takeoff' },
  { until: 0.22, phase: 'climb' },
  { until: 0.78, phase: 'cruise' },
  { until: 0.95, phase: 'descent' },
  { until: Infinity, phase: 'landing' },
];

/**
 * @returns {{ phase: string, progress: number, state: 'pre-departure'|'in-flight'|'arrived' }}
 */
function derivePhase(scheduledDeparture, blockMinutes, now = new Date()) {
  const start = new Date(scheduledDeparture).getTime();
  const durationMs = Math.max(blockMinutes, 1) * 60000;
  const elapsed = now.getTime() - start;

  if (elapsed < 0) {
    // Pre-departure is scored as takeoff: it is the phase the aircraft is about
    // to enter, and it is the decision point where a delay is still cheap.
    return { phase: 'takeoff', progress: 0, state: 'pre-departure' };
  }

  const progress = elapsed / durationMs;
  if (progress >= 1) {
    return { phase: 'landing', progress: 1, state: 'arrived' };
  }

  const match = PHASE_PROFILE.find((p) => progress < p.until);
  return { phase: match.phase, progress: Number(progress.toFixed(4)), state: 'in-flight' };
}

/**
 * Which airport's weather matters right now. Departure conditions drive the
 * first half of the sector; from top of descent onward it is the arrival field.
 */
function relevantField(phase) {
  return ['descent', 'landing'].includes(phase) ? 'arrival' : 'departure';
}

module.exports = { derivePhase, relevantField, PHASE_PROFILE };
