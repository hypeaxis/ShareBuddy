/**
 * Rating controller
 * Handles document ratings (numerical scores only)
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');

// Create or update rating for a document
// FIXED: Upsert logic to prevent duplicates
const rateDocument = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ', details: errors.array() });
    }

    const { id: documentId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.user_id;

    // Check if document exists
    const docResult = await query(
      'SELECT author_id, title FROM documents WHERE document_id = $1 AND status = $2',
      [documentId, 'approved']
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tài liệu không tồn tại' });
    }

    // Prevent self-rating
    if (docResult.rows[0].author_id === userId) {
      return res.status(403).json({ success: false, error: 'Không thể đánh giá tài liệu của chính mình' });
    }

    let ratingData;

    await withTransaction(async (client) => {
      // 1. Handle Rating (Check Existence First)
      const existingRating = await client.query(
        'SELECT rating_id FROM ratings WHERE user_id = $1 AND document_id = $2',
        [userId, documentId]
      );

      if (existingRating.rows.length > 0) {
        // UPDATE existing
        const updateResult = await client.query(
          `UPDATE ratings SET rating = $1, updated_at = NOW()
           WHERE user_id = $2 AND document_id = $3
           RETURNING rating_id, rating, created_at, updated_at`,
          [rating, userId, documentId]
        );
        ratingData = updateResult.rows[0];
      } else {
        // INSERT new
        const insertResult = await client.query(
          `INSERT INTO ratings (user_id, document_id, rating)
           VALUES ($1, $2, $3)
           RETURNING rating_id, rating, created_at, updated_at`,
          [userId, documentId, rating]
        );
        ratingData = insertResult.rows[0];
      }

      // 2. Handle Review Comment (Stored in comments table)
      // We assume a review is a root-level comment linked to this user/doc
      if (comment !== undefined) {
        const existingComment = await client.query(
          'SELECT comment_id FROM comments WHERE user_id = $1 AND document_id = $2 AND parent_comment_id IS NULL',
          [userId, documentId]
        );

        if (comment.trim().length > 0) {
          if (existingComment.rows.length > 0) {
            // Update
            await client.query(
              'UPDATE comments SET content = $1, updated_at = NOW() WHERE comment_id = $2',
              [comment, existingComment.rows[0].comment_id]
            );
          } else {
            // Insert
            await client.query(
              'INSERT INTO comments (user_id, document_id, content) VALUES ($1, $2, $3)',
              [userId, documentId, comment]
            );
          }
        } else if (existingComment.rows.length > 0) {
          await client.query('DELETE FROM comments WHERE comment_id = $1', [existingComment.rows[0].comment_id]);
        }
      }
    });

    // Check and auto-verify document author if eligible (async, non-blocking)
    const authorId = docResult.rows[0].author_id;
    setImmediate(async () => {
      try {
        const verifiedAuthorService = require('../services/verifiedAuthorService');
        await verifiedAuthorService.checkAndAutoVerify(authorId);
      } catch (err) {
        console.error('⚠️ Auto-verification check failed:', err.message);
      }
    });

    res.json({
      success: true,
      message: 'Đánh giá thành công',
      data: {
        rating: {
          id: ratingData.rating_id,
          rating: ratingData.rating,
          createdAt: ratingData.created_at,
          updatedAt: ratingData.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get ratings for a document
const getDocumentRatings = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Use DISTINCT ON (r.rating_id) to prevent duplicates if JOIN causes multiple rows
    // Added 'c.content' to fetch the actual review text
    const ratingsResult = await query(
      `SELECT DISTINCT ON (r.created_at, r.rating_id) 
              r.rating_id, r.rating, r.created_at, r.updated_at,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              c.content as comment_text
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN comments c ON c.document_id = r.document_id 
                            AND c.user_id = r.user_id 
                            AND c.parent_comment_id IS NULL
       WHERE r.document_id = $1 AND u.is_active = true
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [documentId, limit, offset]
    );

    const statsResult = await query(
      `SELECT COUNT(*) as total_ratings,
              COALESCE(AVG(rating), 0) as avg_rating,
              COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
              COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
              COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
              COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
              COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.document_id = $1 AND u.is_active = true`,
      [documentId]
    );

    const stats = statsResult.rows[0];
    const total = parseInt(stats.total_ratings);

    res.json({
      success: true,
      data: {
        ratings: ratingsResult.rows.map(row => ({
          id: row.rating_id,
          rating: row.rating,
          comment: row.comment_text || '', // Ensure comment text is returned
          createdAt: row.created_at,
          user: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          }
        })),
        statistics: {
          totalRatings: total,
          avgRating: parseFloat(stats.avg_rating).toFixed(1),
          distribution: {
            "5": parseInt(stats.five_star),
            "4": parseInt(stats.four_star),
            "3": parseInt(stats.three_star),
            "2": parseInt(stats.two_star),
            "1": parseInt(stats.one_star)
          }
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUserRating = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const userId = req.user.user_id;

    const result = await query(
      `SELECT 
      r.rating_id as id, 
      r.rating, 
      r.created_at, 
      r.updated_at,
      c.content as comment_text
      FROM ratings r
      LEFT JOIN comments c ON c.document_id = r.document_id 
                            AND c.user_id = r.user_id 
                            AND c.parent_comment_id IS NULL
       WHERE r.user_id = $1 AND r.document_id = $2`,
      [userId, documentId]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        data: { rating: null }
      });
    }

    const rating = result.rows[0];
    res.json({
      success: true,
      data: {
        rating: {
          id: rating.rating_id,
          rating: rating.rating,
          comment: rating.comment_text || '',
          createdAt: rating.created_at,
          updatedAt: rating.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteRating = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;
        await withTransaction(async (client) => {
            await client.query('DELETE FROM ratings WHERE user_id=$1 AND document_id=$2', [userId, id]);
        });
        res.json({success: true, message: 'Deleted'});
    } catch(e) { next(e); }
}

// Toggle like on a rating
const toggleRatingLike = async (req, res, next) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.user_id;

    // Check if rating exists
    const ratingCheck = await query('SELECT 1 FROM ratings WHERE rating_id = $1', [ratingId]);
    if (ratingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Rating not found' });
    }

    const existingLike = await query(
      'SELECT 1 FROM rating_likes WHERE user_id = $1 AND rating_id = $2',
      [userId, ratingId]
    );

    let isLiked = false;
    if (existingLike.rows.length > 0) {
      await query('DELETE FROM rating_likes WHERE user_id = $1 AND rating_id = $2', [userId, ratingId]);
    } else {
      await query('INSERT INTO rating_likes (user_id, rating_id) VALUES ($1, $2)', [userId, ratingId]);
      isLiked = true;
    }

    const countResult = await query(
      'SELECT COUNT(*) as count FROM rating_likes WHERE rating_id = $1',
      [ratingId]
    );

    res.json({
      success: true,
      data: {
        isLiked,
        likeCount: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Report rating
const reportRating = async (req, res, next) => {
  try {
    const { ratingId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.user_id;

    const existing = await query(
      'SELECT 1 FROM reports WHERE reporter_id = $1 AND rating_id = $2',
      [userId, ratingId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Đã báo cáo' });
    }

    await query(
      `INSERT INTO reports (reporter_id, rating_id, reason, description, report_type)
       VALUES ($1, $2, $3, $4, 'rating')`,
      [userId, ratingId, reason, description]
    );

    res.json({ success: true, message: 'Báo cáo thành công' });
  } catch (error) {
    next(error);
  }
};

// Get Top Rated Documents (Fixed: Uses 'subject' instead of 'category')
const getTopRatedDocuments = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const minRatings = parseInt(req.query.minRatings) || 5;
    // Support 'subject' param, fallback to 'category' if frontend sends it
    const subject = req.query.subject || req.query.category;

    let whereClause = "d.status = 'approved'";
    let queryParams = [minRatings, limit];
    
    if (subject) {
      whereClause += " AND d.subject = $3";
      queryParams = [minRatings, limit, subject]; // Order matters for param replacement
      // Fix param order: Limit is usually last in SQL syntax if using LIMIT $N
      // Let's rewrite strictly:
      
      // Re-map params correctly for the query below
      queryParams = [minRatings, subject, limit];
    }

    const queryStr = `
      SELECT d.document_id, d.title, d.description, d.thumbnail_url,
             d.subject, d.credit_cost, d.download_count,
             u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
             AVG(r.rating) as avg_rating,
             COUNT(r.rating_id) as rating_count
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      JOIN ratings r ON d.document_id = r.document_id
      WHERE ${whereClause}
      GROUP BY d.document_id, u.user_id
      HAVING COUNT(r.rating_id) >= $1
      ORDER BY avg_rating DESC, rating_count DESC
      LIMIT $${queryParams.length}
    `;

    const result = await query(queryStr, queryParams);

    res.json({
      success: true,
      data: {
        documents: result.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          description: row.description,
          thumbnailUrl: row.thumbnail_url,
          subject: row.subject,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          avgRating: parseFloat(row.avg_rating).toFixed(1),
          ratingCount: parseInt(row.rating_count),
          author: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          }
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  rateDocument,
  getDocumentRatings,
  deleteRating,
  getUserRating,
  toggleRatingLike,
  reportRating,
  getTopRatedDocuments
};