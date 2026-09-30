/**
 * Document routes
 * Handles document upload, search, download, and interactions
 * FIXED: Integrated with Rating, Comment, and Question controllers
 */

const express = require('express');
const { body, param } = require('express-validator');
const documentController = require('../controllers/documentController');
const ratingController = require('../controllers/ratingController');
const commentController = require('../controllers/commentController');
const questionController = require('../controllers/questionController'); // Import Question Controller

const { protect, optionalAuth } = require('../middleware/auth');
const { uploadDocument, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// --- VALIDATION RULES ---
const documentIdValidation = [
  param('id').isUUID().withMessage('Document ID không hợp lệ')
];

// Special validation for routes that use :documentId param naming convention
const docIdParamValidation = [
  param('documentId').isUUID().withMessage('Document ID không hợp lệ')
];

const ratingValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Đánh giá phải từ 1-5 sao'),
  body('comment').optional().isLength({ max: 1000 }).trim()
];

const commentValidation = [
  body('content').isLength({ min: 1, max: 1000 }).trim().withMessage('Nội dung phải có từ 1-1000 ký tự'),
  body('parentId').optional().isUUID()
];

// --- PUBLIC LISTING ROUTES (Must be before /:id) ---
router.get('/', optionalAuth, documentController.getDocuments);
router.get('/bookmarks', protect, documentController.getUserBookmarks);
router.get('/search', optionalAuth, documentController.searchDocuments);
router.get('/featured', optionalAuth, documentController.getFeaturedDocuments);
router.get('/recent', optionalAuth, documentController.getRecentDocuments);
router.get('/popular', optionalAuth, documentController.getPopularDocuments);
router.get('/suggest-tags', documentController.getSuggestedTags);

// --- PROTECTED UPLOAD ---
router.post('/upload', protect, uploadDocument, handleUploadError, documentController.uploadDocument);

// --- DOCUMENT SPECIFIC ROUTES ---

// 1. Q&A Bridge (Must use :documentId to match questionController expectation)
router.get('/:documentId/questions', optionalAuth, docIdParamValidation, questionController.getQuestions);

// 2. Standard Document Operations
router.get('/:id', optionalAuth, documentIdValidation, documentController.getDocumentById);
router.put('/:id', protect, documentIdValidation, documentController.updateDocument);
router.delete('/:id', protect, documentIdValidation, documentController.deleteDocument);

// 3. Interactions (Download, View, Bookmark)
router.post('/:id/download', protect, documentIdValidation, documentController.downloadDocument);
router.post('/:id/view', optionalAuth, documentIdValidation, documentController.incrementView);
router.post('/:id/bookmark', protect, documentIdValidation, documentController.bookmarkDocument);
router.delete('/:id/bookmark', protect, documentIdValidation, documentController.removeBookmark);

// 6. Reporting
router.post('/:id/report', protect, documentIdValidation, documentController.reportDocument);

// 7. Analytics
router.get('/:id/analytics', protect, documentIdValidation, documentController.getDocumentAnalytics);

module.exports = router;