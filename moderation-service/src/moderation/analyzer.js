/**
 * Document analyzer - extracts text and analyzes content
 */

const { extractText } = require('./textExtractor');
const { analyzeToxicity } = require('./aiModels');
const { applyRuleBasedChecks } = require('./ruleBasedFilters');
const logger = require('../utils/logger');

const MAX_CHARS = parseInt(process.env.TEXT_EXTRACTION_MAX_CHARS) || 1000;

async function analyzeDocument(filePath, metadata) {
  try {
    // Step 1: Extract text from document
    logger.debug(`Extracting text from: ${filePath}`);
    const fullText = await extractText(filePath, metadata.file_type);
    const extractedText = fullText.substring(0, MAX_CHARS);
    
    if (!extractedText || extractedText.trim().length < 10) {
      logger.warn('Insufficient text extracted, using metadata analysis only');
    }

    // Step 2: Apply rule-based filters (fast checks)
    const ruleChecks = applyRuleBasedChecks(extractedText, metadata);
    
    // If rule-based checks fail immediately, reject
    if (ruleChecks.shouldReject) {
      return {
        score: 0.0,
        flags: {
          ...ruleChecks.flags,
          rule_based_rejection: true
        },
        extractedText,
        modelVersion: 'rule-based-v1'
      };
    }

    // Step 3: AI toxicity analysis (slower but more accurate)
    let aiScore = 0.85; // Default neutral score
    let toxicityFlags = {};
    let aiEnabled = false;

    if (extractedText.trim().length >= 10) {
      try {
        const toxicityResult = await analyzeToxicity(extractedText);
        aiScore = toxicityResult.score;
        toxicityFlags = toxicityResult.flags;
        
        // Check if AI is actually enabled (not returning disabled/error status)
        aiEnabled = toxicityResult.model_version !== 'disabled' && 
                    toxicityResult.model_version !== 'error';
      } catch (aiError) {
        logger.error('AI analysis failed, using rule-based only:', aiError);
      }
    }

    // Step 4: Combine scores (weighted average)
    const ruleScore = ruleChecks.score;
    let finalScore;
    let modelVersion;
    
    if (aiEnabled) {
      // AI is working - use hybrid scoring
      finalScore = (aiScore * 0.7) + (ruleScore * 0.3);
      modelVersion = 'tensorflow-toxicity-v1+rules-v1';
    } else {
      // AI is disabled - use 100% rule-based scoring
      finalScore = ruleScore;
      modelVersion = 'rule-based-v1';
      logger.info('Using 100% rule-based scoring (AI disabled)');
    }

    return {
      score: Math.max(0, Math.min(1, finalScore)), // Clamp to [0, 1]
      flags: {
        ...ruleChecks.flags,
        ...toxicityFlags,
        ai_score: aiEnabled ? aiScore : null,
        rule_score: ruleScore,
        ai_enabled: aiEnabled
      },
      extractedText,
      modelVersion
    };

  } catch (error) {
    logger.error('Document analysis failed:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

module.exports = {
  analyzeDocument
};
