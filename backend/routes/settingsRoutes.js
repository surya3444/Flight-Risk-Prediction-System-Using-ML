const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const controller = require('../controllers/settingsController');

router.use(authMiddleware);

router.get('/alerts', controller.getAlertSettings);
router.put('/alerts', controller.updateAlertSettings);
router.post('/alerts/test', controller.testAlertRouting);
router.post('/alerts/verify-smtp', controller.verifySmtp);

module.exports = router;
