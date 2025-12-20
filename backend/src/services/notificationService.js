/**
 * Notification Service - Handles creation, retrieval, and management of notifications
 * Supports both in-app notifications and email notifications based on user preferences
 */

const pool = require('../config/database');
const emailService = require('./emailService');

/**
 * Notification types enum
 */
const NOTIFICATION_TYPES = {
  DOCUMENT_APPROVED: 'document_approved',
  DOCUMENT_REJECTED: 'document_rejected',
  NEW_COMMENT: 'new_comment',
  NEW_QA_ANSWER: 'new_qa_answer',
  ANSWER_ACCEPTED: 'answer_accepted',
  NEW_FOLLOWER: 'new_follower',
  PAYMENT_SUCCESS: 'payment_success',
  VERIFIED_AUTHOR_ACHIEVED: 'verified_author_achieved',
  VERIFIED_AUTHOR_APPLICATION_APPROVED: 'verified_author_approved',
  VERIFIED_AUTHOR_APPLICATION_REJECTED: 'verified_author_rejected'
};

/**
 * Create a new notification
 * @param {string} userId - User UUID to notify
 * @param {string} type - Notification type from NOTIFICATION_TYPES
 * @param {string} title - Notification title
 * @param {string} content - Notification content/message
 * @param {string} relatedDocumentId - Optional related document UUID
 * @param {string} relatedUserId - Optional related user UUID
 * @returns {Promise<Object>} Created notification
 */
exports.createNotification = async (userId, type, title, content, relatedDocumentId = null, relatedUserId = null) => {
  try {
    const query = `
      INSERT INTO notifications (user_id, type, title, content, related_document_id, related_user_id, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, type, title, content, relatedDocumentId, relatedUserId]);
    const notification = result.rows[0];
    
    console.log(`✅ Created notification for user ${userId}:`, notification);
    
    // TODO: Check if user wants email notification for this type
    // await this.sendEmailNotificationIfEnabled(userId, type, title, content, relatedDocumentId);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get notifications for a user
 * @param {string} userId - User UUID
 * @param {boolean} unreadOnly - Only return unread notifications
 * @param {number} limit - Maximum notifications to return
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>} Array of notifications
 */
exports.getNotifications = async (userId, unreadOnly = false, limit = 20, offset = 0) => {
  try {
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    
    if (unreadOnly) {
      query += ' AND is_read = FALSE';
    }
    
    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @param {string} userId - User UUID
 * @returns {Promise<number>} Count of unread notifications
 */
exports.getUnreadCount = async (userId) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification UUID
 * @param {string} userId - User UUID (for security)
 * @returns {Promise<Object>} Updated notification
 */
exports.markAsRead = async (notificationId, userId) => {
  try {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, updated_at = NOW()
      WHERE notification_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [notificationId, userId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User UUID
 * @returns {Promise<number>} Number of notifications marked as read
 */
exports.markAllAsRead = async (userId) => {
  try {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, updated_at = NOW()
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rowCount;
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification UUID
 * @param {string} userId - User UUID (for security)
 * @returns {Promise<boolean>} Success status
 */
exports.deleteNotification = async (notificationId, userId) => {
  try {
    const query = `
      DELETE FROM notifications
      WHERE notification_id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [notificationId, userId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Get user's notification preferences
 * NOTE: notification_preferences table doesn't exist yet in DB
 * This is a placeholder for future implementation
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Notification preferences (default values for now)
 */
exports.getNotificationPreferences = async (userId) => {
  // TODO: Implement when notification_preferences table is created
  // For now, return default preferences (all enabled)
  return {
    user_id: userId,
    email_document_approved: true,
    email_new_comment: true,
    email_new_qa_answer: true,
    email_answer_accepted: true,
    email_new_follower: true,
    email_payment_success: true,
    email_verified_author_status: true
  };
};

/**
 * Update user's notification preferences
 * NOTE: notification_preferences table doesn't exist yet in DB
 * This is a placeholder for future implementation
 * @param {string} userId - User UUID
 * @param {Object} preferences - Preferences to update
 * @returns {Promise<Object>} Updated preferences
 */
exports.updateNotificationPreferences = async (userId, preferences) => {
  // TODO: Implement when notification_preferences table is created
  console.log('⚠️ Notification preferences not yet implemented in DB');
  return { ...preferences, user_id: userId };
};

/**
 * Send email notification if user has enabled it
 * NOTE: Currently sends to all users since preferences table doesn't exist
 * @param {string} userId - User UUID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} content - Notification content
 * @param {string} relatedDocumentId - Optional related document
 */
exports.sendEmailNotificationIfEnabled = async (userId, type, title, content, relatedDocumentId) => {
  try {
    // TODO: Check preferences when notification_preferences table is created
    // For now, send email to all users
    
    // Get user email and name
    const userQuery = await pool.query('SELECT email, full_name FROM users WHERE user_id = $1', [userId]);
    if (userQuery.rowCount === 0) {
      console.error('User not found for email notification');
      return;
    }
    
    const { email, full_name } = userQuery.rows[0];
    
    // Build link based on related document
    let link = null;
    if (relatedDocumentId) {
      link = `/documents/${relatedDocumentId}`;
    }
    
    // Send email notification
    await emailService.sendNotificationEmail(email, full_name, title, content, link);
    console.log(`📧 Sent email notification to ${email}`);
  } catch (error) {
    console.error('Error sending email notification:', error);
    // Don't throw - email notification is optional
  }
};

module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
