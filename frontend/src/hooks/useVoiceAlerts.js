import { useEffect, useState } from 'react';
import * as voice from '../lib/voice';
import { spokenSeverity, severityMeta } from '../lib/risk';

/**
 * Announces new escalations as they arrive on the shared ops feed.
 *
 * Only emergencies and alerts are spoken. Advisories and watch items are
 * genuinely routine, and a speaker that talks constantly gets muted — at which
 * point it protects nobody.
 */

const SPEAK_FROM = ['emergency', 'alert'];

// A full announcement runs about nine seconds. Five arriving together would be
// three quarters of a minute of uninterrupted speech, which is unusable in a
// room — so a burst is capped and the remainder summarised in one line.
const MAX_PER_BURST = 2;

/** Builds the announcement. Short on purpose: speech is slow and blocking. */
export function phraseFor(incident) {
  const parts = [`${spokenSeverity(incident.severity)}.`];

  if (incident.flightNumber) {
    parts.push(`Flight ${voice.spellOut(incident.flightNumber)}.`);
  }

  parts.push(
    `${Math.round(incident.riskProbability * 100)} percent operational risk` +
      (incident.flightPhase ? ` during ${incident.flightPhase}.` : '.')
  );

  const primary = incident.triggeredRules?.find((r) => r.kind === 'primary');
  if (primary) parts.push(`${primary.label}.`);

  parts.push('Notify airline operations immediately.');

  return parts.join(' ');
}

export function useVoiceAlerts(incidents) {
  const [state, setState] = useState(() => ({
    enabled: voice.isEnabled(),
    unlocked: voice.isUnlocked(),
    supported: voice.isSupported(),
  }));

  useEffect(() => voice.subscribe((s) => setState((prev) => ({ ...prev, ...s }))), []);

  useEffect(() => {
    if (!state.enabled || !incidents?.length) return;

    const worth = incidents.filter(
      (i) => SPEAK_FROM.includes(i.severity) && i.status === 'open'
    );

    // Anything already announced is dropped before the cap is applied, so a
    // steady board does not consume the budget and mask a genuinely new one.
    const unspoken = worth.filter(
      (i) => !voice.hasSpoken(`${i.reference}:${i.severity}`)
    );
    if (!unspoken.length) return;

    // Worst first: if the budget is spent, it is spent on the emergency.
    const ordered = unspoken
      .slice()
      .sort((a, b) => severityMeta(b.severity).rank - severityMeta(a.severity).rank);

    ordered.slice(0, MAX_PER_BURST).forEach((incident) => {
      // Keyed on severity too, so an incident that worsens is re-announced
      // while a repeat of the same state stays silent.
      voice.speak(phraseFor(incident), `${incident.reference}:${incident.severity}`);
    });

    const remaining = ordered.length - MAX_PER_BURST;
    if (remaining > 0) {
      // Mark the rest as announced so they are not replayed on the next poll —
      // they are on the board, and the count is what the room needs.
      ordered.slice(MAX_PER_BURST).forEach((i) =>
        voice.markSpoken(`${i.reference}:${i.severity}`)
      );
      voice.speak(
        `And ${remaining} further escalation${remaining > 1 ? 's' : ''} on the board.`
      );
    }
  }, [incidents, state.enabled]);

  return {
    ...state,
    toggle: () => voice.setEnabled(!voice.isEnabled()),
    /** Speaks a sample so an operator can set the volume before it matters. */
    test: () => {
      voice.setEnabled(true);
      voice.cancel();
      voice.speak(
        'Emergency. Test announcement. High operational risk detected. ' +
          'Notify airline operations immediately.'
      );
    },
  };
}
