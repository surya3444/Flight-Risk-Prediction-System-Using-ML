const axios = require('axios');

/**
 * Live weather, translated into the vocabulary the model was trained on.
 *
 * This runs server-side so the monitoring scheduler can refresh conditions
 * without a browser being open — that is the whole point of continuous
 * monitoring.
 */
const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Short cache so a monitoring cycle covering several flights out of the same
// hub makes one call, not one per flight. Weather does not change meaningfully
// inside two minutes.
const CACHE_TTL_MS = 2 * 60 * 1000;
const cache = new Map();

/** Maps an OpenWeather condition group onto the model's four-value vocabulary. */
function toModelCondition(owmMain) {
  const main = String(owmMain || '').toLowerCase();
  if (main.includes('thunderstorm') || main.includes('squall') || main.includes('tornado')) return 'storm';
  if (main.includes('snow') || main.includes('sleet')) return 'snow';
  if (main.includes('rain') || main.includes('drizzle')) return 'rain';
  return 'clear';
}

/**
 * Turbulence is not reported by OpenWeather, so it is inferred from surface
 * wind and convective activity. Documented as an estimate everywhere it is
 * shown, because it is one.
 */
function estimateTurbulence(windKnots, gustKnots, condition) {
  const peak = Math.max(windKnots, gustKnots || 0);
  if (peak > 45 || condition === 'storm') return 'severe';
  if (peak > 28) return 'moderate';
  if (peak > 14) return 'light';
  return 'none';
}

function seasonFor(date = new Date()) {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function msToKnots(metresPerSecond) {
  return Math.round((metresPerSecond || 0) * 1.94384);
}

/**
 * Fetches current conditions for a city and returns both the model fields and
 * the human-readable observation.
 */
async function fetchForCity(city) {
  if (!API_KEY) {
    throw new Error('OPENWEATHER_API_KEY is not configured on the server');
  }

  const key = city.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.value, cached: true };
  }

  let response;
  try {
    response = await axios.get(BASE_URL, {
      params: { q: city, units: 'metric', appid: API_KEY },
      timeout: 10000,
    });
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`No weather station matched "${city}"`);
    }
    throw new Error(`Weather lookup failed for "${city}": ${error.message}`);
  }

  const data = response.data;
  const condition = toModelCondition(data.weather?.[0]?.main);
  const windKnots = msToKnots(data.wind?.speed);
  const gustKnots = msToKnots(data.wind?.gust);

  // OpenWeather caps reported visibility at 10 km; treat the cap as 10 rather
  // than pretending to know it is clearer than that.
  const visibilityKm = data.visibility != null ? Math.min(data.visibility / 1000, 10) : 10;

  const precipitation = data.rain?.['1h'] ?? data.rain?.['3h'] ?? data.snow?.['1h'] ?? data.snow?.['3h'] ?? 0;

  const value = {
    station: data.name,
    observedAt: new Date((data.dt || Date.now() / 1000) * 1000),
    description: data.weather?.[0]?.description || condition,
    fields: {
      weather_condition: condition,
      visibility_km: Number(visibilityKm.toFixed(1)),
      wind_speed_knots: windKnots,
      wind_direction: Math.round(data.wind?.deg ?? 0),
      temperature_c: Math.round(data.main?.temp ?? 15),
      precipitation_mm: Number(Number(precipitation).toFixed(2)),
      turbulence_severity: estimateTurbulence(windKnots, gustKnots, condition),
      season: seasonFor(),
    },
    gustKnots,
    humidity: data.main?.humidity ?? null,
    pressure: data.main?.pressure ?? null,
  };

  cache.set(key, { at: Date.now(), value });
  return value;
}

module.exports = {
  fetchForCity,
  toModelCondition,
  estimateTurbulence,
  seasonFor,
  msToKnots,
};
