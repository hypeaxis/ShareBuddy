/**
 * Webhook Routes
 * Handles incoming webhooks from external services
 */

const express = require('express');
const { receiveModerationResult } = require('../controllers/webhookController');

const router = express.Router();

// Moderation service webhook
router.post('/moderation', receiveModerationResult);

module.exports = router;
