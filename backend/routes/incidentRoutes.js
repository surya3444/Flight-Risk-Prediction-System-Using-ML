const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const controller = require('../controllers/incidentController');

router.use(authMiddleware);

router.get('/', controller.listIncidents);
router.get('/:id', controller.getIncident);
router.post('/:id/acknowledge', controller.acknowledgeIncident);
router.post('/:id/resolve', controller.resolveIncident);
router.post('/:id/renotify', controller.renotify);

module.exports = router;
