/**
 * Feed Controller - Handles personalized feed endpoints for authenticated users
 * Provides:
 * - Documents from followed authors
 * - Trending documents (top downloads in 24h)
 * - Personalized recommendations based on user's download history
 * - Hot Q&A discussions (most replies in 24h)
 */

const { pool } = require('../config/database');

/**
 * Get documents from authors the user is following
 * GET /api/feed/following-authors
 */
exports.getFollowingAuthorsDocs = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Get documents from followed authors, ordered by newest first
    const query = `
      SELECT 
        d.document_id,
        d.title,
        d.description,
        d.thumbnail_url,
        d.download_count,
        d.average_rating as rating,
        d.created_at,
        u.full_name as author_name,
        u.user_id as author_id
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      JOIN follows f ON f.following_id = u.user_id
      WHERE f.follower_id = $1
        AND d.status = 'approved'
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    res.status(200).json({
      documents: result.rows,
      total: result.rowCount,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching following authors docs:', error);
    res.status(500).json({ 
      message: 'Không thể tải tài liệu từ tác giả bạn follow',
      error: error.message 
    });
  }
};

/**
 * Get trending documents (most downloaded in last 24 hours)
 * GET /api/feed/trending
 */
exports.getTrendingDocs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get documents with most downloads in the last 24 hours
    // Since we don't track download timestamps, use download_count as proxy
    const query = `
      SELECT 
        d.document_id,
        d.title,
        d.description,
        d.thumbnail_url,
        d.download_count,
        d.average_rating as rating,
        d.created_at,
        u.full_name as author_name,
        u.user_id as author_id
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      WHERE d.status = 'approved'
        AND d.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY d.download_count DESC, d.average_rating DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.status(200).json({
      documents: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching trending docs:', error);
    res.status(500).json({ 
      message: 'Không thể tải tài liệu trending',
      error: error.message 
    });
  }
};

/**
 * Get recommended documents based on user's download history
 * Matches by tags and subjects from previously downloaded documents
 * GET /api/feed/recommendations
 */
exports.getRecommendedDocs = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 20;

    // Simplified recommendation: get popular documents from same subjects as user's downloads
    const query = `
      WITH user_subjects AS (
        SELECT DISTINCT d.subject
        FROM documents d
        JOIN downloads dl ON d.document_id = dl.document_id
        WHERE dl.user_id = $1 AND d.subject IS NOT NULL
      )
      SELECT 
        d.document_id,
        d.title,
        d.description,
        d.thumbnail_url,
        d.download_count,
        d.average_rating as rating,
        d.created_at,
        u.full_name as author_name,
        u.user_id as author_id
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      WHERE d.status = 'approved'
        AND d.author_id != $1
        AND d.document_id NOT IN (
          SELECT document_id FROM downloads WHERE user_id = $1
        )
        AND (
          d.subject IN (SELECT subject FROM user_subjects)
          OR (SELECT COUNT(*) FROM user_subjects) = 0
        )
      ORDER BY d.average_rating DESC, d.download_count DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);

    res.status(200).json({
      documents: result.rows,
      total: result.rowCount,
      isFallback: result.rowCount === 0
    });
  } catch (error) {
    console.error('Error fetching recommended docs:', error);
    res.status(500).json({ 
      message: 'Không thể tải gợi ý tài liệu',
      error: error.message 
    });
  }
};

/**
 * Get hot Q&A discussions (most replies in last 24 hours)
 * GET /api/feed/hot-qa
 */
exports.getHotQA = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    // Get questions with most replies in the last 24 hours
    const query = `
      SELECT 
        q.question_id,
        q.title,
        q.content,
        q.created_at,
        u.full_name as author_name,
        u.user_id as author_id,
        COUNT(a.answer_id) as reply_count
      FROM questions q
      JOIN users u ON q.user_id = u.user_id
      LEFT JOIN answers a ON q.question_id = a.question_id
      WHERE q.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY q.question_id, q.title, q.content, q.created_at, u.full_name, u.user_id
      HAVING COUNT(a.answer_id) > 0
      ORDER BY reply_count DESC, q.created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.status(200).json({
      questions: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching hot Q&A:', error);
    res.status(500).json({ 
      message: 'Không thể tải thảo luận Q&A',
      error: error.message 
    });
  }
};
