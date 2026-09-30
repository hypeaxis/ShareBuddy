/**
 * Queue statistics utility
 */

const { getQueue } = require('./redis');

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
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    throw new Error(`Failed to get queue stats: ${error.message}`);
  }
}

module.exports = {
  getQueueStats
};
