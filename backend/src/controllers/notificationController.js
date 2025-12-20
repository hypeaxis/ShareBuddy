/**
 * Notification Controller - Handles notification-related HTTP requests
 */

const notificationService = require('../services/notificationService');

/**
 * Get notifications for the authenticated user
 * GET /api/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { unread_only, limit, offset } = req.query;
    
    const unreadOnly = unread_only === 'true';
    const limitNum = parseInt(limit) || 20;
    const offsetNum = parseInt(offset) || 0;
    
    const notifications = await notificationService.getNotifications(
      userId,
      unreadOnly,
      limitNum,
      offsetNum
    );
    
    res.status(200).json({
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      message: 'Không thể tải thông báo',
      error: error.message
    });
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const count = await notificationService.getUnreadCount(userId);
    
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      message: 'Không thể tải số lượng thông báo',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const notificationId = req.params.id; // UUID string
    
    const notification = await notificationService.markAsRead(notificationId, userId);
    
    if (!notification) {
      return res.status(404).json({
        message: 'Không tìm thấy thông báo'
      });
    }
    
    res.status(200).json({
      message: 'Đã đánh dấu đã đọc',
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      message: 'Không thể đánh dấu thông báo',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/mark-all-read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const count = await notificationService.markAllAsRead(userId);
    
    res.status(200).json({
      message: `Đã đánh dấu ${count} thông báo là đã đọc`,
      count
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      message: 'Không thể đánh dấu thông báo',
      error: error.message
    });
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const notificationId = req.params.id; // UUID string
    
    const success = await notificationService.deleteNotification(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({
        message: 'Không tìm thấy thông báo'
      });
    }
    
    res.status(200).json({
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      message: 'Không thể xóa thông báo',
      error: error.message
    });
  }
};

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const preferences = await notificationService.getNotificationPreferences(userId);
    
    res.status(200).json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({
      message: 'Không thể tải cài đặt thông báo',
      error: error.message
    });
  }
};

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const preferences = req.body;
    
    const updated = await notificationService.updateNotificationPreferences(userId, preferences);
    
    res.status(200).json({
      message: 'Đã cập nhật cài đặt thông báo',
      preferences: updated
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      message: 'Không thể cập nhật cài đặt',
      error: error.message
    });
  }
};
