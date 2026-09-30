/**
 * Job processor - processes moderation jobs from the queue
 */

const { getQueue } = require('./redis');
const { analyzeDocument } = require('../moderation/analyzer');
const { sendWebhook } = require('../webhook/sender');
const logger = require('../utils/logger');

async function startJobProcessor() {
  const queue = getQueue();

  // Process jobs with concurrency of 2 (can handle 2 documents simultaneously)
  queue.process(2, async (job) => {
    const { document_id, file_path, metadata } = job.data;

    try {
      logger.info(`Processing document ${document_id}...`);
      
      // Update job progress
      await job.progress(10);

      // Step 1: Analyze document
      logger.info(`Analyzing document ${document_id}...`);
      const analysis = await analyzeDocument(file_path, metadata);
      await job.progress(70);

      // Step 2: Send results to backend via webhook
      logger.info(`Sending results for document ${document_id}...`);
      await sendWebhook({
        document_id,
        moderation_status: 'completed',
        moderation_score: analysis.score,
        moderation_flags: analysis.flags,
        extracted_text_preview: analysis.extractedText,
        model_version: analysis.modelVersion
      });
      await job.progress(100);

      logger.info(`✓ Document ${document_id} moderation completed (score: ${analysis.score.toFixed(3)})`);

      return {
        success: true,
        document_id,
        score: analysis.score,
        status: analysis.score > 0.5 ? 'approved' : 'rejected'
      };

    } catch (error) {
      logger.error(`Error processing document ${document_id}:`, error);
      
      // Send failure webhook
      try {
        await sendWebhook({
          document_id,
          moderation_status: 'failed',
          error_message: error.message
        });
      } catch (webhookError) {
        logger.error('Failed to send error webhook:', webhookError);
      }

      throw error; // Re-throw to mark job as failed
    }
  });

  logger.info('Job processor started and listening for jobs');
}

module.exports = {
  startJobProcessor
};
