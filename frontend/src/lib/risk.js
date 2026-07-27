/**
 * The shared risk vocabulary for the UI.
 *
 * Colours come from a status palette validated for contrast against the app's
 * dark surface (#0B0F19) — every one clears 3:1. Status colour is never the
 * only channel: each severity also ships a label and a glyph, because a colour
 * alone is not an alert.
 *
 * Thresholds mirror backend/config/riskPolicy.js. The Ops Centre also fetches
 * the live policy from /api/monitor/policy; these are the fallbacks used before
 * that arrives.
 */

export const SURFACE = '#0B0F19';

export const SEVERITY = {
  emergency: {
    key: 'emergency',
    label: 'Emergency',
    glyph: '⛔',
    colour: '#d03b3b',
    rank: 4,
    blurb: 'Full escalation — duty manager paged, OCC feed updated.',
  },
  alert: {
    key: 'alert',
    label: 'Alert',
    glyph: '▲',
    colour: '#ec835a',
    rank: 3,
    blurb: 'Dispatcher and duty manager notified.',
  },
  advisory: {
    key: 'advisory',
    label: 'Advisory',
    glyph: '●',
    colour: '#fab219',
    rank: 2,
    blurb: 'Dispatcher notified by email.',
  },
  watch: {
    key: 'watch',
    label: 'Watch',
    glyph: '◆',
    colour: '#3987e5',
    rank: 1,
    blurb: 'Logged for the board. Nobody is paged.',
  },
  none: {
    key: 'none',
    label: 'Nominal',
    glyph: '✓',
    colour: '#0ca30c',
    rank: 0,
    blurb: 'No escalation conditions met.',
  },
};

export const BANDS = {
  critical: { label: 'Critical', floor: 0.85, colour: '#d03b3b' },
  high: { label: 'High', floor: 0.7, colour: '#ec835a' },
  elevated: { label: 'Elevated', floor: 0.55, colour: '#fab219' },
  advisory: { label: 'Advisory', floor: 0.4, colour: '#3987e5' },
  nominal: { label: 'Nominal', floor: 0, colour: '#0ca30c' },
};

export const DEFAULT_THRESHOLDS = {
  highRisk: 0.7,
  elevatedRisk: 0.55,
  escalationDelta: 0.15,
};

export const severityMeta = (key) => SEVERITY[key] || SEVERITY.none;

export const bandMeta = (key) => BANDS[key] || BANDS.nominal;

export const bandFor = (p) => {
  if (p >= 0.85) return 'critical';
  if (p >= 0.7) return 'high';
  if (p >= 0.55) return 'elevated';
  if (p >= 0.4) return 'advisory';
  return 'nominal';
};

export const riskColour = (p) => BANDS[bandFor(p)].colour;

export const pct = (p, digits = 1) =>
  p === null || p === undefined ? '—' : `${(p * 100).toFixed(digits)}%`;

export const signedPct = (d) => {
  if (d === null || d === undefined) return '—';
  const value = (d * 100).toFixed(1);
  return d > 0 ? `+${value}` : value;
};

export const PHASES = ['takeoff', 'climb', 'cruise', 'descent', 'landing'];

export const CRITICAL_PHASES = ['takeoff', 'landing'];

export const FLIGHT_STATUS = {
  scheduled: { label: 'Scheduled', colour: '#3987e5' },
  active: { label: 'In flight', colour: '#0ca30c' },
  completed: { label: 'Arrived', colour: '#898781' },
  stopped: { label: 'Stopped', colour: '#ec835a' },
};

/** "4 min ago" / "in 12 min" — the OCC reads elapsed time, not clock time. */
export function relativeTime(value) {
  if (!value) return 'never';
  const diffMs = new Date(value).getTime() - Date.now();
  const mins = Math.round(Math.abs(diffMs) / 60000);
  const future = diffMs > 0;

  let text;
  if (mins < 1) text = 'moments';
  else if (mins < 60) text = `${mins} min`;
  else if (mins < 1440) text = `${Math.round(mins / 60)} h`;
  else text = `${Math.round(mins / 1440)} d`;

  return future ? `in ${text}` : `${text} ago`;
}

export const clockTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';
