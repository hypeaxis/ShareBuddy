/**
 * AI Models - TensorFlow.js toxicity detection
 */

const tf = require('@tensorflow/tfjs');
const toxicity = require('@tensorflow-models/toxicity');
const logger = require('../utils/logger');

let toxicityModel = null;
const TOXICITY_THRESHOLD = parseFloat(process.env.TOXICITY_MODEL_THRESHOLD) || 0.7;

async function loadToxicityModel() {
  if (toxicityModel) {
    return toxicityModel;
  }

  try {
    logger.info('Loading TensorFlow.js toxicity model...');
    toxicityModel = await toxicity.load(TOXICITY_THRESHOLD);
    logger.info('✓ Toxicity model loaded successfully');
    return toxicityModel;
  } catch (error) {
    logger.error('Failed to load toxicity model:', error);
    throw error;
  }
}

async function analyzeToxicity(text) {
  try {
    // Temporarily disabled due to TensorFlow compatibility issues with CPU
    // TODO: Fix TensorFlow.js compatibility or use alternative solution
    logger.warn('AI toxicity detection disabled - using rule-based analysis only');
    
    // Return neutral score (rules-based analysis will determine final score)
    return {
      score: 0.8, // Neutral - let rules decide
      flags: {},
      model_version: 'disabled'
    };

  } catch (error) {
    logger.error('Toxicity analysis error:', error);
    // Return neutral score on error
    return {
      score: 0.8,
      flags: {},
      model_version: 'error'
    };
  }
}

module.exports = {
  analyzeToxicity,
  loadToxicityModel
};
