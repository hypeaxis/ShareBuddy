/**
 * Redis connection and Bull queue setup
 */

const Queue = require('bull');
const logger = require('../utils/logger');

let moderationQueue = null;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

async function initRedis() {
  try {
    moderationQueue = new Queue('moderation-jobs', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: false,
        removeOnFail: false
      }
    });

    // Queue event handlers
    moderationQueue.on('error', (error) => {
      logger.error('Queue error:', error);
    });

    moderationQueue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} is waiting`);
    });

    moderationQueue.on('active', (job) => {
      logger.info(`Job ${job.id} started processing document ${job.data.document_id}`);
    });

    moderationQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed for document ${job.data.document_id}`);
    });

    moderationQueue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed:`, error.message);
    });

    // Test connection
    await moderationQueue.isReady();
    logger.info('Redis queue initialized successfully');

    return moderationQueue;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

function getQueue() {
  if (!moderationQueue) {
    throw new Error('Queue not initialized. Call initRedis() first.');
  }
  return moderationQueue;
}

module.exports = {
  initRedis,
  getQueue
};
