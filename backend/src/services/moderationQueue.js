/**
 * Redis Queue Service for Moderation Jobs
 * Handles job creation and queue management
 */

const Queue = require('bull');

let moderationQueue = null;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,
  lazyConnect: false,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

/**
 * Initialize the moderation queue
 */
function initQueue() {
  if (moderationQueue) {
    return moderationQueue;
  }

  try {
    moderationQueue = new Queue('moderation-jobs', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200 // Keep last 200 failed jobs
      }
    });

    // Queue event handlers
    moderationQueue.on('error', (error) => {
      console.error('Moderation queue error:', error);
    });

    moderationQueue.on('waiting', (jobId) => {
      console.log(`Job ${jobId} is waiting in queue`);
    });

    console.log('Moderation queue initialized successfully');
    return moderationQueue;

  } catch (error) {
    console.error('Failed to initialize moderation queue:', error);
    throw error;
  }
}

/**
 * Add a moderation job to the queue
 * @param {Object} jobData - Job data containing document_id, file_path, metadata
 * @returns {Promise<Object>} Job object
 */
async function addModerationJob(jobData) {
  try {
    const queue = getQueue();
    
    const job = await queue.add(jobData, {
      jobId: jobData.document_id, // Use document_id as job ID for idempotency
      priority: 1 // Normal priority
    });

    console.log(`Moderation job created for document ${jobData.document_id}`);
    return job;

  } catch (error) {
    console.error('Failed to add moderation job:', error);
    throw new Error(`Failed to queue moderation job: ${error.message}`);
  }
}

/**
 * Get the queue instance
 */
function getQueue() {
  if (!moderationQueue) {
    return initQueue();
  }
  return moderationQueue;
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  try {
    const queue = getQueue();
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return null;
  }
}

/**
 * Close the queue connection
 */
async function closeQueue() {
  if (moderationQueue) {
    await moderationQueue.close();
    moderationQueue = null;
    console.log('Moderation queue closed');
  }
}

module.exports = {
  initQueue,
  addModerationJob,
  getQueue,
  getQueueStats,
  closeQueue
};
