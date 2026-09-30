/**
 * Comment controller
 * Handles document comments and comment threads functionality
 * FIXED: Column name parent_id -> parent_comment_id
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const notificationService = require('../services/notificationService');

// Create a new comment on a document
const createComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ', details: errors.array() });
    }

    const { id: documentId } = req.params;
    const { content, parentId = null } = req.body; // Frontend sends 'parentId', we map to DB column
    const userId = req.user.user_id;

    const docResult = await query(
      'SELECT document_id FROM documents WHERE document_id = $1 AND status = $2',
      [documentId, 'approved']
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tài liệu không tồn tại' });
    }

    // Check parent comment if exists
    if (parentId) {
      const parentResult = await query(
        'SELECT comment_id, parent_comment_id FROM comments WHERE comment_id = $1 AND document_id = $2',
        [parentId, documentId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Comment cha không tồn tại' });
      }

      // Prevent nested replies (only 1 level allowed: root -> reply)
      if (parentResult.rows[0].parent_comment_id !== null) {
        return res.status(400).json({ success: false, error: 'Không thể reply cho một reply' });
      }
    }

    // FIXED: parent_comment_id
    const result = await query(
      `INSERT INTO comments (user_id, document_id, parent_comment_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING comment_id, content, parent_comment_id, created_at, updated_at`,
      [userId, documentId, parentId, content]
    );

    const comment = result.rows[0];

    const userResult = await query(
      'SELECT username, full_name, avatar_url, is_verified_author FROM users WHERE user_id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // Send notification to document author about new comment
    try {
      const docOwnerResult = await query(
        'SELECT author_id, title FROM documents WHERE document_id = $1',
        [documentId]
      );
      
      if (docOwnerResult.rows.length > 0) {
        const { author_id, title } = docOwnerResult.rows[0];
        // Only notify if comment is not from the document author
        if (author_id !== userId) {
          await notificationService.createNotification(
            author_id,
            notificationService.NOTIFICATION_TYPES.NEW_COMMENT,
            'Bình luận mới',
            `${user.full_name} đã bình luận trên tài liệu "${title}"`,
            documentId,
            userId
          );
          console.log(`✓ Comment notification sent to document author ${author_id}`);
        }
      }
    } catch (notifError) {
      console.error(`⚠️ Failed to create comment notification:`, notifError.message);
    }

    res.status(201).json({
      success: true,
      data: {
        comment: {
          id: comment.comment_id,
          content: comment.content,
          parentId: comment.parent_comment_id,
          createdAt: comment.created_at,
          likeCount: 0,
          replyCount: 0,
          isLiked: false,
          user: {
            id: userId,
            username: user.username,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
            isVerifiedAuthor: user.is_verified_author
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get comments for a document
// Get comments for a document
const getDocumentComments = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get sort params
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Determine ORDER BY clause
    let orderByClause = `c.created_at ${sortOrder}`; // Default (Newest/Oldest)
    
    if (sortBy === 'popular') {
      // Sort by like_count descending, then by date
      orderByClause = `like_count DESC, c.created_at DESC`;
    }

    const commentsQuery = `
      SELECT c.comment_id, c.content, c.created_at, c.updated_at,
             u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
             COUNT(DISTINCT cl.like_id) as like_count,
             COUNT(DISTINCT cr.comment_id) as reply_count,
             CASE WHEN ucl.like_id IS NOT NULL THEN true ELSE false END as is_liked
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN comment_likes cl ON c.comment_id = cl.comment_id
      LEFT JOIN comments cr ON c.comment_id = cr.parent_comment_id
      LEFT JOIN comment_likes ucl ON c.comment_id = ucl.comment_id AND ucl.user_id = $1
      WHERE c.document_id = $2 AND c.parent_comment_id IS NULL
      GROUP BY c.comment_id, u.user_id, ucl.like_id
      ORDER BY ${orderByClause}
      LIMIT $3 OFFSET $4
    `;

    const commentsResult = await query(commentsQuery, [req.user?.user_id || null, documentId, limit, offset]);

    // ... (rest of the function remains the same: countResult, res.json) ...
    const countResult = await query(
      'SELECT COUNT(*) as total FROM comments WHERE document_id = $1 AND parent_comment_id IS NULL',
      [documentId]
    );
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        comments: commentsResult.rows.map(row => ({
          id: row.comment_id,
          content: row.content,
          createdAt: row.created_at,
          likeCount: parseInt(row.like_count),
          replyCount: parseInt(row.reply_count),
          isLiked: row.is_liked,
          user: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          },
          replies: []
        })),
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

// Get replies for a comment
const getCommentReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // FIXED: parent_comment_id
    const repliesQuery = `
      SELECT c.comment_id, c.content, c.created_at,
             u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
             COUNT(DISTINCT cl.like_id) as like_count,
             CASE WHEN ucl.like_id IS NOT NULL THEN true ELSE false END as is_liked
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN comment_likes cl ON c.comment_id = cl.comment_id
      LEFT JOIN comment_likes ucl ON c.comment_id = ucl.comment_id AND ucl.user_id = $1
      WHERE c.parent_comment_id = $2
      GROUP BY c.comment_id, u.user_id, ucl.like_id
      ORDER BY c.created_at ASC
      LIMIT $3 OFFSET $4
    `;

    const repliesResult = await query(repliesQuery, [req.user?.user_id || null, commentId, limit, offset]);

    res.json({
      success: true,
      data: {
        replies: repliesResult.rows.map(reply => ({
          id: reply.comment_id,
          content: reply.content,
          createdAt: reply.created_at,
          likeCount: parseInt(reply.like_count),
          isLiked: reply.is_liked,
          user: {
            id: reply.user_id,
            username: reply.username,
            fullName: reply.full_name,
            avatarUrl: reply.avatar_url,
            isVerifiedAuthor: reply.is_verified_author
          }
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.user_id;

    const result = await query(
      `UPDATE comments SET content = $1, updated_at = NOW()
       WHERE comment_id = $2 AND user_id = $3
       RETURNING comment_id, content, updated_at`,
      [content, commentId, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Not found or unauthorized' });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.user_id;

    // Check ownership
    const check = await query('SELECT user_id FROM comments WHERE comment_id = $1', [commentId]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    
    if (check.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Delete (Cascade deletes likes, manually delete replies if cascade not set in DB)
    // FIXED: parent_comment_id
    await withTransaction(async (client) => {
      // Delete likes
      await client.query('DELETE FROM comment_likes WHERE comment_id = $1', [commentId]);
      // Delete replies
      await client.query('DELETE FROM comments WHERE parent_comment_id = $1', [commentId]);
      // Delete comment
      await client.query('DELETE FROM comments WHERE comment_id = $1', [commentId]);
    });

    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

const toggleCommentLike = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.user_id;

    const exists = await query('SELECT 1 FROM comments WHERE comment_id = $1', [commentId]);
    if (exists.rows.length === 0) return res.status(404).json({ success: false, error: 'Comment not found' });

    const checkLike = await query('SELECT 1 FROM comment_likes WHERE user_id = $1 AND comment_id = $2', [userId, commentId]);
    let isLiked = false;

    if (checkLike.rows.length > 0) {
      await query('DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2', [userId, commentId]);
    } else {
      await query('INSERT INTO comment_likes (user_id, comment_id) VALUES ($1, $2)', [userId, commentId]);
      isLiked = true;
    }

    const count = await query('SELECT COUNT(*) as c FROM comment_likes WHERE comment_id = $1', [commentId]);

    res.json({ success: true, data: { isLiked, likeCount: parseInt(count.rows[0].c) } });
  } catch (error) {
    next(error);
  }
};

const reportComment = async (req, res, next) => {
  // Implementation similar to rating report...
  res.status(501).json({ success: false, message: 'Implemented in next update' });
};

module.exports = {
  createComment,
  getDocumentComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  toggleCommentLike,
  reportComment
};