/**
 * Verified Author Routes
 * Routes for automatic verified author badge system
 */

const express = require('express');
const router = express.Router();
const verifiedAuthorController = require('../controllers/verifiedAuthorController');
const { protect } = require('../middleware/auth');

// Get verification progress (authenticated users)
router.get('/progress', protect, verifiedAuthorController.getProgress);

// Request verification (auto-verify if eligible)
router.post('/verify', protect, verifiedAuthorController.requestVerification);

// Get verified authors list (public)
router.get('/authors', verifiedAuthorController.getVerifiedAuthors);

// Check verification status (public or self)
router.get('/status/:userId?', verifiedAuthorController.checkStatus);

module.exports = router;
