import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

// Curated list of global and regional aviation hubs
const CITIES = [
  "Ahmedabad", "Amsterdam", "Bengaluru", "Chandigarh", "Chennai", "Chicago", 
  "Coimbatore", "Delhi", "Dubai", "Frankfurt", "Gadag", "Goa", "Guwahati", 
  "Hong Kong", "Hubballi", "Hyderabad", "Jaipur", "Kochi", "Kolkata", 
  "London", "Los Angeles", "Lucknow", "Mangaluru", "Mumbai", "Mysuru", 
  "New York", "Paris", "Pune", "San Francisco", "Seoul", "Singapore", 
  "Sydney", "Thiruvananthapuram", "Tokyo", "Toronto"
].sort();

// Custom Searchable Dropdown Component
const SearchableCityInput = ({ value, onChange, placeholder, buttonNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);

  // Sync internal search state if value changes externally
  useEffect(() => setSearch(value), [value]);

  const filtered = CITIES.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full">
      <div className="flex w-full mt-1 rounded-lg shadow-sm">
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className={`w-full p-3 bg-slate-900/50 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${buttonNode ? 'rounded-l-lg border-r-0' : 'rounded-lg'}`}
        />
        {buttonNode}
      </div>

      {/* Dropdown Menu */}
      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 overflow-y-auto border rounded-lg shadow-2xl bg-slate-800/95 backdrop-blur-xl border-slate-700 max-h-60">
          {filtered.map(city => (
            <li
              key={city}
              // Using onMouseDown instead of onClick prevents the input's onBlur from firing first and hiding the menu
              onMouseDown={() => {
                setSearch(city);
                onChange(city);
                setIsOpen(false);
              }}
              className="p-3 transition-colors cursor-pointer text-slate-300 hover:bg-indigo-600 hover:text-white border-b border-slate-700/50 last:border-0"
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  
  const [mode, setMode] = useState('simple'); 
  const [departureCity, setDepartureCity] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');

  const [formData, setFormData] = useState({
    flight_duration: 120, flight_phase: 'cruise', departure_elevation: 500, arrival_elevation: 500,
    total_onboard: 150, cargo_weight: 8000, airline: 'Indigo', aircraft_type: 'A320',
    aircraft_age: 8, last_maintenance_hours: 120, engine_hours_since_overhaul: 3000,
    pilot_experience: 6000, copilot_experience: 3500, crew_count: 6, season: 'summer',
    weather_condition: 'clear', visibility_km: 10, wind_speed_knots: 5, wind_direction: 90,
    temperature_c: 25, precipitation_mm: 0, turbulence_severity: 'none', route_complexity: 0.3,
    air_traffic_density: 0.4
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({ ...formData, [name]: type === 'number' ? Number(value) : value });
  };

  const autoFillWeather = async () => {
    if (!departureCity) {
      setError("Please select a Departure City to fetch weather.");
      return;
    }
    setWeatherLoading(true);
    setError(null);
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${departureCity}&units=metric&appid=${apiKey}`);
      const weatherData = response.data;

      let mlCondition = "clear";
      const owmMain = weatherData.weather[0].main.toLowerCase();
      if (owmMain.includes("rain") || owmMain.includes("drizzle")) mlCondition = "rain";
      if (owmMain.includes("thunderstorm") || owmMain.includes("extreme")) mlCondition = "storm";
      if (owmMain.includes("snow")) mlCondition = "snow";

      const month = new Date().getMonth();
      let currentSeason = "summer";
      if (month >= 2 && month <= 4) currentSeason = "spring";
      if (month >= 8 && month <= 10) currentSeason = "autumn";
      if (month === 11 || month <= 1) currentSeason = "winter";

      setFormData((prev) => ({
        ...prev,
        temperature_c: Math.round(weatherData.main.temp),
        visibility_km: weatherData.visibility / 1000,
        wind_speed_knots: Math.round(weatherData.wind.speed * 1.94384),
        wind_direction: weatherData.wind.deg,
        precipitation_mm: weatherData.rain ? weatherData.rain['1h'] : 0,
        weather_condition: mlCondition,
        season: currentSeason,
        turbulence_severity: weatherData.wind.speed > 10 ? 'moderate' : 'none'
      }));

      setError(`✅ Environmental data synced for ${weatherData.name}`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError("Failed to sync telemetry. Verify region or API status.");
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPredictionResult(null);
    try {
      const response = await api.post('/predict', formData);
      setPredictionResult(response.data.data.predictionResult);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "w-full p-3 mt-1 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all";
  const labelStyle = "block text-xs font-medium tracking-wider text-slate-400 uppercase";

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col items-start justify-between mb-10 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Flight Telemetry Analysis
            </h1>
            <p className="mt-2 text-slate-400">Predictive risk modeling powered by live environmental data.</p>
          </div>
          
          <div className="flex p-1 mt-6 border rounded-lg bg-slate-800/50 border-slate-700 backdrop-blur-md md:mt-0">
            <button onClick={() => setMode('simple')} className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'simple' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Autopilot</button>
            <button onClick={() => setMode('advanced')} className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'advanced' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Manual Override</button>
          </div>
        </div>

        {error && (
          <div className={`p-4 mb-8 rounded-lg backdrop-blur-md border ${error.includes('✅') ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}>
            <div className="flex items-center gap-3"><span className="text-lg">{error.includes('✅') ? '⚡' : '⚠️'}</span><p className="font-medium tracking-wide">{error}</p></div>
          </div>
        )}

        {predictionResult && (
          <div className={`p-8 mb-8 rounded-2xl backdrop-blur-xl border ${predictionResult.risk_prediction === 1 ? 'bg-red-900/10 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'bg-emerald-900/10 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]'}`}>
            <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Analysis Complete</h2>
            <div className="flex flex-col gap-8 mt-4 md:flex-row md:items-center">
              <div><span className="block text-sm text-slate-500">Predicted Risk Profile</span><span className={`text-4xl font-black tracking-tight ${predictionResult.risk_prediction === 1 ? 'text-red-400' : 'text-emerald-400'}`}>{predictionResult.risk_prediction === 1 ? 'CRITICAL RISK' : 'NOMINAL'}</span></div>
              <div className="hidden w-px h-12 md:block bg-slate-700"></div>
              <div><span className="block text-sm text-slate-500">Confidence / Probability</span><span className="text-4xl font-black tracking-tight text-white">{(predictionResult.risk_probability * 100).toFixed(1)}%</span></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 border shadow-2xl bg-slate-800/40 backdrop-blur-xl border-slate-700/50 rounded-2xl">
          
          {mode === 'simple' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                
                {/* REPLACED WITH SEARCHABLE DROPDOWN */}
                <div>
                  <label className={labelStyle}>Origin Node (City)</label>
                  <SearchableCityInput 
                    placeholder="Search city (e.g., Bengaluru)"
                    value={departureCity}
                    onChange={setDepartureCity}
                    buttonNode={
                      <button 
                        type="button" 
                        onClick={autoFillWeather}
                        disabled={weatherLoading}
                        className="px-6 font-semibold text-white transition-all bg-indigo-600 border border-indigo-500 rounded-r-lg hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.5)] whitespace-nowrap"
                      >
                        {weatherLoading ? 'Syncing...' : 'Sync Live Data'}
                      </button>
                    }
                  />
                </div>
                
                {/* REPLACED WITH SEARCHABLE DROPDOWN */}
                <div>
                  <label className={labelStyle}>Destination Node</label>
                  <SearchableCityInput 
                    placeholder="Search city (e.g., Dubai)"
                    value={arrivalCity}
                    onChange={setArrivalCity}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Carrier</label>
                  <select name="airline" value={formData.airline} onChange={handleChange} className={inputStyle}>
                    {["Delta", "United", "Emirates", "Lufthansa", "Indigo"].map(opt => <option key={opt} value={opt} className="bg-slate-800">{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Block Time (Mins)</label>
                  <input type="number" name="flight_duration" value={formData.flight_duration} onChange={handleChange} className={inputStyle} />
                </div>
              </div>
              
              <div className="p-4 text-sm border rounded-lg bg-indigo-900/20 border-indigo-500/30 text-indigo-200">
                <strong className="text-indigo-400">Autopilot Active:</strong> Environmental parameters are automatically synced with global weather nodes. Fleet averages applied for technical metrics.
              </div>
            </div>
          )}

          {mode === 'advanced' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-5 lg:pr-8 lg:border-r border-slate-700/50">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-700"><div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div><h3 className="font-semibold text-slate-200">Flight Route</h3></div>
                <div><label className={labelStyle}>Duration (mins)</label><input type="number" name="flight_duration" value={formData.flight_duration} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Phase</label><select name="flight_phase" value={formData.flight_phase} onChange={handleChange} className={inputStyle}>{["takeoff", "climb", "cruise", "descent", "landing"].map(opt => <option key={opt} value={opt} className="bg-slate-800">{opt}</option>)}</select></div>
                <div><label className={labelStyle}>Origin Elev (ft)</label><input type="number" name="departure_elevation" value={formData.departure_elevation} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Dest Elev (ft)</label><input type="number" name="arrival_elevation" value={formData.arrival_elevation} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Complexity Map</label><input type="number" step="0.1" name="route_complexity" value={formData.route_complexity} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Traffic Density</label><input type="number" step="0.1" name="air_traffic_density" value={formData.air_traffic_density} onChange={handleChange} className={inputStyle} /></div>
              </div>

              <div className="space-y-5 lg:pr-8 lg:border-r border-slate-700/50">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-700"><div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div><h3 className="font-semibold text-slate-200">Aircraft & Crew</h3></div>
                <div><label className={labelStyle}>Carrier</label><select name="airline" value={formData.airline} onChange={handleChange} className={inputStyle}>{["Delta", "United", "Emirates", "Lufthansa", "Indigo"].map(opt => <option key={opt} value={opt} className="bg-slate-800">{opt}</option>)}</select></div>
                <div><label className={labelStyle}>Airframe</label><select name="aircraft_type" value={formData.aircraft_type} onChange={handleChange} className={inputStyle}>{["A320", "B737", "B787", "A350"].map(opt => <option key={opt} value={opt} className="bg-slate-800">{opt}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-3"><div><label className={labelStyle}>Age (Yrs)</label><input type="number" name="aircraft_age" value={formData.aircraft_age} onChange={handleChange} className={inputStyle} /></div><div><label className={labelStyle}>Crew</label><input type="number" name="crew_count" value={formData.crew_count} onChange={handleChange} className={inputStyle} /></div></div>
                <div className="grid grid-cols-2 gap-3"><div><label className={labelStyle}>Souls</label><input type="number" name="total_onboard" value={formData.total_onboard} onChange={handleChange} className={inputStyle} /></div><div><label className={labelStyle}>Payload (kg)</label><input type="number" name="cargo_weight" value={formData.cargo_weight} onChange={handleChange} className={inputStyle} /></div></div>
                <div className="grid grid-cols-2 gap-3"><div><label className={labelStyle}>Pilot (hrs)</label><input type="number" name="pilot_experience" value={formData.pilot_experience} onChange={handleChange} className={inputStyle} /></div><div><label className={labelStyle}>Co-Pilot</label><input type="number" name="copilot_experience" value={formData.copilot_experience} onChange={handleChange} className={inputStyle} /></div></div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-700"><div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div><h3 className="font-semibold text-slate-200">Environment</h3></div>
                <div className="grid grid-cols-2 gap-3"><div><label className={labelStyle}>Season</label><select name="season" value={formData.season} onChange={handleChange} className={inputStyle}>{["spring", "summer", "autumn", "winter"].map(opt => <option key={opt} value={opt} className="bg-slate-800">{opt}</option>)}</select></div><div><label className={labelStyle}>Weather</label><select name="weather_condition" value={formData.weather_condition} onChange={handleChange} className={inputStyle}>{["clear", "rain", "storm", "snow"].map(opt => <option key={opt} value={opt} className="bg-slate-800">{opt}</option>)}</select></div></div>
                <div><label className={labelStyle}>Turbulence</label><select name="turbulence_severity" value={formData.turbulence_severity} onChange={handleChange} className={inputStyle}>{["none", "light", "moderate", "severe"].map(opt => <option key={opt} value={opt} className="bg-slate-800">{opt}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-3"><div><label className={labelStyle}>Temp (°C)</label><input type="number" name="temperature_c" value={formData.temperature_c} onChange={handleChange} className={inputStyle} /></div><div><label className={labelStyle}>Precip (mm)</label><input type="number" name="precipitation_mm" value={formData.precipitation_mm} onChange={handleChange} className={inputStyle} /></div></div>
                <div className="grid grid-cols-3 gap-3"><div><label className={labelStyle}>Wind (kts)</label><input type="number" name="wind_speed_knots" value={formData.wind_speed_knots} onChange={handleChange} className={inputStyle} /></div><div><label className={labelStyle}>Dir (°)</label><input type="number" name="wind_direction" value={formData.wind_direction} onChange={handleChange} className={inputStyle} /></div><div><label className={labelStyle}>Vis. (km)</label><input type="number" name="visibility_km" value={formData.visibility_km} onChange={handleChange} className={inputStyle} /></div></div>
              </div>
            </div>
          )}

          <div className="pt-8 mt-10 border-t border-slate-700/50">
            <button type="submit" disabled={loading} className={`w-full py-4 px-6 text-lg font-bold tracking-wide text-white transition-all rounded-xl shadow-lg border border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${loading ? 'bg-indigo-800/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]'}`}>
              {loading ? 'Processing Neural Network...' : 'Run Risk Analysis Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}