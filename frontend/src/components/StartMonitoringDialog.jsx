import { useEffect, useState } from 'react';
import { monitorApi, errorMessage } from '../services/api';
import { Button, Banner, inputClass, labelClass } from './ui';

/**
 * Puts a flight under continuous monitoring.
 *
 * Only the facts that do not change in the air are collected here. Weather,
 * season and flight phase are deliberately absent: the server refreshes those
 * on every cycle, and asking a dispatcher to type today's visibility into a
 * monitor that will run for four hours would be worse than useless.
 */

const DEFAULT_BASELINE = {
  flight_duration: 120,
  departure_elevation: 500,
  arrival_elevation: 500,
  total_onboard: 150,
  cargo_weight: 8000,
  airline: 'Indigo',
  aircraft_type: 'A320',
  aircraft_age: 8,
  last_maintenance_hours: 120,
  engine_hours_since_overhaul: 3000,
  pilot_experience: 6000,
  copilot_experience: 3500,
  crew_count: 6,
  route_complexity: 0.3,
  air_traffic_density: 0.4,
};

const AIRLINES = ['Delta', 'United', 'Emirates', 'Lufthansa', 'Indigo'];
const AIRCRAFT = ['A320', 'B737', 'B787', 'A350'];

/** Datetime-local wants local wall time, not the UTC that toISOString gives. */
function toLocalInputValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function StartMonitoringDialog({ open, onClose, onCreated, prefill = {}, defaultInterval = 5 }) {
  const [form, setForm] = useState(() => ({
    flightNumber: '',
    departureCity: '',
    arrivalCity: '',
    scheduledDeparture: toLocalInputValue(new Date()),
    intervalMinutes: defaultInterval,
    ...DEFAULT_BASELINE,
  }));

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Re-seed each time the dialog opens so a monitor started from an assessment
  // inherits exactly the aircraft and crew that were just scored.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm((prev) => ({
      ...prev,
      scheduledDeparture: toLocalInputValue(new Date()),
      intervalMinutes: defaultInterval,
      ...prefill,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (event) => {
    const { name, value, type } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await monitorApi.create({
        ...form,
        scheduledDeparture: new Date(form.scheduledDeparture).toISOString(),
      });
      onCreated?.(response);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not start monitoring for this flight.'));
    } finally {
      setSaving(false);
    }
  };

  const numberField = (name, label, step) => (
    <div key={name}>
      <label className={labelClass} htmlFor={`monitor-${name}`}>{label}</label>
      <input
        id={`monitor-${name}`}
        type="number"
        step={step}
        name={name}
        value={form[name]}
        onChange={set}
        className={`${inputClass} mt-1`}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-700 bg-[#0F1523] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/60 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Start continuous monitoring</h2>
            <p className="mt-1 text-sm text-slate-400">
              The server re-scores this flight on the interval below, pulling fresh weather each time.
              Weather and flight phase are updated automatically — you do not enter them here.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white" aria-label="Close">✕</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5">
          {error && <Banner tone="error">{error}</Banner>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="monitor-flightNumber">Flight number</label>
              <input
                id="monitor-flightNumber"
                name="flightNumber"
                required
                value={form.flightNumber}
                onChange={set}
                placeholder="6E204"
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="monitor-interval">Check every (minutes)</label>
              <input
                id="monitor-interval"
                type="number"
                min="1"
                max="60"
                name="intervalMinutes"
                value={form.intervalMinutes}
                onChange={set}
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="monitor-dep">Departure city</label>
              <input
                id="monitor-dep"
                name="departureCity"
                required
                value={form.departureCity}
                onChange={set}
                placeholder="Bengaluru"
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="monitor-arr">Arrival city</label>
              <input
                id="monitor-arr"
                name="arrivalCity"
                required
                value={form.arrivalCity}
                onChange={set}
                placeholder="Dubai"
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="monitor-std">Scheduled departure</label>
              <input
                id="monitor-std"
                type="datetime-local"
                name="scheduledDeparture"
                required
                value={form.scheduledDeparture}
                onChange={set}
                className={`${inputClass} mt-1`}
              />
            </div>

            {numberField('flight_duration', 'Block time (mins)')}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-5 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
          >
            {showAdvanced ? '− Hide' : '+ Show'} aircraft, crew and route details
          </button>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-700/50 pt-5 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="monitor-airline">Operator</label>
                <select id="monitor-airline" name="airline" value={form.airline} onChange={set} className={`${inputClass} mt-1`}>
                  {AIRLINES.map((a) => <option key={a} value={a} className="bg-slate-800">{a}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="monitor-aircraft">Aircraft type</label>
                <select id="monitor-aircraft" name="aircraft_type" value={form.aircraft_type} onChange={set} className={`${inputClass} mt-1`}>
                  {AIRCRAFT.map((a) => <option key={a} value={a} className="bg-slate-800">{a}</option>)}
                </select>
              </div>
              {numberField('aircraft_age', 'Airframe age (yrs)')}
              {numberField('last_maintenance_hours', 'Hrs since maintenance')}
              {numberField('engine_hours_since_overhaul', 'Engine hrs since overhaul')}
              {numberField('crew_count', 'Crew')}
              {numberField('total_onboard', 'Souls on board')}
              {numberField('cargo_weight', 'Cargo (kg)')}
              {numberField('pilot_experience', 'Captain hrs')}
              {numberField('copilot_experience', 'First officer hrs')}
              {numberField('departure_elevation', 'Dep. elevation (ft)')}
              {numberField('arrival_elevation', 'Arr. elevation (ft)')}
              {numberField('route_complexity', 'Route complexity (0–1)', '0.1')}
              {numberField('air_traffic_density', 'Traffic density (0–1)', '0.1')}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-700/50 pt-5">
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Starting…' : 'Start monitoring'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
