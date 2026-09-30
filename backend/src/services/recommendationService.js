/**
 * Recommendation Service - Collaborative Filtering
 * Recommends documents based on user behavior and similar users
 */

const { query } = require('../config/database');

// Track user interaction with document
const trackInteraction = async (userId, documentId, interactionType, interactionValue = null) => {
  try {
    await query(
      `INSERT INTO user_document_interactions (user_id, document_id, interaction_type, interaction_value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, document_id, interaction_type, created_at) DO NOTHING`,
      [userId, documentId, interactionType, interactionValue]
    );
  } catch (error) {
    console.error('Error tracking interaction:', error);
  }
};

// Find similar users based on interaction patterns
const findSimilarUsers = async (userId, limit = 10) => {
  try {
    const result = await query(
      `SELECT 
        CASE 
          WHEN user_id_1 = $1 THEN user_id_2
          ELSE user_id_1
        END as similar_user_id,
        similarity_score,
        common_interactions
       FROM user_similarity
       WHERE user_id_1 = $1 OR user_id_2 = $1
       ORDER BY similarity_score DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error finding similar users:', error);
    return [];
  }
};

// Get recommendations based on similar users
const getCollaborativeRecommendations = async (userId, limit = 10) => {
  try {
    // Get similar users
    const similarUsers = await findSimilarUsers(userId, 20);
    
    if (similarUsers.length === 0) {
      // Fallback to popular documents
      return getPopularDocuments(limit);
    }

    const similarUserIds = similarUsers.map(u => u.similar_user_id);

    // Get documents liked by similar users but not by current user
    const result = await query(
      `SELECT DISTINCT
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.average_rating,
        d.download_count,
        d.view_count,
        d.thumbnail_url,
        d.created_at,
        u.user_id,
        u.username,
        u.full_name as author_name,
        u.avatar_url,
        u.is_verified_author,
        COUNT(DISTINCT i.user_id) as liked_by_similar_users,
        AVG(i.interaction_value) FILTER (WHERE i.interaction_type = 'rate') as avg_rating_by_similar
       FROM documents d
       JOIN users u ON d.author_id = u.user_id
       JOIN user_document_interactions i ON d.document_id = i.document_id
       WHERE i.user_id = ANY($1)
         AND d.document_id NOT IN (
           SELECT document_id FROM user_document_interactions 
           WHERE user_id = $2 AND interaction_type IN ('download', 'view', 'bookmark')
         )
         AND d.status = 'approved'
       GROUP BY d.document_id, d.title, d.description, d.university, d.subject, 
                d.average_rating, d.download_count, d.view_count, d.thumbnail_url, 
                d.created_at, u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author
       ORDER BY liked_by_similar_users DESC, avg_rating_by_similar DESC NULLS LAST
       LIMIT $3`,
      [similarUserIds, userId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting collaborative recommendations:', error);
    return [];
  }
};

// Content-based recommendations (similar documents)
const getContentBasedRecommendations = async (documentId, limit = 5) => {
  try {
    const result = await query(
      `WITH current_doc AS (
        SELECT university, subject, author_id
        FROM documents
        WHERE document_id = $1
      )
      SELECT DISTINCT
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.average_rating,
        d.download_count,
        d.thumbnail_url,
        u.user_id,
        u.username,
        u.full_name as author_name,
        u.is_verified_author,
        CASE
          WHEN d.university = cd.university AND d.subject = cd.subject THEN 3
          WHEN d.university = cd.university THEN 2
          WHEN d.subject = cd.subject THEN 2
          WHEN d.author_id = cd.author_id THEN 1
          ELSE 0
        END as similarity_score
       FROM documents d
       JOIN users u ON d.author_id = u.user_id
       CROSS JOIN current_doc cd
       WHERE d.document_id != $1
         AND d.status = 'approved'
       ORDER BY similarity_score DESC, d.average_rating DESC, d.download_count DESC
       LIMIT $2`,
      [documentId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting content-based recommendations:', error);
    return [];
  }
};

// Get popular documents (fallback)
const getPopularDocuments = async (limit = 10) => {
  try {
    const result = await query(
      `SELECT 
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.average_rating,
        d.download_count,
        d.view_count,
        d.thumbnail_url,
        u.user_id,
        u.username,
        u.full_name as author_name,
        u.avatar_url,
        u.is_verified_author
       FROM documents d
       JOIN users u ON d.author_id = u.user_id
       WHERE d.status = 'approved'
       ORDER BY 
         (d.download_count * 2 + d.view_count + d.average_rating * 10) DESC,
         d.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting popular documents:', error);
    return [];
  }
};

// Refresh user similarity materialized view (run periodically)
const refreshUserSimilarity = async () => {
  try {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY user_similarity');
    console.log('User similarity view refreshed successfully');
  } catch (error) {
    console.error('Error refreshing user similarity:', error);
  }
};

module.exports = {
  trackInteraction,
  findSimilarUsers,
  getCollaborativeRecommendations,
  getContentBasedRecommendations,
  getPopularDocuments,
  refreshUserSimilarity
};
