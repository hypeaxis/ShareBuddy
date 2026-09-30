/**
 * Token utilities for email verification and password reset
 */

const crypto = require('crypto');

// Generate random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Calculate token expiration time
const getTokenExpiration = (hours = 24) => {
  const now = new Date();
  now.setHours(now.getHours() + hours);
  return now;
};

// Hash token for storage (optional extra security)
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateToken,
  getTokenExpiration,
  hashToken
};
