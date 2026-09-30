/**
 * Recommendation Routes
 * Routes for personalized recommendations and similar documents
 */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { protect } = require('../middleware/auth');

// Get personalized recommendations (authenticated users only)
router.get('/', protect, recommendationController.getRecommendations);

// Get similar documents (public)
router.get('/similar/:documentId', recommendationController.getSimilarDocuments);

// Get popular documents (public)
router.get('/popular', recommendationController.getPopularDocuments);

// Track interaction (authenticated users only)
router.post('/track', protect, recommendationController.trackInteraction);

module.exports = router;
