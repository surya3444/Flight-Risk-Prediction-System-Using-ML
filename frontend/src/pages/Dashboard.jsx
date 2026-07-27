import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { predictApi, errorMessage } from '../services/api';
import { useOps } from '../context/opsContextValue';
import StartMonitoringDialog from '../components/StartMonitoringDialog';
import {
  Page,
  Card,
  CardHeader,
  Button,
  Banner,
  SeverityBadge,
  RiskGauge,
  FactorList,
  RuleList,
  inputClass,
  labelClass,
} from '../components/ui';
import { severityMeta, pct } from '../lib/risk';

// Curated list of global and regional aviation hubs
const CITIES = [
  'Ahmedabad', 'Amsterdam', 'Bengaluru', 'Chandigarh', 'Chennai', 'Chicago',
  'Coimbatore', 'Delhi', 'Dubai', 'Frankfurt', 'Gadag', 'Goa', 'Guwahati',
  'Hong Kong', 'Hubballi', 'Hyderabad', 'Jaipur', 'Kochi', 'Kolkata',
  'London', 'Los Angeles', 'Lucknow', 'Mangaluru', 'Mumbai', 'Mysuru',
  'New York', 'Paris', 'Pune', 'San Francisco', 'Seoul', 'Singapore',
  'Sydney', 'Thiruvananthapuram', 'Tokyo', 'Toronto',
].sort();

/**
 * Fully controlled — the typed text *is* the value. An earlier version mirrored
 * the prop into local state and synced it back with an effect, which meant the
 * two could disagree for a render.
 */
const SearchableCityInput = ({ value, onChange, placeholder, buttonNode, id }) => {
  const [isOpen, setIsOpen] = useState(false);

  const filtered = CITIES.filter((c) => c.toLowerCase().includes(value.toLowerCase()));

  return (
    <div className="relative w-full">
      <div className="mt-1 flex w-full rounded-lg shadow-sm">
        <input
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          // Delay the close so a click on an option registers first.
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className={`w-full border border-slate-700 bg-slate-900/50 p-3 text-slate-200 placeholder-slate-500 transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
            buttonNode ? 'rounded-l-lg border-r-0' : 'rounded-lg'
          }`}
        />
        {buttonNode}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/95 shadow-2xl backdrop-blur-xl">
          {filtered.map((city) => (
            <li
              key={city}
              // onMouseDown fires before the input's onBlur, so the menu is
              // still open when the choice lands.
              onMouseDown={() => {
                onChange(city);
                setIsOpen(false);
              }}
              className="cursor-pointer border-b border-slate-700/50 p-3 text-slate-300 transition-colors last:border-0 hover:bg-indigo-600 hover:text-white"
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Single-flight risk assessment.
 *
 * The result panel is deliberately more than a number: the score, the model's
 * own reasons for it, the escalation rules it tripped, and what the system did
 * about it. A dispatcher who cannot see why will not trust the figure — and a
 * figure nobody trusts changes no decisions.
 */
export default function Dashboard() {
  const { thresholds, refresh: refreshOps } = useOps();

  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [result, setResult] = useState(null);
  const [monitorOpen, setMonitorOpen] = useState(false);

  const [mode, setMode] = useState('simple');
  const [departureCity, setDepartureCity] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');

  const [formData, setFormData] = useState({
    flight_duration: 120, flight_phase: 'takeoff', departure_elevation: 500, arrival_elevation: 500,
    total_onboard: 150, cargo_weight: 8000, airline: 'Indigo', aircraft_type: 'A320',
    aircraft_age: 8, last_maintenance_hours: 120, engine_hours_since_overhaul: 3000,
    pilot_experience: 6000, copilot_experience: 3500, crew_count: 6, season: 'summer',
    weather_condition: 'clear', visibility_km: 10, wind_speed_knots: 5, wind_direction: 90,
    temperature_c: 25, precipitation_mm: 0, turbulence_severity: 'none', route_complexity: 0.3,
    air_traffic_density: 0.4,
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({ ...formData, [name]: type === 'number' ? Number(value) : value });
  };

  const autoFillWeather = async () => {
    if (!departureCity) {
      setNotice({ tone: 'warning', text: 'Choose a departure city before syncing weather.' });
      return;
    }

    setWeatherLoading(true);
    setNotice(null);

    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(departureCity)}&units=metric&appid=${apiKey}`
      );
      const weather = response.data;

      let condition = 'clear';
      const main = weather.weather[0].main.toLowerCase();
      if (main.includes('rain') || main.includes('drizzle')) condition = 'rain';
      if (main.includes('thunderstorm') || main.includes('extreme')) condition = 'storm';
      if (main.includes('snow')) condition = 'snow';

      const month = new Date().getMonth();
      let season = 'summer';
      if (month >= 2 && month <= 4) season = 'spring';
      if (month >= 8 && month <= 10) season = 'autumn';
      if (month === 11 || month <= 1) season = 'winter';

      const windKnots = Math.round(weather.wind.speed * 1.94384);

      setFormData((prev) => ({
        ...prev,
        temperature_c: Math.round(weather.main.temp),
        visibility_km: weather.visibility != null ? weather.visibility / 1000 : 10,
        wind_speed_knots: windKnots,
        wind_direction: weather.wind.deg ?? 0,
        precipitation_mm: weather.rain?.['1h'] ?? 0,
        weather_condition: condition,
        season,
        turbulence_severity: windKnots > 45 || condition === 'storm' ? 'severe' : windKnots > 28 ? 'moderate' : windKnots > 14 ? 'light' : 'none',
      }));

      setNotice({ tone: 'success', text: `Conditions synced from ${weather.name}.` });
    } catch {
      setNotice({ tone: 'error', text: 'Could not fetch weather. Check the city name or the API key.' });
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    setResult(null);

    try {
      const response = await predictApi.run({
        ...formData,
        departure_city: departureCity || undefined,
        arrival_city: arrivalCity || undefined,
      });
      setResult(response);
      // An assessment can raise an incident, so the shared feed is now stale.
      if (response.incident) refreshOps();
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err, 'Assessment failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const assessment = result?.assessment;
  const probability = result?.data?.predictionResult?.risk_probability;
  const severity = assessment?.severity || 'none';

  return (
    <Page
      title="Flight risk assessment"
      subtitle="Score a single flight against the model, see why, and hand it to continuous monitoring if it warrants watching."
      actions={
        <div className="flex rounded-lg border border-slate-700 bg-slate-800/50 p-1 backdrop-blur-md">
          {[['simple', 'Autopilot'], ['advanced', 'Manual override']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`rounded-md px-5 py-2 text-sm font-semibold transition-all ${
                mode === key ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {notice && <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}

      {result && (
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="px-6 py-5">
            <RiskGauge probability={probability} thresholds={thresholds} label="Assessed risk" />

            <div className="mt-5 flex items-center gap-3 border-t border-slate-700/50 pt-4">
              <SeverityBadge severity={severity} size="lg" />
              <span className="text-sm text-slate-400">{severityMeta(severity).blurb}</span>
            </div>

            <div className="mt-5">
              <Button variant="primary" className="w-full" onClick={() => setMonitorOpen(true)}>
                Put this flight under continuous monitoring
              </Button>
              <p className="mt-2 text-xs text-slate-500">
                This assessment is a single moment. Monitoring re-scores it against fresh weather
                every few minutes and escalates on its own.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Why the model scored it this way"
              hint="Measured by re-scoring the flight with each input set to nominal, one at a time."
            />
            <div className="px-6 py-5">
              <FactorList factors={assessment?.contributingFactors} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Escalation" hint={result.incident ? 'An incident was raised.' : 'No incident raised.'} />
            <div className="px-6 py-5">
              <RuleList rules={assessment?.triggeredRules} />

              {result.incident && (
                <div className="mt-5 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-slate-300">{result.incident.reference}</span>
                    <SeverityBadge severity={result.incident.severity} />
                  </div>
                  <ul className="mt-3 space-y-1 text-xs">
                    {result.incident.notifications?.map((n, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-slate-500">{n.channel}</span>
                        <span style={{ color: n.status === 'sent' ? '#0ca30c' : n.status === 'failed' ? '#d03b3b' : '#898781' }}>
                          {n.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/incidents" className="mt-3 inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                    Open the incident log →
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="p-8 shadow-2xl">
          {mode === 'simple' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="dep-city">Departure city</label>
                  <SearchableCityInput
                    id="dep-city"
                    placeholder="Search city (e.g. Bengaluru)"
                    value={departureCity}
                    onChange={setDepartureCity}
                    buttonNode={
                      <button
                        type="button"
                        onClick={autoFillWeather}
                        disabled={weatherLoading}
                        className="rounded-r-lg border border-indigo-500 bg-indigo-600 px-6 font-semibold whitespace-nowrap text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.5)] disabled:opacity-60"
                      >
                        {weatherLoading ? 'Syncing…' : 'Sync weather'}
                      </button>
                    }
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="arr-city">Arrival city</label>
                  <SearchableCityInput
                    id="arr-city"
                    placeholder="Search city (e.g. Dubai)"
                    value={arrivalCity}
                    onChange={setArrivalCity}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="airline-simple">Operator</label>
                  <select id="airline-simple" name="airline" value={formData.airline} onChange={handleChange} className={`${inputClass} mt-1`}>
                    {['Delta', 'United', 'Emirates', 'Lufthansa', 'Indigo'].map((o) => (
                      <option key={o} value={o} className="bg-slate-800">{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="phase-simple">Flight phase</label>
                  <select id="phase-simple" name="flight_phase" value={formData.flight_phase} onChange={handleChange} className={`${inputClass} mt-1`}>
                    {['takeoff', 'climb', 'cruise', 'descent', 'landing'].map((o) => (
                      <option key={o} value={o} className="bg-slate-800">{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="duration-simple">Block time (mins)</label>
                  <input id="duration-simple" type="number" name="flight_duration" value={formData.flight_duration} onChange={handleChange} className={`${inputClass} mt-1`} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="onboard-simple">Souls on board</label>
                  <input id="onboard-simple" type="number" name="total_onboard" value={formData.total_onboard} onChange={handleChange} className={`${inputClass} mt-1`} />
                </div>
              </div>

              <div className="rounded-lg border border-indigo-500/30 bg-indigo-900/20 p-4 text-sm text-indigo-200">
                <strong className="text-indigo-400">Autopilot:</strong> environmental parameters come
                from live weather at the departure city. Fleet averages are applied to the technical
                metrics — switch to manual override to set them yourself.
              </div>
            </div>
          )}

          {mode === 'advanced' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <fieldset className="space-y-5 border-slate-700/50 lg:border-r lg:pr-8">
                <legend className="flex items-center gap-2 border-b border-slate-700 pb-3">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" aria-hidden />
                  <span className="font-semibold text-slate-200">Route</span>
                </legend>
                {[
                  ['flight_duration', 'Duration (mins)'],
                  ['departure_elevation', 'Origin elevation (ft)'],
                  ['arrival_elevation', 'Destination elevation (ft)'],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label className={labelClass} htmlFor={name}>{label}</label>
                    <input id={name} type="number" name={name} value={formData[name]} onChange={handleChange} className={`${inputClass} mt-1`} />
                  </div>
                ))}
                <div>
                  <label className={labelClass} htmlFor="flight_phase">Phase</label>
                  <select id="flight_phase" name="flight_phase" value={formData.flight_phase} onChange={handleChange} className={`${inputClass} mt-1`}>
                    {['takeoff', 'climb', 'cruise', 'descent', 'landing'].map((o) => (
                      <option key={o} value={o} className="bg-slate-800">{o}</option>
                    ))}
                  </select>
                </div>
                {[
                  ['route_complexity', 'Route complexity (0–1)'],
                  ['air_traffic_density', 'Traffic density (0–1)'],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label className={labelClass} htmlFor={name}>{label}</label>
                    <input id={name} type="number" step="0.1" name={name} value={formData[name]} onChange={handleChange} className={`${inputClass} mt-1`} />
                  </div>
                ))}
              </fieldset>

              <fieldset className="space-y-5 border-slate-700/50 lg:border-r lg:pr-8">
                <legend className="flex items-center gap-2 border-b border-slate-700 pb-3">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" aria-hidden />
                  <span className="font-semibold text-slate-200">Aircraft &amp; crew</span>
                </legend>
                <div>
                  <label className={labelClass} htmlFor="airline">Operator</label>
                  <select id="airline" name="airline" value={formData.airline} onChange={handleChange} className={`${inputClass} mt-1`}>
                    {['Delta', 'United', 'Emirates', 'Lufthansa', 'Indigo'].map((o) => (
                      <option key={o} value={o} className="bg-slate-800">{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="aircraft_type">Airframe</label>
                  <select id="aircraft_type" name="aircraft_type" value={formData.aircraft_type} onChange={handleChange} className={`${inputClass} mt-1`}>
                    {['A320', 'B737', 'B787', 'A350'].map((o) => (
                      <option key={o} value={o} className="bg-slate-800">{o}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['aircraft_age', 'Age (yrs)'],
                    ['crew_count', 'Crew'],
                    ['total_onboard', 'Souls'],
                    ['cargo_weight', 'Payload (kg)'],
                    ['pilot_experience', 'Captain (hrs)'],
                    ['copilot_experience', 'F/O (hrs)'],
                    ['last_maintenance_hours', 'Since maint. (hrs)'],
                    ['engine_hours_since_overhaul', 'Engine (hrs)'],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <label className={labelClass} htmlFor={name}>{label}</label>
                      <input id={name} type="number" name={name} value={formData[name]} onChange={handleChange} className={`${inputClass} mt-1`} />
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-5">
                <legend className="flex items-center gap-2 border-b border-slate-700 pb-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" aria-hidden />
                  <span className="font-semibold text-slate-200">Environment</span>
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="season">Season</label>
                    <select id="season" name="season" value={formData.season} onChange={handleChange} className={`${inputClass} mt-1`}>
                      {['spring', 'summer', 'autumn', 'winter'].map((o) => (
                        <option key={o} value={o} className="bg-slate-800">{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="weather_condition">Weather</label>
                    <select id="weather_condition" name="weather_condition" value={formData.weather_condition} onChange={handleChange} className={`${inputClass} mt-1`}>
                      {['clear', 'rain', 'storm', 'snow'].map((o) => (
                        <option key={o} value={o} className="bg-slate-800">{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="turbulence_severity">Turbulence</label>
                  <select id="turbulence_severity" name="turbulence_severity" value={formData.turbulence_severity} onChange={handleChange} className={`${inputClass} mt-1`}>
                    {['none', 'light', 'moderate', 'severe'].map((o) => (
                      <option key={o} value={o} className="bg-slate-800">{o}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['temperature_c', 'Temp (°C)'],
                    ['precipitation_mm', 'Precip (mm)'],
                    ['wind_speed_knots', 'Wind (kt)'],
                    ['wind_direction', 'Direction (°)'],
                    ['visibility_km', 'Visibility (km)'],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <label className={labelClass} htmlFor={name}>{label}</label>
                      <input id={name} type="number" name={name} value={formData[name]} onChange={handleChange} className={`${inputClass} mt-1`} />
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          <div className="mt-10 border-t border-slate-700/50 pt-8">
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl border border-indigo-500/50 px-6 py-4 text-lg font-bold tracking-wide text-white shadow-lg transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                loading
                  ? 'cursor-not-allowed bg-indigo-800/50'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]'
              }`}
            >
              {loading ? 'Scoring…' : 'Run risk assessment'}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Assessments above {pct(thresholds?.highRisk ?? 0.7, 0)}, or in a critical phase, or in
              adverse weather, are escalated to airline operations automatically.
            </p>
          </div>
        </Card>
      </form>

      <StartMonitoringDialog
        open={monitorOpen}
        onClose={() => setMonitorOpen(false)}
        prefill={{
          departureCity,
          arrivalCity,
          flight_duration: formData.flight_duration,
          departure_elevation: formData.departure_elevation,
          arrival_elevation: formData.arrival_elevation,
          total_onboard: formData.total_onboard,
          cargo_weight: formData.cargo_weight,
          airline: formData.airline,
          aircraft_type: formData.aircraft_type,
          aircraft_age: formData.aircraft_age,
          last_maintenance_hours: formData.last_maintenance_hours,
          engine_hours_since_overhaul: formData.engine_hours_since_overhaul,
          pilot_experience: formData.pilot_experience,
          copilot_experience: formData.copilot_experience,
          crew_count: formData.crew_count,
          route_complexity: formData.route_complexity,
          air_traffic_density: formData.air_traffic_density,
        }}
        onCreated={() => {
          setNotice({ tone: 'success', text: 'Flight is now under continuous monitoring.' });
          refreshOps();
        }}
      />
    </Page>
  );
}
