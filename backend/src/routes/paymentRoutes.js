/**
 * Payment Routes
 * Routes for Stripe payment integration
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/payments/packages
 * @desc    Get available credit packages
 * @access  Public
 */
router.get('/packages', paymentController.getCreditPackages);

/**
 * @route   GET /api/payments/packages-with-config
 * @desc    Get credit packages along with Stripe publishable key
 * @access  Public
 */
router.get('/packages-with-config', paymentController.getPackagesWithConfig);

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create Stripe payment intent
 * @access  Private
 */
router.post(
  '/create-intent',
  protect,
  [
    body('packageId')
      .isUUID()
      .withMessage('Package ID không hợp lệ'),
    body('currency')
      .optional()
      .isIn(['usd', 'vnd'])
      .withMessage('Currency phải là usd hoặc vnd')
  ],
  paymentController.createPaymentIntent
);

/**
 * @route   GET /api/payments/history
 * @desc    Get user payment history
 * @access  Private
 */
router.get('/history', protect, paymentController.getPaymentHistory);

/**
 * @route   GET /api/payments/verify/:paymentIntentId
 * @desc    Verify payment status
 * @access  Private
 */
router.get('/verify/:paymentIntentId', protect, paymentController.verifyPayment);

/**
 * @route   POST /api/payments/webhook
 * @desc    Stripe webhook endpoint (raw body required)
 * @access  Public
 */
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
