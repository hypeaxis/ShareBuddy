/**
 * JWT Authentication middleware
 * Protects routes that require user authentication
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Không có quyền truy cập, vui lòng đăng nhập'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const result = await query(
        'SELECT user_id, email, username, full_name, role, is_active FROM users WHERE user_id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Token không hợp lệ, người dùng không tồn tại'
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token đã hết hạn, vui lòng đăng nhập lại'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: 'Token không hợp lệ'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực người dùng'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Vui lòng đăng nhập để truy cập'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Vai trò ${req.user.role} không có quyền truy cập tài nguyên này`
      });
    }
    next();
  };
};

// Optional auth - adds user to request if token is valid, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await query(
          'SELECT user_id, email, username, full_name, role, is_active FROM users WHERE user_id = $1',
          [decoded.id]
        );

        if (result.rows.length > 0 && result.rows[0].is_active) {
          req.user = result.rows[0];
        }
      } catch (error) {
        // Token invalid but we continue anyway
        console.log('Invalid token in optional auth:', error.message);
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth
};