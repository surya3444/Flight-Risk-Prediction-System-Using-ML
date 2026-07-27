const mongoose = require('mongoose');

const Incident = require('../models/Incident');
const notificationService = require('../services/notificationService');
const escalationEngine = require('../services/escalationEngine');

/** GET /api/incidents — the incident log, newest first. */
exports.listIncidents = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;

    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const [incidents, counts] = await Promise.all([
      Incident.find(filter)
        .sort({ lastTriggeredAt: -1 })
        .limit(limit)
        .populate('flight', 'flightNumber departureCity arrivalCity status'),
      Incident.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      count: incidents.length,
      data: incidents,
      counts: counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
    });
  } catch (error) {
    console.error('List incidents failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not load the incident log.' });
  }
};

/** GET /api/incidents/:id */
exports.getIncident = async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, user: req.user.id })
      .populate('flight', 'flightNumber departureCity arrivalCity status latestProbability')
      .populate('acknowledgedBy', 'username email');

    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    res.json({ success: true, data: incident });
  } catch (error) {
    console.error('Get incident failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not load this incident.' });
  }
};

/**
 * POST /api/incidents/:id/acknowledge — a human has seen it and is on it.
 *
 * Acknowledgement is what closes the loop on an alert. Until someone
 * acknowledges, the incident keeps sitting at the top of the OCC board.
 */
exports.acknowledgeIncident = async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, user: req.user.id });
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    if (incident.status === 'resolved') {
      return res.status(409).json({ success: false, error: 'Incident is already resolved.' });
    }

    incident.status = 'acknowledged';
    incident.acknowledgedAt = new Date();
    incident.acknowledgedBy = req.user.id;
    incident.updates.push({
      at: new Date(),
      riskProbability: incident.riskProbability,
      severity: incident.severity,
      flightPhase: incident.flightPhase,
      note: req.body.note ? `Acknowledged — ${req.body.note}` : 'Acknowledged by operator',
    });

    await incident.save();
    res.json({ success: true, data: incident });
  } catch (error) {
    console.error('Acknowledge incident failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not acknowledge this incident.' });
  }
};

/** POST /api/incidents/:id/resolve — closes it out with a written outcome. */
exports.resolveIncident = async (req, res) => {
  try {
    const { resolution } = req.body;
    if (!resolution || !resolution.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A resolution note is required — the log has to say what was actually done.',
      });
    }

    const incident = await Incident.findOne({ _id: req.params.id, user: req.user.id });
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.resolution = resolution.trim();
    incident.updates.push({
      at: new Date(),
      riskProbability: incident.riskProbability,
      severity: incident.severity,
      flightPhase: incident.flightPhase,
      note: `Resolved — ${resolution.trim()}`,
    });

    await incident.save();
    res.json({ success: true, data: incident });
  } catch (error) {
    console.error('Resolve incident failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not resolve this incident.' });
  }
};

/**
 * POST /api/incidents/:id/renotify — re-send the alert.
 *
 * For when the duty manager was mid-flight themselves, or a channel failed and
 * has since been fixed.
 */
exports.renotify = async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, user: req.user.id });
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    const settings = await escalationEngine.settingsFor(req.user.id);
    const notifications = await notificationService.dispatch(incident, settings);

    incident.notifications.push(...notifications);
    await incident.save();

    res.json({ success: true, data: { notifications } });
  } catch (error) {
    console.error('Re-notify failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not re-send this alert.' });
  }
};
