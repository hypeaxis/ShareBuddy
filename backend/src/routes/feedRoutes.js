/**
 * Feed Routes - Personalized feed endpoints for authenticated users
 * Base path: /api/feed
 */

const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/auth');

console.log('📦 Feed Controller loaded:', Object.keys(feedController));

/**
 * @route   GET /api/feed/following-authors
 * @desc    Get documents from authors the user follows
 * @access  Protected
 */
router.get('/following-authors', protect, feedController.getFollowingAuthorsDocs);

/**
 * @route   GET /api/feed/trending
 * @desc    Get trending documents (most downloaded recently)
 * @access  Public
 */
router.get('/trending', feedController.getTrendingDocs);

/**
 * @route   GET /api/feed/recommendations
 * @desc    Get personalized document recommendations based on user's download history
 * @access  Protected
 */
router.get('/recommendations', protect, feedController.getRecommendedDocs);

/**
 * @route   GET /api/feed/hot-qa
 * @desc    Get hot Q&A discussions (most replies recently)
 * @access  Public
 */
router.get('/hot-qa', feedController.getHotQA);

module.exports = router;
