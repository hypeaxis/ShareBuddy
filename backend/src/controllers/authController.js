/**
 * Authentication controller
 * Handles user registration, login, and OAuth operations
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');
const { generateToken: generateVerificationToken, getTokenExpiration } = require('../utils/tokenUtils');
const config = require('../config/config');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register new user
const register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { email, username, password, fullName, university, major } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email hoặc username đã được sử dụng'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const result = await query(
      `INSERT INTO users (email, password_hash, username, full_name, university, major, credits)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, email, username, full_name, university, major, credits, role, created_at`,
      [email, hashedPassword, username, fullName, university, major, 10] // Start with 10 credits
    );

    const user = result.rows[0];

    // Create credit transaction for welcome bonus
    await query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
       VALUES ($1, $2, $3, $4)`,
      [user.user_id, 10, 'bonus', 'Chào mừng thành viên mới - Bonus 10 credits']
    );

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = getTokenExpiration(24); // 24 hours
    
    await query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE user_id = $3`,
      [verificationToken, verificationExpires, user.user_id]
    );
    
    // Send verification email (don't wait for it)
    emailService.sendVerificationEmail(user.email, user.username, verificationToken)
      .catch(err => console.error('Failed to send verification email:', err));

    // Generate JWT token
    const token = generateToken(user.user_id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          university: user.university,
          major: user.major,
          credits: user.credits,
          role: user.role,
          createdAt: user.created_at
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const result = await query(
      `SELECT user_id, email, username, full_name, password_hash, role, credits, is_active, avatar_url
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Generate token
    const token = generateToken(user.user_id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          credits: user.credits,
          avatarUrl: user.avatar_url
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT user_id, email, username, full_name, bio, university, major, 
              role, credits, is_verified_author, avatar_url, created_at
       FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          bio: user.bio,
          university: user.university,
          major: user.major,
          role: user.role,
          credits: user.credits,
          isVerifiedAuthor: user.is_verified_author,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder functions for other auth operations
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  });
};

const refreshToken = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng refresh token chưa được triển khai'
  });
};

const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email
    const result = await query(
      'SELECT user_id, username, email FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not (security best practice)
      return res.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu'
      });
    }

    const user = result.rows[0];

    // Generate password reset token
    const resetToken = generateVerificationToken();
    const resetExpires = getTokenExpiration(1); // 1 hour

    await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE user_id = $3`,
      [resetToken, resetExpires, user.user_id]
    );

    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);

    res.json({
      success: true,
      message: 'Email hướng dẫn đặt lại mật khẩu đã được gửi'
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    // Find user with valid reset token
    const result = await query(
      `SELECT user_id, username, email FROM users 
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    const user = result.rows[0];

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await query(
      `UPDATE users 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
       WHERE user_id = $2`,
      [hashedPassword, user.user_id]
    );

    res.json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công'
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token không được cung cấp'
      });
    }

    // Find user with valid verification token
    const result = await query(
      `SELECT user_id, username, email FROM users 
       WHERE email_verification_token = $1 AND email_verification_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    const user = result.rows[0];

    // Update user as verified
    await query(
      `UPDATE users 
       SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL
       WHERE user_id = $1`,
      [user.user_id]
    );

    // Send welcome email
    emailService.sendWelcomeEmail(user.email, user.username)
      .catch(err => console.error('Failed to send welcome email:', err));

    res.json({
      success: true,
      message: 'Email đã được xác thực thành công'
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email không được cung cấp'
      });
    }

    const result = await query(
      'SELECT user_id, username, email, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email không tồn tại'
      });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email đã được xác thực'
      });
    }

    const verificationToken = generateVerificationToken();
    const verificationExpires = getTokenExpiration(24);

    await query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE user_id = $3`,
      [verificationToken, verificationExpires, user.user_id]
    );

    await emailService.sendVerificationEmail(user.email, user.username, verificationToken);

    res.json({
      success: true,
      message: 'Email xác thực đã được gửi lại'
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth - Initiate authentication
const googleAuth = async (req, res, next) => {
  const passport = require('passport');
  require('../config/passport'); // Load passport config
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
};

// Google OAuth - Handle callback
const googleCallback = async (req, res, next) => {
  const passport = require('passport');
  require('../config/passport');
  
  console.log('🔵 Google OAuth Callback - Start processing');
  
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.FRONTEND_URL}/login?error=google_auth_failed`
  }, (err, user, info) => {
    console.log('🔵 Google OAuth Callback - Passport authentication result');
    console.log('Error:', err ? err.message : 'None');
    console.log('User:', user ? user.user_id : 'None');
    console.log('Info:', info);
    
    if (err) {
      console.error('❌ Google OAuth error:', err);
      return res.redirect(`${config.FRONTEND_URL}/login?error=google_auth_error`);
    }
    
    if (!user) {
      console.error('❌ Google OAuth no user returned');
      return res.redirect(`${config.FRONTEND_URL}/login?error=google_no_user`);
    }
    
    // Generate JWT token
    const token = generateToken(user.user_id);
    console.log('✅ Google OAuth success - Token generated for user:', user.user_id);
    console.log('Redirecting to:', `${config.FRONTEND_URL}/oauth-success?token=${token.substring(0, 20)}...`);
    
    // Redirect to frontend with token
    res.redirect(`${config.FRONTEND_URL}/oauth-success?token=${token}`);
  })(req, res, next);
};

// Facebook OAuth - Initiate authentication
const facebookAuth = async (req, res, next) => {
  const passport = require('passport');
  require('../config/passport');
  
  passport.authenticate('facebook', {
    scope: ['email']
  })(req, res, next);
};

// Facebook OAuth - Handle callback
const facebookCallback = async (req, res, next) => {
  const passport = require('passport');
  require('../config/passport');
  
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: `${config.FRONTEND_URL}/login?error=facebook_auth_failed`
  }, (err, user, info) => {
    if (err) {
      console.error('Facebook OAuth error:', err);
      return res.redirect(`${config.FRONTEND_URL}/login?error=facebook_auth_error`);
    }
    
    if (!user) {
      return res.redirect(`${config.FRONTEND_URL}/login?error=facebook_no_user`);
    }
    
    // Generate JWT token
    const token = generateToken(user.user_id);
    
    // Redirect to frontend with token
    res.redirect(`${config.FRONTEND_URL}/oauth-success?token=${token}`);
  })(req, res, next);
};

const updateProfile = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng cập nhật profile chưa được triển khai'
  });
};

const changePassword = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng đổi mật khẩu chưa được triển khai'
  });
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  googleAuth,
  googleCallback,
  facebookAuth,
  facebookCallback,
  getMe,
  updateProfile,
  changePassword
};