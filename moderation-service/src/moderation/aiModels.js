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
    
    /* ORIGINAL CODE - Disabled due to forwardFunc_1 error
    const model = await loadToxicityModel();
    
    // Truncate text if too long (model has limits)
    const maxLength = 512;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

    // Get predictions
    const predictions = await model.classify([truncatedText]);

    // Parse results
    const flags = {};
    let totalToxicity = 0;
    let toxicCategories = 0;

    predictions.forEach(prediction => {
      const label = prediction.label.toLowerCase().replace(' ', '_');
      const match = prediction.results[0].match;
      const probabilities = prediction.results[0].probabilities;
      
      flags[label] = match;
      
      if (match) {
        toxicCategories++;
        totalToxicity += probabilities[1]; // Probability of toxic class
      }
    });

    // Calculate score (0-1, higher is better/safer)
    // If no toxic categories, score is high (0.9+)
    // If toxic categories found, score decreases based on count and confidence
    let score = 1.0;
    if (toxicCategories > 0) {
      const avgToxicity = totalToxicity / toxicCategories;
      score = 1.0 - (avgToxicity * 0.8); // Scale down max penalty to 0.8
    }

    };
    */

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
    return {
      score: 0.7,
      flags: { error: true, message: error.message }
    };
  }
}

module.exports = {
  analyzeToxicity,
  loadToxicityModel
};
