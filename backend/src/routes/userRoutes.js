/**
 * User routes
 * Handles user profile and social features
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const userController = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const userIdValidation = [
  param('id')
    .isUUID()
    .withMessage('User ID không hợp lệ')
];

const updateProfileValidation = [
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ tên phải có từ 2-100 ký tự'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio không được vượt quá 500 ký tự'),
  body('university')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Tên trường không được vượt quá 255 ký tự'),
  body('major')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Chuyên ngành không được vượt quá 255 ký tự')
];

// Public routes
router.get('/profile/:id', optionalAuth, userIdValidation, userController.getUserProfile);

router.get('/search', userController.searchUsers);

// Protected routes
router.get('/me', protect, userController.getMyProfile);
router.put('/me', protect, updateProfileValidation, userController.updateMyProfile);
router.post('/upload-avatar', protect, uploadAvatar, handleUploadError, userController.uploadAvatar);
router.delete('/avatar', protect, userController.deleteAvatar);

// Social features
router.post('/follow/:id', protect, userIdValidation, userController.followUser);
router.delete('/follow/:id', protect, userIdValidation, userController.unfollowUser);
router.get('/followers/:id', optionalAuth, userIdValidation, userController.getFollowers);
router.get('/following/:id', optionalAuth, userIdValidation, userController.getFollowing);

// User statistics
router.get('/stats/:id', optionalAuth, userIdValidation, userController.getUserStats);
router.get('/documents/:id', optionalAuth, userIdValidation, userController.getUserDocuments);
router.get('/downloads', protect, userController.getMyDownloads);
router.get('/bookmarks', protect, userController.getMyBookmarks);

// Credit system
router.get('/credits', protect, userController.getMyCredits);
router.get('/credit-history', protect, userController.getCreditHistory);

//Setting routes
router.get('/settings', protect, userController.getUserSettings);
router.put('/settings', protect, userController.updateUserSettings);

// Update individual settings
router.patch('/email-notifications', protect, [
  body('enabled').isBoolean().withMessage('enabled must be a boolean')
], userController.updateEmailNotifications);

router.patch('/profile-visibility', protect, [
  body('isPublic').isBoolean().withMessage('isPublic must be a boolean')
], userController.updateProfileVisibility);

router.patch('/allow-following', protect, [
  body('allowed').isBoolean().withMessage('allowed must be a boolean')
], userController.updateAllowFollowing);

// Update all settings at once
router.put('/', protect, [
  body('emailNotifications').optional().isBoolean(),
  body('profilePublic').optional().isBoolean(),
  body('allowFollowing').optional().isBoolean()
], userController.updateAllSettings);



module.exports = router;