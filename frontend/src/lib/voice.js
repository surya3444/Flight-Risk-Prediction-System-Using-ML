/**
 * Spoken alerts over the Web Speech API.
 *
 * Three things make this reliable rather than a party trick:
 *
 * 1. **Autoplay policy.** Chrome, Safari and Edge silently refuse
 *    `speechSynthesis.speak()` until the page has had a real user gesture.
 *    Nothing throws — it just never speaks. Enabling is therefore a deliberate
 *    click (which *is* the gesture), and a preference restored from storage
 *    stays "armed" until the next click anywhere unlocks it.
 *
 * 2. **Deduplication.** The ops feed re-polls every 20 seconds. Without a
 *    spoken-key ledger the same emergency would be announced every poll until
 *    someone acknowledged it, which is how you train a room to ignore the
 *    speaker.
 *
 * 3. **Never audio-only.** Everything spoken here is already on screen. Sound
 *    is a second channel for a room that is not looking at the board, not the
 *    only way to learn something.
 */

const STORAGE_KEY = 'aerosafe.voiceAlerts';

let unlocked = false;
let unlockListenerAttached = false;
const spoken = new Set();
const listeners = new Set();

export function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isEnabled() {
  if (!isSupported()) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    // Private mode, blocked site data — treat as off rather than throwing.
    return false;
  }
}

/** True once a gesture has actually unlocked audio, so the UI can say so. */
export function isUnlocked() {
  return unlocked;
}

function notify() {
  listeners.forEach((fn) => fn({ enabled: isEnabled(), unlocked }));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Arms the synthesiser. Must be called from inside a real user gesture —
 * speaking a zero-length utterance is the standard way to satisfy the policy.
 */
export function unlock() {
  if (!isSupported() || unlocked) return;
  try {
    const probe = new SpeechSynthesisUtterance('');
    probe.volume = 0;
    window.speechSynthesis.speak(probe);
    unlocked = true;
    notify();
  } catch {
    // Leave locked; the next gesture tries again.
  }
}

/**
 * Waits for the first click/keypress anywhere and unlocks then. Used when the
 * preference was restored from a previous session, where no gesture has
 * happened yet on this page load.
 */
function armOnNextGesture() {
  if (unlockListenerAttached || unlocked || !isSupported()) return;
  unlockListenerAttached = true;

  const handler = () => {
    unlock();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
    unlockListenerAttached = false;
  };

  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });
}

export function setEnabled(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Preference simply will not persist; the session still works.
  }

  if (on) {
    unlock();
  } else {
    cancel();
  }
  notify();
}

export function cancel() {
  if (isSupported()) window.speechSynthesis.cancel();
}

/**
 * macOS ships a set of novelty voices — "Bad News", "Boing", "Bubbles",
 * "Zarvox" and friends — that are indistinguishable from real ones in
 * `getVoices()` and would be catastrophic narrating an emergency. They are
 * named explicitly because there is no flag that identifies them.
 */
const NOVELTY_VOICES = new Set([
  'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos',
  'Wobble', 'Eddy', 'Flo', 'Fred', 'Good News', 'Grandma', 'Grandpa',
  'Jester', 'Junior', 'Kathy', 'Organ', 'Superstar', 'Ralph', 'Reed',
  'Rocko', 'Sandy', 'Shelley', 'Trinoids', 'Whisper', 'Zarvox',
]);

// Known-good newsreader-quality voices, best first. Named explicitly so the
// demo sounds the same on the machine it is demonstrated on.
const PREFERRED = [
  'Google UK English Female',
  'Google UK English Male',
  'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'Daniel',
  'Serena',
  'Kate',
  'Samantha',
  'Karen',
  'Moira',
  'Tessa',
  'Alex',
];

function isUsable(v) {
  const base = String(v.name).replace(/\s*\(.*\)\s*$/, '').trim();
  return !NOVELTY_VOICES.has(base) && !NOVELTY_VOICES.has(v.name);
}

/** Picks a clear English voice; the list populates asynchronously. */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter((v) => /^en(-|_|$)/i.test(v.lang)).filter(isUsable);
  const pool = english.length ? english : voices.filter(isUsable);
  if (!pool.length) return null;

  for (const name of PREFERRED) {
    const match = pool.find((v) => v.name === name);
    if (match) return match;
  }

  // Otherwise prefer a local (offline) en-GB/en-US voice — network voices can
  // stall, and a stalled alert is a silent one.
  return (
    pool.find((v) => /en-(GB|US)/i.test(v.lang) && v.localService) ||
    pool.find((v) => /en-(GB|US)/i.test(v.lang)) ||
    pool[0]
  );
}

/**
 * Speaks a phrase.
 *
 * @param {string} text
 * @param {string} [key] dedup key — a phrase with a key is spoken at most once
 */
export function speak(text, key) {
  if (!isEnabled() || !isSupported() || !text) return false;

  if (!unlocked) {
    // Preference is on but the page has had no gesture yet. Arm and drop this
    // one rather than queueing a burst that all fires on the first click.
    armOnNextGesture();
    return false;
  }

  if (key) {
    if (spoken.has(key)) return false;
    spoken.add(key);
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-GB';
    // Slightly slow and low: an alert should sound deliberate, and operations
    // audio is often heard across a room rather than through headphones.
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** Has this key already been announced? */
export function hasSpoken(key) {
  return spoken.has(key);
}

/** Records a key as announced without speaking it. */
export function markSpoken(key) {
  spoken.add(key);
}

/** Forgets what has been announced — used when the operator signs out. */
export function resetHistory() {
  spoken.clear();
}

/**
 * Reads an identifier character by character.
 * "6E204" spoken as a number becomes "six thousand E two hundred four"; spaced
 * out it reads as the callsign it is.
 */
export function spellOut(value) {
  return String(value || '').split('').join(' ');
}

// Restore the preference on load, arming for the first gesture.
if (isSupported() && isEnabled()) armOnNextGesture();
