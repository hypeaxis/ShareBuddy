/**
 * User controller
 * Handles user profile operations and user-related functionality
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');

// Get user profile by ID
const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get basic user info
    const userResult = await query(
      `SELECT u.user_id, u.username, u.full_name, u.bio, u.university, u.major, 
              u.credits, u.is_verified_author, u.avatar_url, u.created_at,
              COUNT(DISTINCT d.document_id) as document_count,
              COUNT(DISTINCT f1.following_id) as following_count,
              COUNT(DISTINCT f2.follower_id) as follower_count,
              AVG(r.rating) as avg_rating
       FROM users u
       LEFT JOIN documents d ON u.user_id = d.user_id AND d.status = 'approved'
       LEFT JOIN follows f1 ON u.user_id = f1.follower_id
       LEFT JOIN follows f2 ON u.user_id = f2.following_id
       LEFT JOIN ratings r ON d.document_id = r.document_id
       WHERE u.user_id = $1 AND u.is_active = true
       GROUP BY u.user_id`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const user = userResult.rows[0];

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user) {
      const followResult = await query(
        'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
        [req.user.user_id, id]
      );
      isFollowing = followResult.rows.length > 0;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          username: user.username,
          fullName: user.full_name,
          bio: user.bio,
          university: user.university,
          major: user.major,
          credits: user.credits,
          isVerifiedAuthor: user.is_verified_author,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
          stats: {
            documentCount: parseInt(user.document_count),
            followingCount: parseInt(user.following_count),
            followerCount: parseInt(user.follower_count),
            avgRating: user.avg_rating ? parseFloat(user.avg_rating).toFixed(1) : null
          },
          isFollowing
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { fullName, bio, university, major } = req.body;
    const userId = req.user.user_id;

    const result = await query(
      `UPDATE users 
       SET full_name = $1, bio = $2, university = $3, major = $4, updated_at = NOW()
       WHERE user_id = $5
       RETURNING user_id, email, username, full_name, bio, university, major, 
                 credits, is_verified_author, avatar_url`,
      [fullName, bio, university, major, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          bio: user.bio,
          university: user.university,
          major: user.major,
          credits: user.credits,
          isVerifiedAuthor: user.is_verified_author,
          avatarUrl: user.avatar_url
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Upload avatar
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file được upload'
      });
    }

    const userId = req.user.user_id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2',
      [avatarUrl, userId]
    );

    res.json({
      success: true,
      message: 'Upload avatar thành công',
      data: {
        avatarUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// Follow user
const followUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const followerId = req.user.user_id;

    if (followerId === parseInt(id)) {
      return res.status(400).json({
        success: false,
        error: 'Không thể follow chính mình'
      });
    }

    // Check if target user exists
    const targetUser = await query(
      'SELECT user_id FROM users WHERE user_id = $1 AND is_active = true',
      [id]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    // Check if already following
    const existingFollow = await query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, id]
    );

    if (existingFollow.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Đã follow người dùng này rồi'
      });
    }

    // Create follow relationship
    await query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, id]
    );

    res.json({
      success: true,
      message: 'Follow thành công'
    });
  } catch (error) {
    next(error);
  }
};

// Unfollow user
const unfollowUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const followerId = req.user.user_id;

    const result = await query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy quan hệ follow'
      });
    }

    res.json({
      success: true,
      message: 'Unfollow thành công'
    });
  } catch (error) {
    next(error);
  }
};

// Get user's followers
const getFollowers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.follower_id = u.user_id
       WHERE f.following_id = $1 AND u.is_active = true
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM follows f
       JOIN users u ON f.follower_id = u.user_id
       WHERE f.following_id = $1 AND u.is_active = true`,
      [id]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        followers: result.rows.map(row => ({
          id: row.user_id,
          username: row.username,
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          isVerifiedAuthor: row.is_verified_author,
          followedAt: row.followed_at
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

// Get user's following
const getFollowing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.following_id = u.user_id
       WHERE f.follower_id = $1 AND u.is_active = true
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM follows f
       JOIN users u ON f.following_id = u.user_id
       WHERE f.follower_id = $1 AND u.is_active = true`,
      [id]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        following: result.rows.map(row => ({
          id: row.user_id,
          username: row.username,
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          isVerifiedAuthor: row.is_verified_author,
          followedAt: row.followed_at
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

// Get user's documents
const getUserDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'approved';

    // Only show approved documents to others, all statuses to self
    let statusCondition = 'AND d.status = $4';
    let queryParams = [id, limit, offset, status];
    
    if (req.user && req.user.user_id === parseInt(id)) {
      if (status === 'all') {
        statusCondition = '';
        queryParams = [id, limit, offset];
      }
    } else {
      // Non-owners can only see approved documents
      queryParams[3] = 'approved';
    }

    const result = await query(
      `SELECT d.document_id, d.title, d.description, d.file_url, d.thumbnail_url,
              d.category, d.subject, d.credit_cost, d.download_count, d.status,
              d.created_at, d.updated_at,
              AVG(r.rating) as avg_rating,
              COUNT(r.rating_id) as rating_count
       FROM documents d
       LEFT JOIN ratings r ON d.document_id = r.document_id
       WHERE d.user_id = $1 ${statusCondition}
       GROUP BY d.document_id
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      queryParams
    );

    // Get total count
    const countQuery = statusCondition 
      ? `SELECT COUNT(*) as total FROM documents WHERE user_id = $1 AND status = $2`
      : `SELECT COUNT(*) as total FROM documents WHERE user_id = $1`;
    
    const countParams = statusCondition ? [id, queryParams[3]] : [id];
    const countResult = await query(countQuery, countParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        documents: result.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          description: row.description,
          fileUrl: row.file_url,
          thumbnailUrl: row.thumbnail_url,
          category: row.category,
          subject: row.subject,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          status: row.status,
          avgRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
          ratingCount: parseInt(row.rating_count),
          createdAt: row.created_at,
          updatedAt: row.updated_at
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

// Change password
const changePassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    // Get current password hash
    const userResult = await query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Mật khẩu hiện tại không đúng'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile: getProfile,
  getMyProfile: getProfile,
  updateMyProfile: updateProfile,
  uploadAvatar,
  deleteAvatar: uploadAvatar, // Placeholder - need to implement
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserStats: getProfile, // Placeholder - need to implement  
  getUserDocuments,
  getMyDownloads: getUserDocuments, // Placeholder - need to implement
  getMyBookmarks: getUserDocuments, // Placeholder - need to implement
  getMyCredits: getProfile, // Placeholder - need to implement
  getCreditHistory: getUserDocuments, // Placeholder - need to implement
  searchUsers: getFollowers, // Placeholder - need to implement
  changePassword
};