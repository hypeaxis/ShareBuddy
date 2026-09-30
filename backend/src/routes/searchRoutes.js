/**
 * Search Routes
 * Routes for full-text search functionality
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Search documents (public)
router.get('/documents', searchController.searchDocuments);

// Get search suggestions (public)
router.get('/suggestions', searchController.getSuggestions);

// Get popular searches (public)
router.get('/popular', searchController.getPopularSearches);

// Search users (public)
router.get('/users', searchController.searchUsers);

// Advanced search (public)
router.get('/advanced', searchController.advancedSearch);

module.exports = router;
