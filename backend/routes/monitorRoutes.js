const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const controller = require('../controllers/monitorController');

router.use(authMiddleware);

// Fixed segments must be declared before `/:id` or "ops" and "policy" would be
// read as flight ids.
router.get('/ops/summary', controller.opsSummary);
router.get('/policy', controller.getPolicy);

router.post('/', controller.createMonitoredFlight);
router.get('/', controller.listMonitoredFlights);

router.get('/:id', controller.getMonitoredFlight);
router.patch('/:id', controller.updateMonitoredFlight);
router.delete('/:id', controller.deleteMonitoredFlight);
router.post('/:id/check', controller.checkNow);

module.exports = router;
