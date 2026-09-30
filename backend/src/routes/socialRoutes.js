/**
 * Social routes
 * Handles bookmarks, notifications, activity feeds, and social interactions
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const socialController = require('../controllers/socialController');

const router = express.Router();

// ============= BOOKMARK ROUTES =============

// Add document to bookmarks
router.post('/bookmarks/:documentId',
  protect,
  [
    param('documentId').isUUID().withMessage('Document ID phải là UUID hợp lệ')
  ],
  socialController.bookmarkDocument
);

// Remove document from bookmarks
router.delete('/bookmarks/:documentId',
  protect,
  [
    param('documentId').isUUID().withMessage('Document ID phải là UUID hợp lệ')
  ],
  socialController.removeBookmark
);

// Get user's bookmarks
router.get('/bookmarks',
  protect,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1 đến 50')
  ],
  socialController.getUserBookmarks
);

// Get specific user's bookmarks (for profile viewing)
router.get('/users/:userId/bookmarks',
  protect,
  [
    param('userId').isUUID().withMessage('User ID phải là UUID hợp lệ'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1 đến 50')
  ],
  (req, res, next) => {
    // Set userId from params for the controller
    req.params.userId = req.params.userId;
    socialController.getUserBookmarks(req, res, next);
  }
);

// ============= NOTIFICATION ROUTES =============

// Get user notifications
router.get('/notifications',
  protect,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1 đến 100'),
    query('unreadOnly').optional().isBoolean().withMessage('UnreadOnly phải là boolean')
  ],
  socialController.getNotifications
);

// Mark notification as read
router.patch('/notifications/:notificationId/read',
  protect,
  [
    param('notificationId').isUUID().withMessage('Notification ID phải là UUID hợp lệ')
  ],
  socialController.markNotificationAsRead
);

// Mark all notifications as read
router.patch('/notifications/read-all',
  protect,
  socialController.markAllNotificationsAsRead
);

// Delete notification
router.delete('/notifications/:notificationId',
  protect,
  [
    param('notificationId').isUUID().withMessage('Notification ID phải là UUID hợp lệ')
  ],
  socialController.deleteNotification
);

// ============= ACTIVITY FEED ROUTES =============

// Get activity feed (from followed users)
router.get('/feed',
  protect,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1 đến 50')
  ],
  socialController.getActivityFeed
);

// Get trending documents
router.get('/trending',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1 đến 50'),
    query('category').optional().isLength({ min: 1 }).withMessage('Category không được để trống')
  ],
  socialController.getTrendingDocuments
);

module.exports = router;