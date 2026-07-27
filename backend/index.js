const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const predictRoutes = require('./routes/predictRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const monitorScheduler = require('./services/monitorScheduler');
const mlClient = require('./services/mlClient');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    scheduler: monitorScheduler.getStats(),
    mlService: await mlClient.health(),
  });
});

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// Last-resort handler so a thrown error returns JSON rather than an HTML stack
// trace to a frontend that only knows how to parse JSON.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 8000;

/**
 * The continuous monitor only starts once Mongo is up — starting it earlier
 * just produces a stream of connection errors on the first ticks.
 */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    monitorScheduler.start();
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.error('Continuous monitoring is NOT running.');
  });

const server = app.listen(PORT, () => console.log(`Node server running on port ${PORT}`));

// Stop the monitor cleanly so a redeploy does not leave a cycle half-written.
const shutdown = async (signal) => {
  console.log(`${signal} received — shutting down`);
  monitorScheduler.stop();
  server.close(() => mongoose.connection.close(false).then(() => process.exit(0)));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
