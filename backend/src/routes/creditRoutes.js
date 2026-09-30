/**
 * Credit routes
 * Handles credit management, purchasing, and transactions
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const creditController = require('../controllers/creditController');

const router = express.Router();

// Get current user's credit balance
router.get('/balance',
  protect,
  creditController.getCreditBalance
);

// Get transaction history
router.get('/transactions',
  protect,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1 đến 100'),
    query('type').optional().isIn(['earn', 'download', 'purchase', 'bonus', 'penalty', 'transfer']).withMessage('Type không hợp lệ')
  ],
  creditController.getTransactionHistory
);

// Transfer credits to another user
router.post('/transfer',
  protect,
  [
    body('targetUserId').isUUID().withMessage('Target User ID phải là UUID hợp lệ'),
    body('amount').isInt({ min: 1, max: 1000 }).withMessage('Số lượng credits phải từ 1 đến 1000'),
    body('message').optional().isLength({ max: 200 }).withMessage('Tin nhắn không được quá 200 ký tự')
  ],
  creditController.transferCredits
);

// ============= ADMIN ONLY ROUTES =============

// Gift credits to user (admin only)
router.post('/gift',
  protect,
  authorize('admin'),
  [
    body('targetUserId').isUUID().withMessage('Target User ID phải là UUID hợp lệ'),
    body('amount').isInt({ min: 1, max: 10000 }).withMessage('Số lượng credits phải từ 1 đến 10000'),
    body('reason').notEmpty().isLength({ max: 500 }).withMessage('Lý do không được để trống và không quá 500 ký tự')
  ],
  creditController.giftCredits
);

// Deduct credits from user (admin only)
router.post('/deduct',
  protect,
  authorize('admin'),
  [
    body('targetUserId').isUUID().withMessage('Target User ID phải là UUID hợp lệ'),
    body('amount').isInt({ min: 1, max: 10000 }).withMessage('Số lượng credits phải từ 1 đến 10000'),
    body('reason').notEmpty().isLength({ max: 500 }).withMessage('Lý do không được để trống và không quá 500 ký tự')
  ],
  creditController.deductCredits
);

// Get credit statistics (admin only)
router.get('/statistics',
  protect,
  authorize('admin'),
  [
    query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Period phải từ 1 đến 365 ngày')
  ],
  creditController.getCreditStatistics
);

module.exports = router;