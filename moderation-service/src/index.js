/**
 * Moderation Service Entry Point
 * AI-powered document content moderation for ShareBuddy
 */

require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const { initRedis } = require('./queue/redis');
const { startJobProcessor } = require('./queue/processor');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'moderation-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const { getQueueStats } = require('./queue/stats');
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// Initialize service
async function startService() {
  try {
    logger.info('Starting Moderation Service...');
    
    // Initialize Redis connection
    await initRedis();
    logger.info('✓ Redis connected');
    
    // Start job processor
    await startJobProcessor();
    logger.info('✓ Job processor started');
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`✓ Moderation Service listening on port ${PORT}`);
      logger.info('='.repeat(50));
      logger.info('Service ready to process moderation jobs');
    });
    
  } catch (error) {
    logger.error('Failed to start service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the service
startService();
