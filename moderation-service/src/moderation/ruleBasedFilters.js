/**
 * Rule-based content filters (fast, deterministic checks)
 */

const logger = require('../utils/logger');

// Common spam/inappropriate patterns
const SPAM_PATTERNS = [
  /\b(buy now|click here|limited offer|act now)\b/gi,
  /\b(viagra|cialis|pharmacy)\b/gi,
  /\b(casino|poker|gambling)\b/gi,
  /\$\$\$+/g,
  /!!!{3,}/g
];

const PROFANITY_LIST = [
  'fuck', 'fucking', 'shit', 'damn', 'bitch', 'ass', 'asshole', 
  'bastard', 'crap', 'piss', 'dick', 'cock', 'pussy', 'cunt',
  'whore', 'slut', 'fag', 'nigger', 'nigga', 'retard'
];

function applyRuleBasedChecks(text, metadata) {
  const flags = {};
  let score = 1.0; // Start with perfect score
  let shouldReject = false;

  // Combine text and title for comprehensive checking
  const contentToCheck = text || '';
  const titleToCheck = metadata.title || '';
  const combinedText = `${titleToCheck} ${contentToCheck}`.toLowerCase();

  if (!text || text.trim().length === 0) {
    // No text content, rely on metadata
    flags.no_text_content = true;
    score = 0.8; // Slightly lower score but not rejected
  }

  // Check 1: Spam patterns (check both title and content)
  let spamCount = 0;
  SPAM_PATTERNS.forEach(pattern => {
    const matches = combinedText.match(pattern);
    if (matches) {
      spamCount += matches.length;
    }
  });

  if (spamCount >= 1) {
    flags.spam_detected = true;
    score -= 0.3;
  }

  // Check 2: Excessive capitalization
  if (text && text.length > 50) {
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) {
      flags.excessive_caps = true;
      score -= 0.1;
    }
  }

  // Check 3: Profanity (check both title and content)
  const profanityCount = PROFANITY_LIST.filter(word => 
    combinedText.includes(word)
  ).length;

  if (profanityCount >= 1) {
    flags.profanity_detected = true;
    score -= 0.4; // Heavy penalty for profanity
  }
// Check 4: Repetitive content
  if (text && text.length > 20) {
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    if (repetitionRatio < 0.3 && words.length > 20) {
      flags.repetitive_content = true;
      score -= 0.15;
    }
  }

  // Check 5: Test/suspicious title patterns
  if (titleToCheck) {
    const titleLower = titleToCheck.toLowerCase();
    
    if (titleLower.includes('test') && titleLower.includes('ignore')) {
      flags.test_document = true;
      score -= 0.2;
    }
  }

  // Check 6: File size checks
  if (metadata.file_size) {
    const sizeInMB = metadata.file_size / (1024 * 1024);
    
    // Very small files might be spam/test
    if (sizeInMB < 0.01) {
      flags.suspiciously_small = true;
      score -= 0.1;
    }
  }

  // Determine if should reject immediately
  if (score <= 0.5) {
    shouldReject = true;
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    flags,
    shouldReject
  };
}

module.exports = {
  applyRuleBasedChecks
};
