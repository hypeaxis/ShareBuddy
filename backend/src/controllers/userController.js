/**
 * User controller
 * Handles user profile operations and user-related functionality
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const notificationService = require('../services/notificationService');

// Get user profile by ID
const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get basic user info
    const userResult = await query(
      `SELECT u.user_id, u.username, u.full_name, u.bio, u.university, u.major, 
              u.credits, u.is_verified_author, u.is_public_profile, u.avatar_url, u.created_at,
              u.email_verified,
              COUNT(DISTINCT d.document_id) as document_count,
              COUNT(DISTINCT f1.following_id) as following_count,
              COUNT(DISTINCT f2.follower_id) as follower_count,
              AVG(r.rating) as avg_rating
       FROM users u
       LEFT JOIN documents d ON u.user_id = d.author_id AND d.status = 'approved'
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

    // Check if profile is private
    if (!user.is_public_profile && (!req.user || req.user.user_id !== id)) {
      return res.status(403).json({
        success: false,
        error: 'Profile is private'
      });
    }

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
        id: user.user_id,
        username: user.username,
        fullName: user.full_name,
        bio: user.bio,
        university: user.university,
        major: user.major,
        credits: parseInt(user.credits) || 0,
        isVerifiedAuthor: user.is_verified_author,
        isPublic: user.is_public_profile, 
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        emailVerified: user.email_verified,
        stats: {
          documentCount: parseInt(user.document_count),
          followingCount: parseInt(user.following_count),
          followerCount: parseInt(user.follower_count),
          avgRating: user.avg_rating ? parseFloat(user.avg_rating).toFixed(1) : null
        },
        isFollowing
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

    // Check if user allows following
    const userCheck = await query(
      'SELECT allow_follow_activity, username FROM users WHERE user_id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!userCheck.rows[0].allow_follow_activity) {
      return res.status(403).json({
        success: false,
        error: 'Người dùng này đã tắt chức năng theo dõi'
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

    // Send notification to the followed user
    try {
      const followerResult = await query(
        'SELECT full_name FROM users WHERE user_id = $1',
        [followerId]
      );
      
      if (followerResult.rows.length > 0) {
        const followerName = followerResult.rows[0].full_name;
        await notificationService.createNotification(
          id,
          notificationService.NOTIFICATION_TYPES.NEW_FOLLOWER,
          'Người theo dõi mới',
          `${followerName} đã bắt đầu theo dõi bạn`,
          null,
          followerId
        );
        console.log(`✓ Follower notification sent to user ${id}`);
      }
    } catch (notifError) {
      console.error(`⚠️ Failed to create follower notification:`, notifError.message);
    }

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
    const status = req.query.status;

    // If viewing own profile, show ALL documents by default (pending, approved, rejected)
    // If viewing others' profile, show only approved documents
    const isOwnProfile = req.user && req.user.user_id === id;
    
    console.log('📄 getUserDocuments - User:', req.user?.user_id, 'Profile:', id, 'IsOwn:', isOwnProfile);
    
    let statusCondition = '';
    let queryParams = [id, limit, offset];
    
    if (!isOwnProfile) {
      // Non-owners can only see approved documents
      console.log('👤 Not own profile - filtering approved only');
      statusCondition = 'AND d.status = $4';
      queryParams.push('approved');
    } else if (status) {
      // Owner can filter by specific status if provided
      console.log('✅ Own profile with status filter:', status);
      statusCondition = 'AND d.status = $4';
      queryParams.push(status);
    } else {
      console.log('✅ Own profile - showing ALL documents');
    }
    // else: owner viewing all statuses (no filter)

    const result = await query(
      `SELECT d.document_id, d.title, d.description, d.file_path, d.file_name,
              d.subject, d.credit_cost, d.download_count, d.view_count, d.status,
              d.created_at, d.updated_at,
              AVG(r.rating) as avg_rating,
              COUNT(r.rating_id) as rating_count
       FROM documents d
       LEFT JOIN ratings r ON d.document_id = r.document_id
       WHERE d.author_id = $1 ${statusCondition}
       GROUP BY d.document_id
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      queryParams
    );

    // Get total count with same status filter
    let countQuery = `SELECT COUNT(*) as total FROM documents WHERE author_id = $1`;
    let countParams = [id];
    
    if (statusCondition) {
      countQuery += ` AND status = $2`;
      countParams.push(queryParams[3]); // The status parameter
    }
    
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
          filePath: row.file_path,
          fileName: row.file_name,
          subject: row.subject,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          viewCount: row.view_count,
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

/**
 * Update user settings (privacy & notifications)
 */
const updateUserSettings = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const {
      email_notifications,
      is_public_profile,
      allow_follow_activity
    } = req.body;

    // Update settings
    const result = await query(
      `UPDATE users 
       SET email_notifications = COALESCE($1, email_notifications),
           is_public_profile = COALESCE($2, is_public_profile),
           allow_follow_activity = COALESCE($3, allow_follow_activity),
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING user_id, email_notifications, is_public_profile, allow_follow_activity`,
      [
        email_notifications !== undefined ? email_notifications : null,
        is_public_profile !== undefined ? is_public_profile : null,
        allow_follow_activity !== undefined ? allow_follow_activity : null,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Cài đặt đã được cập nhật',
      data: {
        settings: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user settings
 */
const getUserSettings = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const result = await query(
      `SELECT 
        email_notifications,
        is_public_profile,
        allow_follow_activity
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const settings = result.rows[0];

    res.json({
      success: true,
      data: {
        email_notifications: settings.email_notifications ?? true,
        is_public_profile: settings.is_public_profile ?? true,
        allow_follow_activity: settings.allow_follow_activity ?? true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update email notification setting
 */
const updateEmailNotifications = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        details: errors.array()
      });
    }

    const userId = req.user.user_id;
    const { enabled } = req.body;

    await query(
      'UPDATE users SET email_notifications = $1, updated_at = NOW() WHERE user_id = $2',
      [enabled, userId]
    );

    res.json({
      success: true,
      message: enabled 
        ? 'Đã bật thông báo email' 
        : 'Đã tắt thông báo email',
      data: {
        email_notifications: enabled
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile visibility setting
 */
const updateProfileVisibility = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        details: errors.array()
      });
    }

    const userId = req.user.user_id;
    const { isPublic } = req.body;

    await query(
      'UPDATE users SET is_public_profile = $1, updated_at = NOW() WHERE user_id = $2',
      [isPublic, userId]
    );

    res.json({
      success: true,
      message: isPublic 
        ? 'Profile của bạn đã được công khai' 
        : 'Profile của bạn đã được ẩn',
      data: {
        profilePublic: isPublic
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update allow following setting
 */
const updateAllowFollowing = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        details: errors.array()
      });
    }

    const userId = req.user.user_id;
    const { allowed } = req.body;

    await query(
      'UPDATE users SET allow_follow_activity = $1, updated_at = NOW() WHERE user_id = $2',
      [allowed, userId]
    );

    res.json({
      success: true,
      message: allowed 
        ? 'Người khác có thể theo dõi bạn' 
        : 'Đã tắt chức năng theo dõi',
      data: {
        allowFollowing: allowed
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update all settings at once
 */
const updateAllSettings = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        details: errors.array()
      });
    }

    const userId = req.user.user_id;
    const { email_notifications, is_public_profile, allow_follow_activity } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (typeof email_notifications === 'boolean') {
      paramCount++;
      updates.push(`email_notifications = $${paramCount}`);
      values.push(email_notifications);
    }

    if (typeof is_public_profile === 'boolean') {
      paramCount++;
      updates.push(`is_public_profile = $${paramCount}`);
      values.push(is_public_profile);
    }

    if (typeof allow_follow_activity === 'boolean') {
      paramCount++;
      updates.push(`allow_follow_activity = $${paramCount}`);
      values.push(allow_follow_activity);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No settings to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount + 1}
      RETURNING email_notifications, is_public_profile, allow_follow_activity
    `;

    const result = await query(updateQuery, values);

    res.json({
      success: true,
      message: 'Cập nhật cài đặt thành công',
      data: {
        email_notifications: result.rows[0].email_notifications,
        is_public_profile: result.rows[0].is_public_profile,
        allow_follow_activity: result.rows[0].allow_follow_activity
      }
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
  updateUserSettings,
  getUserSettings,
  updateEmailNotifications,
  updateProfileVisibility,
  updateAllowFollowing,
  updateAllSettings,
  changePassword
};