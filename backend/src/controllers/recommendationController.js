/**
 * Recommendation Controller
 * Handles recommendation endpoints for personalized and content-based suggestions
 */

const recommendationService = require('../services/recommendationService');

// Get personalized recommendations for user
const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 10;

    const recommendations = await recommendationService.getCollaborativeRecommendations(
      userId,
      limit
    );

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get similar documents
const getSimilarDocuments = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    const similar = await recommendationService.getContentBasedRecommendations(
      documentId,
      limit
    );

    res.json({
      success: true,
      data: {
        similar,
        count: similar.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get popular documents
const getPopularDocuments = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const popular = await recommendationService.getPopularDocuments(limit);

    res.json({
      success: true,
      data: {
        documents: popular,
        count: popular.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Track user interaction (called automatically)
const trackInteraction = async (req, res, next) => {
  try {
    const { documentId, interactionType, interactionValue } = req.body;
    const userId = req.user.user_id;

    await recommendationService.trackInteraction(
      userId,
      documentId,
      interactionType,
      interactionValue
    );

    res.json({
      success: true,
      message: 'Interaction tracked'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getSimilarDocuments,
  getPopularDocuments,
  trackInteraction
};
