/**
 * Verified Author Controller
 * Handles automatic verified author badge system
 */

const { validationResult } = require('express-validator');
const verifiedAuthorService = require('../services/verifiedAuthorService');

// Get verified authors list
const getVerifiedAuthors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await verifiedAuthorService.getVerifiedAuthors(page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Check verification status
const checkStatus = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.user_id;

    const isVerified = await verifiedAuthorService.isVerified(userId);

    res.json({
      success: true,
      data: { isVerified }
    });
  } catch (error) {
    next(error);
  }
};

// Get verification progress
const getProgress = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const progress = await verifiedAuthorService.getVerificationProgress(userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error in getProgress:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Không thể tải thông tin tiến độ'
    });
  }
};

// Request verification (auto-verify if eligible)
const requestVerification = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Check if already verified
    const isVerified = await verifiedAuthorService.isVerified(userId);
    if (isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Bạn đã là tác giả uy tín'
      });
    }

    // Try to auto-verify
    const result = await verifiedAuthorService.checkAndAutoVerify(userId);

    if (result.verified) {
      res.json({
        success: true,
        message: 'Chúc mừng! Bạn đã trở thành Tác giả uy tín',
        data: { verified: true }
      });
    } else {
      // Get current progress
      const progress = await verifiedAuthorService.getVerificationProgress(userId);
      
      res.status(400).json({
        success: false,
        error: 'Chưa đủ tiêu chuẩn để trở thành Tác giả uy tín',
        data: progress
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVerifiedAuthors,
  checkStatus,
  getProgress,
  requestVerification
};
