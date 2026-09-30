/**
 * Question routes - Q&A system
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const questionController = require('../controllers/questionController');
const { protect, optionalAuth } = require('../middleware/auth');

// Get questions for a document (Public)
// Matches: /api/questions/document/:documentId
router.get('/document/:documentId', optionalAuth, questionController.getQuestions);

// Get single question details (Public)
router.get('/:questionId', optionalAuth, questionController.getQuestion);

// Create question (Protected)
router.post('/',
  protect,
  [
    body('documentId').isUUID().withMessage('Document ID không hợp lệ'),
    body('title').trim().isLength({ min: 10, max: 500 }).withMessage('Tiêu đề phải từ 10-500 ký tự'),
    body('content').trim().isLength({ min: 10 }).withMessage('Nội dung phải ít nhất 10 ký tự')
  ],
  questionController.createQuestion
);

// Create answer (Protected)
router.post('/answer',
  protect,
  [
    body('questionId').isUUID().withMessage('Question ID không hợp lệ'),
    body('content').trim().isLength({ min: 10 }).withMessage('Câu trả lời phải ít nhất 10 ký tự')
  ],
  questionController.createAnswer
);

// Accept answer (Protected - Author only)
router.post('/answer/:answerId/accept', protect, questionController.acceptAnswer);

// Vote on question (Protected)
router.post('/:questionId/vote',
  protect,
  body('voteType').isInt({ min: -1, max: 1 }).withMessage('Vote type không hợp lệ'),
  questionController.voteQuestion
);

// Vote on answer (Protected)
router.post('/answer/:answerId/vote',
  protect,
  body('voteType').isInt({ min: -1, max: 1 }).withMessage('Vote type không hợp lệ'),
  questionController.voteAnswer
);

// Delete operations
router.delete('/:questionId', protect, questionController.deleteQuestion);
router.delete('/answer/:answerId', protect, questionController.deleteAnswer);

module.exports = router;