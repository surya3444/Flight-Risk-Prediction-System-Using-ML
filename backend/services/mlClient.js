const axios = require('axios');

/**
 * The only place that knows how to talk to the Flask risk model.
 *
 * `FLIGHT_ML_API_URL` historically pointed straight at the `/predict` endpoint,
 * so we derive the service root from it rather than requiring the deployment to
 * be reconfigured.
 */
const RAW_URL = process.env.FLIGHT_ML_API_URL || 'http://localhost:5000/predict';
const API_KEY = process.env.FLIGHT_ML_API_KEY;
const TIMEOUT_MS = Number(process.env.FLIGHT_ML_TIMEOUT_MS || 15000);

const BASE_URL = RAW_URL.replace(/\/predict(\/batch)?\/?$/, '') || RAW_URL;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
});

function describeError(error) {
  if (error.response) {
    const body = error.response.data;
    return `ML service returned ${error.response.status}: ${body?.error || JSON.stringify(body)}`;
  }
  if (error.code === 'ECONNABORTED') {
    return `ML service timed out after ${TIMEOUT_MS}ms`;
  }
  return `ML service unreachable: ${error.message}`;
}

async function predict(flightData, { explain = true } = {}) {
  try {
    const { data } = await client.post(`/predict?explain=${explain}`, flightData);
    return data;
  } catch (error) {
    throw new Error(describeError(error));
  }
}

/**
 * Scores many flights in one round trip.
 *
 * @param {Array<{reference: string, data: object}>} flights
 * @returns {Promise<Map<string, object>>} reference → result (ok or error)
 */
async function predictBatch(flights, { explain = true } = {}) {
  if (!flights.length) return new Map();

  try {
    const { data } = await client.post('/predict/batch', { flights, explain });
    return new Map((data.results || []).map((r) => [String(r.reference), r]));
  } catch (error) {
    throw new Error(describeError(error));
  }
}

async function health() {
  try {
    const { data } = await client.get('/health', { timeout: 5000 });
    return { reachable: true, ...data };
  } catch (error) {
    return { reachable: false, error: describeError(error) };
  }
}

module.exports = { predict, predictBatch, health, BASE_URL };
