/**
 * Search Controller
 * Handles search-related endpoints
 */

const searchService = require('../services/searchService');

// Search documents
const searchDocuments = async (req, res, next) => {
  try {
    const { q, page, limit, ...filters } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const result = await searchService.searchDocuments(
      q,
      filters,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Get search suggestions
const getSuggestions = async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const suggestions = await searchService.getSearchSuggestions(
      q,
      parseInt(limit) || 10
    );

    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    next(error);
  }
};

// Get popular searches
const getPopularSearches = async (req, res, next) => {
  try {
    const { limit } = req.query;

    const popular = await searchService.getPopularSearches(
      parseInt(limit) || 10
    );

    res.json({
      success: true,
      data: { popular }
    });
  } catch (error) {
    next(error);
  }
};

// Search users
const searchUsers = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const result = await searchService.searchUsers(
      q,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Advanced search
const advancedSearch = async (req, res, next) => {
  try {
    const { page, limit, ...criteria } = req.query;

    const result = await searchService.advancedSearch(
      criteria,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchDocuments,
  getSuggestions,
  getPopularSearches,
  searchUsers,
  advancedSearch
};
