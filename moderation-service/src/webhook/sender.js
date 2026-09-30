/**
 * Webhook sender - sends moderation results back to main backend
 */

const axios = require('axios');
const logger = require('../utils/logger');

const WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || 'http://localhost:5001/api/webhooks/moderation';
const WEBHOOK_SECRET = process.env.BACKEND_WEBHOOK_SECRET || '';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // ms

async function sendWebhook(payload, retryCount = 0) {
  try {
    logger.debug(`Sending webhook to ${WEBHOOK_URL}`, { payload });

    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET,
        'User-Agent': 'ShareBuddy-Moderation-Service/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.status === 200) {
      logger.info(`Webhook sent successfully for document ${payload.document_id}`);
      return response.data;
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

  } catch (error) {
    logger.error(`Webhook failed for document ${payload.document_id}:`, error.message);

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      logger.info(`Retrying webhook in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendWebhook(payload, retryCount + 1);
    }

    throw new Error(`Webhook failed after ${MAX_RETRIES} retries: ${error.message}`);
  }
}

module.exports = {
  sendWebhook
};
