const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const controller = require('../controllers/reportController');

router.use(authMiddleware);

router.get('/incident/:incidentId', controller.getReport);
router.post('/incident/:incidentId/send', controller.sendReport);

router.get('/flight/:flightId', controller.getReport);
router.post('/flight/:flightId/send', controller.sendReport);

module.exports = router;
