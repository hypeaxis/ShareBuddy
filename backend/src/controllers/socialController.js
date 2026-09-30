/**
 * Social controller
 * Handles social features like bookmarks, notifications, and activity feeds
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');

// ============= BOOKMARK FUNCTIONS =============

// Add document to bookmarks
const bookmarkDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.user_id;

    // Check if document exists and is approved
    const docResult = await query(
      'SELECT document_id, title, user_id FROM documents WHERE document_id = $1 AND status = $2',
      [documentId, 'approved']
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại hoặc chưa được duyệt'
      });
    }

    // Check if already bookmarked
    const existingBookmark = await query(
      'SELECT 1 FROM bookmarks WHERE user_id = $1 AND document_id = $2',
      [userId, documentId]
    );

    if (existingBookmark.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Tài liệu đã được bookmark rồi'
      });
    }

    // Create bookmark
    await query(
      'INSERT INTO bookmarks (user_id, document_id) VALUES ($1, $2)',
      [userId, documentId]
    );

    res.json({
      success: true,
      message: 'Bookmark tài liệu thành công'
    });
  } catch (error) {
    next(error);
  }
};

// Remove document from bookmarks
const removeBookmark = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.user_id;

    const result = await query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND document_id = $2',
      [userId, documentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bookmark không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Xóa bookmark thành công'
    });
  } catch (error) {
    next(error);
  }
};

// Get user's bookmarked documents
const getUserBookmarks = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Only allow users to see their own bookmarks or public bookmarks
    if (userId !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền xem bookmark của người khác'
      });
    }

    // Get bookmarked documents
    const result = await query(
      `SELECT d.document_id, d.title, d.description, d.thumbnail_url,
              d.category, d.subject, d.credit_cost, d.download_count, d.created_at,
              u.user_id as author_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              b.created_at as bookmarked_at,
              AVG(r.rating) as avg_rating,
              COUNT(r.rating_id) as rating_count
       FROM bookmarks b
       JOIN documents d ON b.document_id = d.document_id
       JOIN users u ON d.user_id = u.user_id
       LEFT JOIN ratings r ON d.document_id = r.document_id
       WHERE b.user_id = $1 AND d.status = 'approved'
       GROUP BY d.document_id, u.user_id, b.created_at
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM bookmarks b
       JOIN documents d ON b.document_id = d.document_id
       WHERE b.user_id = $1 AND d.status = 'approved'`,
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        bookmarks: result.rows.map(row => ({
          document: {
            id: row.document_id,
            title: row.title,
            description: row.description,
            thumbnailUrl: row.thumbnail_url,
            category: row.category,
            subject: row.subject,
            creditCost: row.credit_cost,
            downloadCount: row.download_count,
            avgRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
            ratingCount: parseInt(row.rating_count),
            createdAt: row.created_at,
            author: {
              id: row.author_id,
              username: row.username,
              fullName: row.full_name,
              avatarUrl: row.avatar_url,
              isVerifiedAuthor: row.is_verified_author
            }
          },
          bookmarkedAt: row.bookmarked_at
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= NOTIFICATION FUNCTIONS =============

// Get user notifications
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';

    let whereCondition = 'WHERE n.user_id = $1';
    if (unreadOnly) {
      whereCondition += ' AND n.is_read = false';
    }

    const result = await query(
      `SELECT n.notification_id, n.type, n.title, n.content, n.is_read,
              n.created_at, n.related_document_id, n.related_user_id,
              d.title as document_title, d.thumbnail_url,
              u.username as related_username, u.full_name as related_full_name, u.avatar_url as related_avatar
       FROM notifications n
       LEFT JOIN documents d ON n.related_document_id = d.document_id
       LEFT JOIN users u ON n.related_user_id = u.user_id
       ${whereCondition}
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count and unread count
    const countResult = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
       FROM notifications
       WHERE user_id = $1`,
      [userId]
    );

    const { total, unread_count } = countResult.rows[0];
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        notifications: result.rows.map(row => ({
          id: row.notification_id,
          type: row.type,
          title: row.title,
          content: row.content,
          isRead: row.is_read,
          createdAt: row.created_at,
          relatedDocument: row.related_document_id ? {
            id: row.related_document_id,
            title: row.document_title,
            thumbnailUrl: row.thumbnail_url
          } : null,
          relatedUser: row.related_user_id ? {
            id: row.related_user_id,
            username: row.related_username,
            fullName: row.related_full_name,
            avatarUrl: row.related_avatar
          } : null
        })),
        summary: {
          totalNotifications: parseInt(total),
          unreadCount: parseInt(unread_count)
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: parseInt(total),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.user_id;

    const result = await query(
      `UPDATE notifications 
       SET is_read = true, updated_at = NOW()
       WHERE notification_id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification không tồn tại hoặc không thuộc về bạn'
      });
    }

    res.json({
      success: true,
      message: 'Đánh dấu đã đọc thành công'
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const result = await query(
      `UPDATE notifications 
       SET is_read = true, updated_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({
      success: true,
      message: `Đã đánh dấu ${result.rowCount} notifications là đã đọc`
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.user_id;

    const result = await query(
      'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification không tồn tại hoặc không thuộc về bạn'
      });
    }

    res.json({
      success: true,
      message: 'Xóa notification thành công'
    });
  } catch (error) {
    next(error);
  }
};

// ============= ACTIVITY FEED FUNCTIONS =============

// Get activity feed (documents from followed users)
const getActivityFeed = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get recent activities from followed users
    const result = await query(
      `SELECT 'document' as activity_type, d.document_id as item_id, d.title, d.description,
              d.thumbnail_url, d.category, d.subject, d.credit_cost, d.download_count,
              d.created_at, u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              AVG(r.rating) as avg_rating, COUNT(r.rating_id) as rating_count
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       JOIN follows f ON u.user_id = f.following_id
       LEFT JOIN ratings r ON d.document_id = r.document_id
       WHERE f.follower_id = $1 AND d.status = 'approved' AND d.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY d.document_id, u.user_id
       
       UNION ALL
       
       SELECT 'rating' as activity_type, rt.rating_id as item_id, d.title,
              rt.comment as description, d.thumbnail_url, d.category, d.subject,
              d.credit_cost, d.download_count, rt.created_at,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              rt.rating::DECIMAL as avg_rating, 1 as rating_count
       FROM ratings rt
       JOIN documents d ON rt.document_id = d.document_id
       JOIN users u ON rt.user_id = u.user_id
       JOIN follows f ON u.user_id = f.following_id
       WHERE f.follower_id = $1 AND d.status = 'approved' AND rt.created_at >= NOW() - INTERVAL '7 days'
       
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count of followed users for context
    const followingCount = await query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        activities: result.rows.map(row => ({
          type: row.activity_type,
          id: row.item_id,
          title: row.title,
          description: row.description,
          thumbnailUrl: row.thumbnail_url,
          category: row.category,
          subject: row.subject,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          avgRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
          ratingCount: parseInt(row.rating_count),
          createdAt: row.created_at,
          user: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          }
        })),
        meta: {
          followingCount: parseInt(followingCount.rows[0].count),
          pageInfo: {
            currentPage: page,
            itemsPerPage: limit
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get trending documents (popular in last 7 days)
const getTrendingDocuments = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;

    let categoryCondition = '';
    let queryParams = [limit];
    
    if (category) {
      categoryCondition = 'AND d.category = $2';
      queryParams = [category, limit];
    }

    // Calculate trending score based on recent downloads, ratings, and comments
    const result = await query(
      `SELECT d.document_id, d.title, d.description, d.thumbnail_url,
              d.category, d.subject, d.credit_cost, d.download_count, d.created_at,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              AVG(r.rating) as avg_rating,
              COUNT(DISTINCT r.rating_id) as rating_count,
              COUNT(DISTINCT dl.download_id) as recent_downloads,
              COUNT(DISTINCT c.comment_id) as recent_comments,
              (COUNT(DISTINCT dl.download_id) * 3 + 
               COUNT(DISTINCT r.rating_id) * 2 + 
               COUNT(DISTINCT c.comment_id) * 1) as trending_score
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       LEFT JOIN ratings r ON d.document_id = r.document_id
       LEFT JOIN downloads dl ON d.document_id = dl.document_id AND dl.download_date >= NOW() - INTERVAL '7 days'
       LEFT JOIN comments c ON d.document_id = c.document_id AND c.created_at >= NOW() - INTERVAL '7 days'
       WHERE d.status = 'approved' ${categoryCondition}
       GROUP BY d.document_id, u.user_id
       HAVING COUNT(DISTINCT dl.download_id) > 0 OR COUNT(DISTINCT r.rating_id) > 0 OR COUNT(DISTINCT c.comment_id) > 0
       ORDER BY trending_score DESC, d.created_at DESC
       LIMIT $${queryParams.length}`,
      queryParams
    );

    res.json({
      success: true,
      data: {
        trendingDocuments: result.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          description: row.description,
          thumbnailUrl: row.thumbnail_url,
          category: row.category,
          subject: row.subject,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          avgRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
          ratingCount: parseInt(row.rating_count),
          createdAt: row.created_at,
          trendingStats: {
            recentDownloads: parseInt(row.recent_downloads),
            recentComments: parseInt(row.recent_comments),
            trendingScore: parseInt(row.trending_score)
          },
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

// Helper function to create notification (used by other controllers)
const createNotification = async (userId, type, title, content, relatedDocumentId = null, relatedUserId = null) => {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, content, related_document_id, related_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, content, relatedDocumentId, relatedUserId]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

module.exports = {
  bookmarkDocument,
  removeBookmark,
  getUserBookmarks,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getActivityFeed,
  getTrendingDocuments,
  createNotification // Export for use in other controllers
};