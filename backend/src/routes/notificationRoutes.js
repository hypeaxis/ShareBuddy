/**
 * Notification Routes
 * Base path: /api/notifications
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All notification routes require authentication
router.use(protect);

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for authenticated user
 * @query   unread_only (boolean), limit (number), offset (number)
 * @access  Protected
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Protected
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get user's notification preferences
 * @access  Protected
 */
router.get('/preferences', notificationController.getPreferences);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update user's notification preferences
 * @access  Protected
 */
router.put('/preferences', notificationController.updatePreferences);

/**
 * @route   PATCH /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Protected
 */
router.patch('/mark-all-read', notificationController.markAllAsRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark specific notification as read
 * @access  Protected
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Protected
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * @route   POST /api/notifications/test
 * @desc    Test endpoint to create a test notification
 * @access  Protected
 */
router.post('/test', notificationController.testCreateNotification);

module.exports = router;
