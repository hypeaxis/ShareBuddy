# ShareBuddy - Implementation Guide
## Complete Feature Implementation Roadmap

**Date:** December 14, 2025  
**Version:** 1.0  
**Status:** Ready for Review and Implementation

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Module 1: Email System](#module-1-email-system)
3. [Module 2: OAuth Authentication](#module-2-oauth-authentication)
4. [Module 3: Stripe Payment Gateway](#module-3-stripe-payment-gateway)
5. [Module 4: Q&A System](#module-4-qa-system)
6. [Module 5: Recommendation Engine](#module-5-recommendation-engine)
7. [Module 6: Document Preview](#module-6-document-preview)
8. [Module 7: Verified Author System](#module-7-verified-author-system)
9. [Module 8: Full-Text Search](#module-8-full-text-search)
10. [Module 9: API Documentation](#module-9-api-documentation-swagger)
11. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Implementation Priority

**Phase 1 - Core Features (Week 1):**
1. ✅ Email Verification & Password Reset
2. ✅ Q&A System
3. ✅ Document Preview

**Phase 2 - Enhanced Features (Week 2):**
4. OAuth Authentication (Google + Facebook)
5. Stripe Payment Gateway
6. Full-Text Search

**Phase 3 - Advanced Features (Week 3):**
7. Collaborative Filtering Recommendation
8. Verified Author System
9. Swagger API Documentation

### Files To Create/Update

**Backend (23 files):**
- ✅ `services/emailService.js` (CREATED)
- ✅ `utils/tokenUtils.js` (CREATED)
- `controllers/authController.js` (UPDATE)
- `controllers/paymentController.js` (NEW)
- `controllers/questionController.js` (NEW)
- `controllers/recommendationController.js` (NEW)
- `controllers/verifiedAuthorController.js` (NEW)
- `services/stripeService.js` (NEW)
- `services/recommendationService.js` (NEW)
- `services/previewService.js` (NEW)
- `config/passport.js` (NEW)
- `config/swagger.js` (NEW)
- `routes/auth.js` (UPDATE)
- `routes/payment.js` (NEW)
- `routes/questions.js` (NEW)
- `routes/api.js` (NEW)
- `middleware/apiKey.js` (NEW)
- `app.js` (UPDATE - add passport)

**Frontend (15 files):**
- `pages/auth/VerifyEmailPage.tsx` (NEW)
- `pages/auth/ResetPasswordPage.tsx` (NEW)
- `pages/payment/PaymentPage.tsx` (NEW)
- `components/payment/StripeCheckout.tsx` (NEW)
- `components/payment/CreditPackages.tsx` (NEW)
- `components/questions/QuestionList.tsx` (NEW)
- `components/questions/QuestionForm.tsx` (NEW)
- `components/questions/AnswerList.tsx` (NEW)
- `components/preview/DocumentPreview.tsx` (NEW)
- `services/paymentService.ts` (NEW)
- `services/questionService.ts` (NEW)
- `App.tsx` (UPDATE - add routes)

---

## Module 1: Email System

### ✅ Completed Files:
- `backend/src/services/emailService.js` ✓
- `backend/src/utils/tokenUtils.js` ✓
- `backend/src/config/config.js` ✓ (updated)
- `backend/.env.example` ✓ (updated)

### Implementation Steps:

#### Step 1: Update authController.js

**Location:** `backend/src/controllers/authController.js`

**Action:** Replace placeholder functions with full implementations

**Code additions:**

```javascript
// Add these imports at the top:
const emailService = require('../services/emailService');
const { generateToken: generateVerificationToken, getTokenExpiration } = require('../utils/tokenUtils');

// In register() function, after creating user (around line 60), add:
    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = getTokenExpiration(24); // 24 hours
    
    await query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE user_id = $3`,
      [verificationToken, verificationExpires, user.user_id]
    );
    
    // Send verification email (don't block response)
    emailService.sendVerificationEmail(user.email, user.username, verificationToken)
      .catch(err => console.error('Failed to send verification email:', err));

// Replace the placeholder functions (around line 220-280):
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token không được cung cấp'
      });
    }

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

    await query(
      `UPDATE users 
       SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL
       WHERE user_id = $1`,
      [user.user_id]
    );

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

    const result = await query(
      'SELECT user_id, username, email FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists (security best practice)
      return res.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu'
      });
    }

    const user = result.rows[0];
    const resetToken = generateVerificationToken();
    const resetExpires = getTokenExpiration(1); // 1 hour

    await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE user_id = $3`,
      [resetToken, resetExpires, user.user_id]
    );

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
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

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

// Update module.exports to include new functions:
module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,  // ADD THIS
  googleAuth,
  googleCallback,
  facebookAuth,
  facebookCallback,
  getMe,
  updateProfile,
  changePassword
};
```

#### Step 2: Update auth routes

**Location:** `backend/src/routes/auth.js`

**Action:** Add new email verification and password reset routes

```javascript
// Add these routes after existing routes:

// Email verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Password reset
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
```

#### Step 3: Create Frontend - VerifyEmailPage

**Location:** `frontend/src/pages/auth/VerifyEmailPage.tsx`

**Action:** Create new file with the following content:

```typescript
import React, { useEffect, useState } from 'react';
import { Container, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import axios from 'axios';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Token không hợp lệ');
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/auth/verify-email?token=${token}`
        );
        
        setStatus('success');
        setMessage(response.data.message);
        
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Xác thực email thất bại');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <Container className="py-5" style={{ marginTop: '80px' }}>
      <Card className="mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Body className="text-center p-5">
          {status === 'loading' && (
            <>
              <Spinner animation="border" variant="primary" className="mb-3" />
              <h4>Đang xác thực email...</h4>
            </>
          )}
          
          {status === 'success' && (
            <>
              <FaCheckCircle size={60} className="text-success mb-3" />
              <h4 className="text-success">Xác thực thành công!</h4>
              <Alert variant="success" className="mt-3">{message}</Alert>
              <p className="text-muted">Đang chuyển hướng đến trang đăng nhập...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <FaTimesCircle size={60} className="text-danger mb-3" />
              <h4 className="text-danger">Xác thực thất bại</h4>
              <Alert variant="danger" className="mt-3">{message}</Alert>
              <Button variant="primary" onClick={() => navigate('/login')}>
                Quay lại đăng nhập
              </Button>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default VerifyEmailPage;
```

#### Step 4: Create Frontend - ResetPasswordPage

**Location:** `frontend/src/pages/auth/ResetPasswordPage.tsx`

```typescript
import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import axios from 'axios';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = searchParams.get('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/reset-password`,
        { token, newPassword: password }
      );
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5" style={{ marginTop: '80px' }}>
      <Card className="mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <FaLock size={50} className="text-primary mb-3" />
            <h3>Đặt lại mật khẩu</h3>
          </div>

          {success ? (
            <Alert variant="success">
              Mật khẩu đã được đặt lại thành công! Đang chuyển hướng...
            </Alert>
          ) : (
            <Form onSubmit={handleSubmit}>
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form.Group className="mb-3">
                <Form.Label>Mật khẩu mới</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Xác nhận mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Form.Group>

              <Button 
                type="submit" 
                variant="primary" 
                className="w-100"
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResetPasswordPage;
```

#### Step 5: Update Frontend App.tsx routes

**Location:** `frontend/src/App.tsx`

```typescript
// Add these imports:
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Add these routes in your Router:
<Route path="/verify-email" element={<VerifyEmailPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

#### Step 6: Environment Configuration

Add to `backend/.env`:

```env
# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
FRONTEND_URL=http://localhost:3000
```

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and generate password
3. Copy 16-character password to `.env`

---

## Module 2: OAuth Authentication (Google + Facebook)

### Files to Create/Update:
- `backend/src/config/passport.js` (NEW)
- `backend/src/controllers/authController.js` (UPDATE)
- `backend/src/app.js` (UPDATE)
- `frontend/src/pages/auth/OAuthSuccessPage.tsx` (NEW)
- `frontend/src/pages/auth/LoginPage.tsx` (UPDATE)

### External Setup Required:

**Google OAuth:**
1. Go to https://console.cloud.google.com/
2. Create new project: "ShareBuddy"
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5001/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

**Facebook OAuth:**
1. Go to https://developers.facebook.com/
2. Create new app
3. Add Facebook Login product
4. Add redirect URI: `http://localhost:5001/api/auth/facebook/callback`
5. Copy App ID and Secret to `.env`

### Step 1: Install required package

```bash
cd backend
npm install express-session
```

### Step 2: Create Passport Configuration

**Location:** `backend/src/config/passport.js` (NEW FILE)

```javascript
/**
 * Passport.js configuration for OAuth authentication
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { query } = require('./database');
const config = require('./config');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE user_id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Google ID
      let result = await query(
        'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
        ['google', profile.id]
      );

      if (result.rows.length > 0) {
        // User exists, update OAuth tokens
        await query(
          `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, provider) 
           DO UPDATE SET access_token = $3, refresh_token = $4, expires_at = $5, updated_at = NOW()`,
          [
            result.rows[0].user_id,
            'google',
            accessToken,
            refreshToken,
            new Date(Date.now() + 3600000) // 1 hour
          ]
        );
        
        return done(null, result.rows[0]);
      }

      // Check if email already exists (merge accounts)
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (email) {
        result = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length > 0) {
          // Link Google account to existing user
          await query(
            `UPDATE users 
             SET oauth_provider = $1, oauth_id = $2, email_verified = TRUE, avatar_url = $3
             WHERE user_id = $4`,
            ['google', profile.id, profile.photos[0]?.value, result.rows[0].user_id]
          );
          
          return done(null, result.rows[0]);
        }
      }

      // Create new user
      const newUser = await query(
        `INSERT INTO users (
          email, username, full_name, oauth_provider, oauth_id, 
          email_verified, avatar_url, credits
        ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, 10)
        RETURNING *`,
        [
          email,
          `google_${profile.id.substring(0, 10)}`,
          profile.displayName,
          'google',
          profile.id,
          profile.photos[0]?.value
        ]
      );

      // Welcome bonus
      await query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES ($1, 10, 'bonus', 'Chào mừng thành viên mới qua Google')`,
        [newUser.rows[0].user_id]
      );

      done(null, newUser.rows[0]);
    } catch (error) {
      done(error, null);
    }
  }));
}

// Facebook OAuth Strategy
if (config.FACEBOOK_APP_ID && config.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: config.FACEBOOK_APP_ID,
    clientSecret: config.FACEBOOK_APP_SECRET,
    callbackURL: config.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'emails', 'name', 'picture']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Facebook ID
      let result = await query(
        'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
        ['facebook', profile.id]
      );

      if (result.rows.length > 0) {
        await query(
          `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, provider) 
           DO UPDATE SET access_token = $3, refresh_token = $4, expires_at = $5, updated_at = NOW()`,
          [
            result.rows[0].user_id,
            'facebook',
            accessToken,
            refreshToken,
            new Date(Date.now() + 3600000)
          ]
        );
        
        return done(null, result.rows[0]);
      }

      // Check if email already exists
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (email) {
        result = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length > 0) {
          await query(
            `UPDATE users 
             SET oauth_provider = $1, oauth_id = $2, email_verified = TRUE, avatar_url = $3
             WHERE user_id = $4`,
            ['facebook', profile.id, profile.photos[0]?.value, result.rows[0].user_id]
          );
          
          return done(null, result.rows[0]);
        }
      }

      // Create new user
      const fullName = `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
      const newUser = await query(
        `INSERT INTO users (
          email, username, full_name, oauth_provider, oauth_id, 
          email_verified, avatar_url, credits
        ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, 10)
        RETURNING *`,
        [
          email,
          `fb_${profile.id.substring(0, 10)}`,
          fullName || 'Facebook User',
          'facebook',
          profile.id,
          profile.photos[0]?.value
        ]
      );

      await query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES ($1, 10, 'bonus', 'Chào mừng thành viên mới qua Facebook')`,
        [newUser.rows[0].user_id]
      );

      done(null, newUser.rows[0]);
    } catch (error) {
      done(error, null);
    }
  }));
}

module.exports = passport;
```

### Step 3: Update authController for OAuth

**Location:** `backend/src/controllers/authController.js`

**Action:** Replace the OAuth placeholder functions

```javascript
// Add at top of file:
const passport = require('../config/passport');
const config = require('../config/config');

// Replace OAuth placeholder functions (around line 250-290):

const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err || !user) {
      console.error('Google OAuth error:', err);
      return res.redirect(`${config.FRONTEND_URL}/login?error=oauth_failed`);
    }

    try {
      const token = generateToken(user.user_id);
      res.redirect(`${config.FRONTEND_URL}/oauth-success?token=${token}`);
    } catch (error) {
      console.error('Token generation error:', error);
      res.redirect(`${config.FRONTEND_URL}/login?error=token_failed`);
    }
  })(req, res, next);
};

const facebookAuth = passport.authenticate('facebook', {
  scope: ['email']
});

const facebookCallback = (req, res, next) => {
  passport.authenticate('facebook', { session: false }, async (err, user, info) => {
    if (err || !user) {
      console.error('Facebook OAuth error:', err);
      return res.redirect(`${config.FRONTEND_URL}/login?error=oauth_failed`);
    }

    try {
      const token = generateToken(user.user_id);
      res.redirect(`${config.FRONTEND_URL}/oauth-success?token=${token}`);
    } catch (error) {
      console.error('Token generation error:', error);
      res.redirect(`${config.FRONTEND_URL}/login?error=token_failed`);
    }
  })(req, res, next);
};
```

### Step 4: Update app.js for Passport

**Location:** `backend/src/app.js`

**Action:** Add Passport initialization (after CORS, before routes)

```javascript
// Add these requires at top:
const session = require('express-session');
const passport = require('./config/passport');

// Add session and passport middleware (after CORS, before routes):
app.use(session({
  secret: config.SESSION_SECRET || process.env.SESSION_SECRET || 'sharebuddy-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: config.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());
```

### Step 5: Update auth routes

**Location:** `backend/src/routes/auth.js`

```javascript
// Add OAuth routes:
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

router.get('/facebook', authController.facebookAuth);
router.get('/facebook/callback', authController.facebookCallback);
```

### Step 6: Frontend - OAuth Success Page

**Location:** `frontend/src/pages/auth/OAuthSuccessPage.tsx` (NEW)

```typescript
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

const OAuthSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthToken } = useAuth(); // You'll need to create this method

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <Container className="py-5 text-center" style={{ marginTop: '80px' }}>
      <Spinner animation="border" variant="primary" />
      <h4 className="mt-3">Đang xử lý đăng nhập...</h4>
    </Container>
  );
};

export default OAuthSuccessPage;
```

### Step 7: Update LoginPage with OAuth buttons

**Location:** `frontend/src/pages/auth/LoginPage.tsx`

**Action:** Add OAuth buttons before or after the login form

```typescript
// Add imports:
import { FaGoogle, FaFacebook } from 'react-icons/fa';

// Add this section after the main form:
<div className="text-center mt-4">
  <p className="text-muted mb-3">Hoặc đăng nhập bằng:</p>
  <div className="d-flex gap-2 justify-content-center">
    <Button
      variant="outline-danger"
      onClick={() => {
        window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/google`;
      }}
    >
      <FaGoogle className="me-2" />
      Google
    </Button>
    <Button
      variant="outline-primary"
      onClick={() => {
        window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/facebook`;
      }}
    >
      <FaFacebook className="me-2" />
      Facebook
    </Button>
  </div>
</div>
```

### Step 8: Environment Configuration

Add to `backend/.env`:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

FACEBOOK_APP_ID=your-facebook-app-id-here
FACEBOOK_APP_SECRET=your-facebook-app-secret-here
FACEBOOK_CALLBACK_URL=http://localhost:5001/api/auth/facebook/callback

SESSION_SECRET=your-session-secret-here
```

---

## Module 3: Stripe Payment Gateway

### Dependencies:
- Stripe account (https://stripe.com)
- Stripe test API keys

### Step 1: Install Stripe SDKs

```bash
# Backend
cd backend
npm install stripe

# Frontend
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Step 2: Create Stripe Service

**Location:** `backend/src/services/stripeService.js` (NEW FILE)

```javascript
/**
 * Stripe Payment Service
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const config = require('../config/config');

// Create payment intent
const createPaymentIntent = async (amount, currency, metadata) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw error;
  }
};

// Create customer
const createCustomer = async (email, name, userId) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { userId }
    });

    return customer;
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    throw error;
  }
};

// Get or create customer
const getOrCreateCustomer = async (userId, email, name) => {
  try {
    // Search for existing customer
    const customers = await stripe.customers.list({
      email,
      limit: 1
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer
    return await createCustomer(email, name, userId);
  } catch (error) {
    console.error('Error getting/creating customer:', error);
    throw error;
  }
};

// Verify webhook signature
const verifyWebhookSignature = (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
};

// Refund payment
const refundPayment = async (paymentIntentId, amount) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return refund;
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw error;
  }
};

// List payment methods for customer
const listPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  } catch (error) {
    console.error('Error listing payment methods:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  createCustomer,
  getOrCreateCustomer,
  verifyWebhookSignature,
  refundPayment,
  listPaymentMethods
};
```

### Step 3: Create Payment Controller

**Location:** `backend/src/controllers/paymentController.js` (NEW FILE)

```javascript
/**
 * Payment Controller - Handles Stripe payments and credit purchases
 */

const { query, withTransaction } = require('../config/database');
const stripeService = require('../services/stripeService');
const emailService = require('../services/emailService');

// Get credit packages
const getCreditPackages = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM credit_packages WHERE is_active = TRUE ORDER BY display_order`
    );

    res.json({
      success: true,
      data: {
        packages: result.rows.map(pkg => ({
          id: pkg.package_id,
          credits: pkg.credits,
          priceUsd: parseFloat(pkg.price_usd),
          priceVnd: pkg.price_vnd ? parseFloat(pkg.price_vnd) : null,
          bonusCredits: pkg.bonus_credits,
          isPopular: pkg.is_popular,
          totalCredits: pkg.credits + pkg.bonus_credits
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create payment intent
const createPayment = async (req, res, next) => {
  try {
    const { packageId, currency = 'USD' } = req.body;
    const userId = req.user.user_id;

    // Get package details
    const packageResult = await query(
      'SELECT * FROM credit_packages WHERE package_id = $1 AND is_active = TRUE',
      [packageId]
    );

    if (packageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gói credits không tồn tại'
      });
    }

    const pkg = packageResult.rows[0];
    const amount = currency === 'VND' ? pkg.price_vnd : pkg.price_usd;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: `Giá cho ${currency} không khả dụng`
      });
    }

    // Get user details
    const userResult = await query(
      'SELECT email, username, full_name, oauth_id FROM users WHERE user_id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // Get or create Stripe customer
    const customer = await stripeService.getOrCreateCustomer(
      userId,
      user.email,
      user.full_name
    );

    // Create Stripe payment intent
    const paymentIntent = await stripeService.createPaymentIntent(
      amount,
      currency,
      {
        userId,
        packageId,
        credits: pkg.credits,
        bonusCredits: pkg.bonus_credits,
        customerId: customer.id
      }
    );

    // Store payment transaction
    await query(
      `INSERT INTO payment_transactions (
        user_id, stripe_payment_intent_id, stripe_customer_id,
        amount, currency, credits_purchased, payment_status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
      [
        userId,
        paymentIntent.id,
        customer.id,
        amount,
        currency,
        pkg.credits + pkg.bonus_credits,
        JSON.stringify({ packageId: pkg.package_id })
      ]
    );

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        credits: pkg.credits + pkg.bonus_credits
      }
    });
  } catch (error) {
    next(error);
  }
};

// Stripe webhook handler
const handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    const event = stripeService.verifyWebhookSignature(req.body, signature);

    console.log(`Received webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const { userId, credits } = paymentIntent.metadata;

    await withTransaction(async (client) => {
      // Update payment transaction
      await client.query(
        `UPDATE payment_transactions 
         SET payment_status = 'succeeded', 
             payment_method = $2,
             updated_at = NOW() 
         WHERE stripe_payment_intent_id = $1`,
        [paymentIntent.id, paymentIntent.payment_method_types[0]]
      );

      // Add credits to user account
      await client.query(
        'UPDATE users SET credits = credits + $1 WHERE user_id = $2',
        [parseInt(credits), userId]
      );

      // Record credit transaction
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, $2, 'purchase', $3, $4)`,
        [
          userId,
          parseInt(credits),
          `Mua ${credits} credits - Payment ID: ${paymentIntent.id}`,
          paymentIntent.id
        ]
      );
    });

    // Get user details and send confirmation email
    const userResult = await query(
      'SELECT email, username FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      await emailService.sendPaymentConfirmationEmail(user.email, user.username, {
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        credits: parseInt(credits),
        transactionId: paymentIntent.id,
        paymentMethod: 'Card'
      });
    }

    console.log(`Payment succeeded for user ${userId}: ${credits} credits`);
  } catch (error) {
    console.error('Payment success handling error:', error);
  }
};

const handlePaymentFailed = async (paymentIntent) => {
  try {
    await query(
      `UPDATE payment_transactions 
       SET payment_status = 'failed', 
           error_message = $2,
           updated_at = NOW() 
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id, paymentIntent.last_payment_error?.message || 'Payment failed']
    );

    console.log(`Payment failed for intent ${paymentIntent.id}`);
  } catch (error) {
    console.error('Payment failed handling error:', error);
  }
};

const handlePaymentCanceled = async (paymentIntent) => {
  try {
    await query(
      `UPDATE payment_transactions 
       SET payment_status = 'canceled', 
           updated_at = NOW() 
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    console.log(`Payment canceled for intent ${paymentIntent.id}`);
  } catch (error) {
    console.error('Payment canceled handling error:', error);
  }
};

// Get user's payment history
const getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        payment_id,
        stripe_payment_intent_id,
        amount,
        currency,
        credits_purchased,
        payment_status,
        payment_method,
        error_message,
        created_at
       FROM payment_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM payment_transactions WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        payments: result.rows.map(p => ({
          id: p.payment_id,
          transactionId: p.stripe_payment_intent_id,
          amount: parseFloat(p.amount),
          currency: p.currency,
          credits: p.credits_purchased,
          status: p.payment_status,
          paymentMethod: p.payment_method,
          error: p.error_message,
          date: p.created_at
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all payments
const getAllPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // Filter by status

    let queryStr = `
      SELECT 
        pt.*,
        u.username,
        u.email,
        u.full_name
      FROM payment_transactions pt
      JOIN users u ON pt.user_id = u.user_id
    `;
    
    const params = [];
    if (status) {
      queryStr += ' WHERE pt.payment_status = $1';
      params.push(status);
      queryStr += ` ORDER BY pt.created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      queryStr += ` ORDER BY pt.created_at DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    const result = await query(queryStr, params);

    const countQuery = status
      ? 'SELECT COUNT(*) FROM payment_transactions WHERE payment_status = $1'
      : 'SELECT COUNT(*) FROM payment_transactions';
    const countParams = status ? [status] : [];
    const countResult = await query(countQuery, countParams);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refund payment (admin only)
const refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body; // Optional partial refund

    // Get payment details
    const paymentResult = await query(
      'SELECT * FROM payment_transactions WHERE payment_id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];

    if (payment.payment_status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Only succeeded payments can be refunded'
      });
    }

    // Process refund with Stripe
    const refund = await stripeService.refundPayment(
      payment.stripe_payment_intent_id,
      amount
    );

    await withTransaction(async (client) => {
      // Update payment status
      await client.query(
        `UPDATE payment_transactions 
         SET payment_status = 'refunded', updated_at = NOW() 
         WHERE payment_id = $1`,
        [paymentId]
      );

      // Deduct credits from user
      await client.query(
        'UPDATE users SET credits = GREATEST(credits - $1, 0) WHERE user_id = $2',
        [payment.credits_purchased, payment.user_id]
      );

      // Record refund transaction
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, $2, 'penalty', $3, $4)`,
        [
          payment.user_id,
          -payment.credits_purchased,
          `Refund: ${reason || 'No reason provided'}`,
          refund.id
        ]
      );
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: { refundId: refund.id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCreditPackages,
  createPayment,
  handleWebhook,
  getPaymentHistory,
  getAllPayments,
  refundPayment
};
```

### Step 4: Create Payment Routes

**Location:** `backend/src/routes/payment.js` (NEW FILE)

```javascript
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

// Get credit packages (public)
router.get('/packages', paymentController.getCreditPackages);

// Create payment intent (protected)
router.post('/create-payment', authenticate, paymentController.createPayment);

// Stripe webhook (no auth - verified by signature)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Payment history (protected)
router.get('/history', authenticate, paymentController.getPaymentHistory);

// Admin routes
router.get('/admin/payments', authenticate, authorize('admin'), paymentController.getAllPayments);
router.post('/admin/refund/:paymentId', authenticate, authorize('admin'), paymentController.refundPayment);

module.exports = router;
```

### Step 5: Update app.js

**Location:** `backend/src/app.js`

```javascript
// Add payment routes
const paymentRoutes = require('./routes/payment');

// Use payment routes (IMPORTANT: webhook must use raw body)
app.use('/api/payment/webhook', paymentRoutes);
app.use(express.json()); // JSON parser after webhook route
app.use('/api/payment', paymentRoutes);
```

**(Implementation guide continues with remaining modules...)**

---

Tôi sẽ tiếp tục với các modules còn lại. Document này đang được xây dựng để đạt khoảng 3000+ lines. Bạn có muốn tôi tiếp tục ngay với Module 4 (Q&A System) không?
# ShareBuddy Implementation Guide - Part 2
## Modules 4-9 Continuation

This is the continuation of IMPLEMENTATION_GUIDE.md

---

## Module 4: Q&A System (Questions & Answers)

### Overview
Separate Q&A system for documents - users can ask questions and get answers from community.

### Database Tables (Already created in migration):
- `questions`
- `answers`
- `question_votes`
- `answer_votes`

### Step 1: Create Question Controller

**Location:** `backend/src/controllers/questionController.js` (NEW FILE)

```javascript
/**
 * Question Controller - Handles Q&A for documents
 */

const { query, withTransaction } = require('../config/database');
const { validationResult } = require('express-validator');

// Get questions for a document
const getQuestions = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'recent'; // recent, votes, unanswered

    let orderClause = 'q.created_at DESC';
    if (sortBy === 'votes') {
      orderClause = 'q.vote_count DESC, q.created_at DESC';
    } else if (sortBy === 'unanswered') {
      orderClause = 'q.is_answered ASC, q.created_at DESC';
    }

    const result = await query(
      `SELECT 
        q.*,
        u.username as author_username,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        u.is_verified_author,
        COUNT(DISTINCT a.answer_id) as answer_count
       FROM questions q
       JOIN users u ON q.user_id = u.user_id
       LEFT JOIN answers a ON q.question_id = a.question_id
       WHERE q.document_id = $1
       GROUP BY q.question_id, u.user_id
       ORDER BY ${orderClause}
       LIMIT $2 OFFSET $3`,
      [documentId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM questions WHERE document_id = $1',
      [documentId]
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        questions: result.rows.map(q => ({
          id: q.question_id,
          title: q.title,
          content: q.content,
          isAnswered: q.is_answered,
          acceptedAnswerId: q.accepted_answer_id,
          voteCount: q.vote_count,
          viewCount: q.view_count,
          answerCount: parseInt(q.answer_count),
          author: {
            username: q.author_username,
            name: q.author_name,
            avatar: q.author_avatar,
            isVerified: q.is_verified_author
          },
          createdAt: q.created_at,
          updatedAt: q.updated_at
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single question with answers
const getQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    // Increment view count
    await query(
      'UPDATE questions SET view_count = view_count + 1 WHERE question_id = $1',
      [questionId]
    );

    // Get question
    const questionResult = await query(
      `SELECT 
        q.*,
        u.username as author_username,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        u.is_verified_author,
        d.title as document_title
       FROM questions q
       JOIN users u ON q.user_id = u.user_id
       JOIN documents d ON q.document_id = d.document_id
       WHERE q.question_id = $1`,
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu hỏi không tồn tại'
      });
    }

    // Get answers
    const answersResult = await query(
      `SELECT 
        a.*,
        u.username as author_username,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        u.is_verified_author
       FROM answers a
       JOIN users u ON a.user_id = u.user_id
       WHERE a.question_id = $1
       ORDER BY a.is_accepted DESC, a.vote_count DESC, a.created_at ASC`,
      [questionId]
    );

    const question = questionResult.rows[0];

    res.json({
      success: true,
      data: {
        question: {
          id: question.question_id,
          title: question.title,
          content: question.content,
          isAnswered: question.is_answered,
          acceptedAnswerId: question.accepted_answer_id,
          voteCount: question.vote_count,
          viewCount: question.view_count,
          documentId: question.document_id,
          documentTitle: question.document_title,
          author: {
            username: question.author_username,
            name: question.author_name,
            avatar: question.author_avatar,
            isVerified: question.is_verified_author
          },
          createdAt: question.created_at,
          updatedAt: question.updated_at
        },
        answers: answersResult.rows.map(a => ({
          id: a.answer_id,
          content: a.content,
          isAccepted: a.is_accepted,
          voteCount: a.vote_count,
          author: {
            username: a.author_username,
            name: a.author_name,
            avatar: a.author_avatar,
            isVerified: a.is_verified_author
          },
          createdAt: a.created_at,
          updatedAt: a.updated_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create question
const createQuestion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { documentId, title, content } = req.body;
    const userId = req.user.user_id;

    // Check if document exists
    const docResult = await query(
      'SELECT document_id FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const result = await query(
      `INSERT INTO questions (document_id, user_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [documentId, userId, title, content]
    );

    // Award credits for asking question
    await query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
       VALUES ($1, 1, 'comment', 'Đặt câu hỏi về tài liệu', $2)`,
      [userId, result.rows[0].question_id]
    );

    await query(
      'UPDATE users SET credits = credits + 1 WHERE user_id = $1',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'Câu hỏi đã được tạo thành công',
      data: { questionId: result.rows[0].question_id }
    });
  } catch (error) {
    next(error);
  }
};

// Create answer
const createAnswer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { questionId, content } = req.body;
    const userId = req.user.user_id;

    // Check if question exists
    const questionResult = await query(
      'SELECT * FROM questions WHERE question_id = $1',
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu hỏi không tồn tại'
      });
    }

    const result = await query(
      `INSERT INTO answers (question_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [questionId, userId, content]
    );

    // Award credits for answering
    await query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
       VALUES ($1, 2, 'comment', 'Trả lời câu hỏi', $2)`,
      [userId, result.rows[0].answer_id]
    );

    await query(
      'UPDATE users SET credits = credits + 2 WHERE user_id = $1',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'Câu trả lời đã được tạo thành công',
      data: { answerId: result.rows[0].answer_id }
    });
  } catch (error) {
    next(error);
  }
};

// Accept answer (question author only)
const acceptAnswer = async (req, res, next) => {
  try {
    const { answerId } = req.params;
    const userId = req.user.user_id;

    // Get answer and question details
    const result = await query(
      `SELECT a.*, q.user_id as question_author_id, q.question_id
       FROM answers a
       JOIN questions q ON a.question_id = q.question_id
       WHERE a.answer_id = $1`,
      [answerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu trả lời không tồn tại'
      });
    }

    const answer = result.rows[0];

    // Check if user is question author
    if (answer.question_author_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Chỉ tác giả câu hỏi mới có thể chấp nhận câu trả lời'
      });
    }

    await withTransaction(async (client) => {
      // Unmark previous accepted answer
      await client.query(
        `UPDATE answers SET is_accepted = FALSE WHERE question_id = $1`,
        [answer.question_id]
      );

      // Mark this answer as accepted
      await client.query(
        'UPDATE answers SET is_accepted = TRUE WHERE answer_id = $1',
        [answerId]
      );

      // Update question
      await client.query(
        `UPDATE questions 
         SET is_answered = TRUE, accepted_answer_id = $1 
         WHERE question_id = $2`,
        [answerId, answer.question_id]
      );

      // Bonus credits for accepted answer author
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, 5, 'bonus', 'Câu trả lời được chấp nhận', $2)`,
        [answer.user_id, answerId]
      );

      await client.query(
        'UPDATE users SET credits = credits + 5 WHERE user_id = $1',
        [answer.user_id]
      );
    });

    res.json({
      success: true,
      message: 'Câu trả lời đã được chấp nhận'
    });
  } catch (error) {
    next(error);
  }
};

// Vote on question
const voteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { voteType } = req.body; // 1 for upvote, -1 for downvote
    const userId = req.user.user_id;

    if (![1, -1].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'Vote type không hợp lệ'
      });
    }

    await withTransaction(async (client) => {
      // Check existing vote
      const existingVote = await client.query(
        'SELECT * FROM question_votes WHERE question_id = $1 AND user_id = $2',
        [questionId, userId]
      );

      if (existingVote.rows.length > 0) {
        const currentVote = existingVote.rows[0].vote_type;
        
        if (currentVote === voteType) {
          // Remove vote
          await client.query(
            'DELETE FROM question_votes WHERE question_id = $1 AND user_id = $2',
            [questionId, userId]
          );
          
          await client.query(
            'UPDATE questions SET vote_count = vote_count - $1 WHERE question_id = $2',
            [voteType, questionId]
          );
        } else {
          // Change vote
          await client.query(
            'UPDATE question_votes SET vote_type = $1 WHERE question_id = $2 AND user_id = $3',
            [voteType, questionId, userId]
          );
          
          await client.query(
            'UPDATE questions SET vote_count = vote_count + $1 WHERE question_id = $2',
            [voteType * 2, questionId] // +2 or -2
          );
        }
      } else {
        // New vote
        await client.query(
          'INSERT INTO question_votes (question_id, user_id, vote_type) VALUES ($1, $2, $3)',
          [questionId, userId, voteType]
        );
        
        await client.query(
          'UPDATE questions SET vote_count = vote_count + $1 WHERE question_id = $2',
          [voteType, questionId]
        );
      }
    });

    res.json({
      success: true,
      message: 'Vote đã được cập nhật'
    });
  } catch (error) {
    next(error);
  }
};

// Vote on answer (similar to question voting)
const voteAnswer = async (req, res, next) => {
  try {
    const { answerId } = req.params;
    const { voteType } = req.body;
    const userId = req.user.user_id;

    if (![1, -1].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'Vote type không hợp lệ'
      });
    }

    await withTransaction(async (client) => {
      const existingVote = await client.query(
        'SELECT * FROM answer_votes WHERE answer_id = $1 AND user_id = $2',
        [answerId, userId]
      );

      if (existingVote.rows.length > 0) {
        const currentVote = existingVote.rows[0].vote_type;
        
        if (currentVote === voteType) {
          await client.query(
            'DELETE FROM answer_votes WHERE answer_id = $1 AND user_id = $2',
            [answerId, userId]
          );
          
          await client.query(
            'UPDATE answers SET vote_count = vote_count - $1 WHERE answer_id = $2',
            [voteType, answerId]
          );
        } else {
          await client.query(
            'UPDATE answer_votes SET vote_type = $1 WHERE answer_id = $2 AND user_id = $3',
            [voteType, answerId, userId]
          );
          
          await client.query(
            'UPDATE answers SET vote_count = vote_count + $1 WHERE answer_id = $2',
            [voteType * 2, answerId]
          );
        }
      } else {
        await client.query(
          'INSERT INTO answer_votes (answer_id, user_id, vote_type) VALUES ($1, $2, $3)',
          [answerId, userId, voteType]
        );
        
        await client.query(
          'UPDATE answers SET vote_count = vote_count + $1 WHERE answer_id = $2',
          [voteType, answerId]
        );
      }
    });

    res.json({
      success: true,
      message: 'Vote đã được cập nhật'
    });
  } catch (error) {
    next(error);
  }
};

// Delete question (author or admin)
const deleteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    const result = await query(
      'SELECT user_id FROM questions WHERE question_id = $1',
      [questionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu hỏi không tồn tại'
      });
    }

    if (result.rows[0].user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền xóa câu hỏi này'
      });
    }

    await query('DELETE FROM questions WHERE question_id = $1', [questionId]);

    res.json({
      success: true,
      message: 'Câu hỏi đã được xóa'
    });
  } catch (error) {
    next(error);
  }
};

// Delete answer (author or admin)
const deleteAnswer = async (req, res, next) => {
  try {
    const { answerId } = req.params;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    const result = await query(
      'SELECT user_id FROM answers WHERE answer_id = $1',
      [answerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu trả lời không tồn tại'
      });
    }

    if (result.rows[0].user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền xóa câu trả lời này'
      });
    }

    await query('DELETE FROM answers WHERE answer_id = $1', [answerId]);

    res.json({
      success: true,
      message: 'Câu trả lời đã được xóa'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestions,
  getQuestion,
  createQuestion,
  createAnswer,
  acceptAnswer,
  voteQuestion,
  voteAnswer,
  deleteQuestion,
  deleteAnswer
};
```

### Step 2: Create Question Routes

**Location:** `backend/src/routes/questions.js` (NEW FILE)

```javascript
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const questionController = require('../controllers/questionController');
const { authenticate } = require('../middleware/auth');

// Get questions for a document
router.get('/document/:documentId', questionController.getQuestions);

// Get single question with answers
router.get('/:questionId', questionController.getQuestion);

// Create question (protected)
router.post('/',
  authenticate,
  [
    body('documentId').isUUID().withMessage('Document ID không hợp lệ'),
    body('title').trim().isLength({ min: 10, max: 500 }).withMessage('Tiêu đề phải từ 10-500 ký tự'),
    body('content').trim().isLength({ min: 20 }).withMessage('Nội dung phải ít nhất 20 ký tự')
  ],
  questionController.createQuestion
);

// Create answer (protected)
router.post('/answer',
  authenticate,
  [
    body('questionId').isUUID().withMessage('Question ID không hợp lệ'),
    body('content').trim().isLength({ min: 20 }).withMessage('Câu trả lời phải ít nhất 20 ký tự')
  ],
  questionController.createAnswer
);

// Accept answer (protected)
router.post('/answer/:answerId/accept', authenticate, questionController.acceptAnswer);

// Vote on question (protected)
router.post('/:questionId/vote',
  authenticate,
  body('voteType').isInt({ min: -1, max: 1 }).withMessage('Vote type không hợp lệ'),
  questionController.voteQuestion
);

// Vote on answer (protected)
router.post('/answer/:answerId/vote',
  authenticate,
  body('voteType').isInt({ min: -1, max: 1 }).withMessage('Vote type không hợp lệ'),
  questionController.voteAnswer
);

// Delete question (protected)
router.delete('/:questionId', authenticate, questionController.deleteQuestion);

// Delete answer (protected)
router.delete('/answer/:answerId', authenticate, questionController.deleteAnswer);

module.exports = router;
```

### Step 3: Update app.js

```javascript
// Add question routes
const questionRoutes = require('./routes/questions');
app.use('/api/questions', questionRoutes);
```

### Step 4: Frontend - Question Service

**Location:** `frontend/src/services/questionService.ts` (NEW FILE)

```typescript
import api from './api';

export interface Question {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  acceptedAnswerId?: string;
  voteCount: number;
  viewCount: number;
  answerCount: number;
  author: {
    username: string;
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id: string;
  content: string;
  isAccepted: boolean;
  voteCount: number;
  author: {
    username: string;
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface QuestionDetail extends Question {
  documentId: string;
  documentTitle: string;
}

class QuestionService {
  async getQuestions(documentId: string, page = 1, sortBy = 'recent') {
    const response = await api.get(`/questions/document/${documentId}`, {
      params: { page, sortBy }
    });
    return response.data;
  }

  async getQuestion(questionId: string) {
    const response = await api.get(`/questions/${questionId}`);
    return response.data;
  }

  async createQuestion(data: {
    documentId: string;
    title: string;
    content: string;
  }) {
    const response = await api.post('/questions', data);
    return response.data;
  }

  async createAnswer(questionId: string, content: string) {
    const response = await api.post('/questions/answer', {
      questionId,
      content
    });
    return response.data;
  }

  async acceptAnswer(answerId: string) {
    const response = await api.post(`/questions/answer/${answerId}/accept`);
    return response.data;
  }

  async voteQuestion(questionId: string, voteType: 1 | -1) {
    const response = await api.post(`/questions/${questionId}/vote`, {
      voteType
    });
    return response.data;
  }

  async voteAnswer(answerId: string, voteType: 1 | -1) {
    const response = await api.post(`/questions/answer/${answerId}/vote`, {
      voteType
    });
    return response.data;
  }

  async deleteQuestion(questionId: string) {
    const response = await api.delete(`/questions/${questionId}`);
    return response.data;
  }

  async deleteAnswer(answerId: string) {
    const response = await api.delete(`/questions/answer/${answerId}`);
    return response.data;
  }
}

export default new QuestionService();
```

**(Continuing with remaining modules...)**

---

## Module 5: Collaborative Filtering Recommendation System

### Overview
Recommend documents based on user behavior and similar users' preferences.

### Step 1: Create Recommendation Service

**Location:** `backend/src/services/recommendationService.js` (NEW FILE)

```javascript
/**
 * Recommendation Service - Collaborative Filtering
 * Recommends documents based on user behavior and similar users
 */

const { query } = require('../config/database');

// Track user interaction with document
const trackInteraction = async (userId, documentId, interactionType, interactionValue = null) => {
  try {
    await query(
      `INSERT INTO user_document_interactions (user_id, document_id, interaction_type, interaction_value)
       VALUES ($1, $2, $3, $4)`,
      [userId, documentId, interactionType, interactionValue]
    );
  } catch (error) {
    console.error('Error tracking interaction:', error);
  }
};

// Find similar users based on interaction patterns
const findSimilarUsers = async (userId, limit = 10) => {
  try {
    const result = await query(
      `SELECT 
        CASE 
          WHEN user_id_1 = $1 THEN user_id_2
          ELSE user_id_1
        END as similar_user_id,
        similarity_score,
        common_interactions
       FROM user_similarity
       WHERE user_id_1 = $1 OR user_id_2 = $1
       ORDER BY similarity_score DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error finding similar users:', error);
    return [];
  }
};

// Get recommendations based on similar users
const getCollaborativeRecommendations = async (userId, limit = 10) => {
  try {
    // Get similar users
    const similarUsers = await findSimilarUsers(userId, 20);
    
    if (similarUsers.length === 0) {
      // Fallback to popular documents
      return getPopularDocuments(limit);
    }

    const similarUserIds = similarUsers.map(u => u.similar_user_id);

    // Get documents liked by similar users but not by current user
    const result = await query(
      `SELECT DISTINCT
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.average_rating,
        d.download_count,
        d.view_count,
        u.username as author_username,
        u.full_name as author_name,
        COUNT(DISTINCT i.user_id) as liked_by_similar_users,
        AVG(i.interaction_value) FILTER (WHERE i.interaction_type = 'rate') as avg_rating_by_similar
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       JOIN user_document_interactions i ON d.document_id = i.document_id
       WHERE i.user_id = ANY($1)
         AND d.document_id NOT IN (
           SELECT document_id FROM user_document_interactions 
           WHERE user_id = $2 AND interaction_type IN ('download', 'view', 'bookmark')
         )
         AND d.status = 'approved'
         AND d.is_public = TRUE
       GROUP BY d.document_id, u.user_id
       ORDER BY liked_by_similar_users DESC, avg_rating_by_similar DESC NULLS LAST
       LIMIT $3`,
      [similarUserIds, userId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting collaborative recommendations:', error);
    return [];
  }
};

// Content-based recommendations (similar documents)
const getContentBasedRecommendations = async (documentId, limit = 5) => {
  try {
    const result = await query(
      `WITH current_doc AS (
        SELECT university, subject, author_id
        FROM documents
        WHERE document_id = $1
      )
      SELECT DISTINCT
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.average_rating,
        d.download_count,
        u.username as author_username,
        u.full_name as author_name,
        CASE
          WHEN d.university = cd.university AND d.subject = cd.subject THEN 3
          WHEN d.university = cd.university THEN 2
          WHEN d.subject = cd.subject THEN 2
          WHEN d.author_id = cd.author_id THEN 1
          ELSE 0
        END as similarity_score
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       CROSS JOIN current_doc cd
       WHERE d.document_id != $1
         AND d.status = 'approved'
         AND d.is_public = TRUE
       ORDER BY similarity_score DESC, d.average_rating DESC, d.download_count DESC
       LIMIT $2`,
      [documentId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting content-based recommendations:', error);
    return [];
  }
};

// Get popular documents (fallback)
const getPopularDocuments = async (limit = 10) => {
  try {
    const result = await query(
      `SELECT 
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.average_rating,
        d.download_count,
        d.view_count,
        u.username as author_username,
        u.full_name as author_name
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.status = 'approved' AND d.is_public = TRUE
       ORDER BY 
         (d.download_count * 2 + d.view_count + d.average_rating * 10) DESC,
         d.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting popular documents:', error);
    return [];
  }
};

// Refresh user similarity materialized view (run periodically)
const refreshUserSimilarity = async () => {
  try {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY user_similarity');
    console.log('User similarity view refreshed successfully');
  } catch (error) {
    console.error('Error refreshing user similarity:', error);
  }
};

module.exports = {
  trackInteraction,
  findSimilarUsers,
  getCollaborativeRecommendations,
  getContentBasedRecommendations,
  getPopularDocuments,
  refreshUserSimilarity
};
```

### Step 2: Create Recommendation Controller

**Location:** `backend/src/controllers/recommendationController.js` (NEW FILE)

```javascript
const recommendationService = require('../services/recommendationService');

// Get personalized recommendations for user
const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 10;

    const recommendations = await recommendationService.getCollaborativeRecommendations(
      userId,
      limit
    );

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get similar documents
const getSimilarDocuments = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    const similar = await recommendationService.getContentBasedRecommendations(
      documentId,
      limit
    );

    res.json({
      success: true,
      data: {
        similar,
        count: similar.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Track user interaction (called automatically)
const trackInteraction = async (req, res, next) => {
  try {
    const { documentId, interactionType, interactionValue } = req.body;
    const userId = req.user.user_id;

    await recommendationService.trackInteraction(
      userId,
      documentId,
      interactionType,
      interactionValue
    );

    res.json({
      success: true,
      message: 'Interaction tracked'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getSimilarDocuments,
  trackInteraction
};
```

### Step 3: Update document controller to track interactions

**Location:** `backend/src/controllers/documentController.js`

Add to existing functions:

```javascript
const recommendationService = require('../services/recommendationService');

// In getDocument function, add after incrementing view:
if (req.user) {
  recommendationService.trackInteraction(req.user.user_id, documentId, 'view')
    .catch(err => console.error('Failed to track view:', err));
}

// In downloadDocument function, add after successful download:
recommendationService.trackInteraction(userId, documentId, 'download')
  .catch(err => console.error('Failed to track download:', err));

// In addBookmark function:
recommendationService.trackInteraction(userId, documentId, 'bookmark')
  .catch(err => console.error('Failed to track bookmark:', err));

// In rateDocument function, add interaction value:
recommendationService.trackInteraction(userId, documentId, 'rate', rating)
  .catch(err => console.error('Failed to track rating:', err));
```

### Step 4: Create cron job to refresh similarity

**Location:** `backend/src/jobs/refreshRecommendations.js` (NEW FILE)

```javascript
/**
 * Cron job to refresh recommendation data
 * Run this periodically (e.g., every hour or daily)
 */

const recommendationService = require('../services/recommendationService');

const refreshRecommendationData = async () => {
  console.log('Starting recommendation data refresh...');
  
  try {
    await recommendationService.refreshUserSimilarity();
    console.log('Recommendation data refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh recommendation data:', error);
  }
};

// Run immediately
refreshRecommendationData();

// Schedule to run every 6 hours
setInterval(refreshRecommendationData, 6 * 60 * 60 * 1000);

module.exports = refreshRecommendationData;
```

Add to `app.js`:

```javascript
// Start recommendation refresh job
if (process.env.NODE_ENV === 'production') {
  require('./jobs/refreshRecommendations');
}
```

---

**(Document continues with Modules 6-9...)**

This continuation file is getting long. Should I:
1. Continue adding all remaining modules (6-9) here
2. Create Module 6-9 as a separate Part 3 file
3. Stop here and let you review first?# ShareBuddy Implementation Guide - Part 3
## Modules 6-9 Final Sections

---

## Module 6: Document Preview System (React-PDF + Google Docs Viewer)

### Overview
Allow users to preview PDF documents without downloading, with fallback to Google Docs Viewer.

### Step 1: Install Dependencies

```bash
cd frontend
npm install react-pdf pdfjs-dist
```

### Step 2: Create Preview Service

**Location:** `backend/src/services/previewService.js` (NEW FILE)

```javascript
/**
 * Preview Service - Generate document previews and thumbnails
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const { query } = require('../config/database');

// Generate thumbnail from PDF first page
const generateThumbnail = async (pdfPath, outputPath) => {
  try {
    // Use pdf-thumbnail package or sharp with pdf-image
    const { createCanvas } = require('canvas');
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
    
    const data = await fs.readFile(pdfPath);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    
    // Get first page
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Convert canvas to image and resize
    const buffer = canvas.toBuffer('image/png');
    await sharp(buffer)
      .resize(200, 260, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return false;
  }
};

// Update document with preview URLs
const updatePreviewUrls = async (documentId, previewUrl, thumbnailUrl) => {
  try {
    await query(
      `UPDATE documents 
       SET preview_url = $1, thumbnail_url = $2, updated_at = NOW()
       WHERE document_id = $3`,
      [previewUrl, thumbnailUrl, documentId]
    );
    return true;
  } catch (error) {
    console.error('Error updating preview URLs:', error);
    return false;
  }
};

// Check if PDF is previewable
const isPdfPreviewable = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    // Only preview PDFs under 50MB
    if (fileSizeInMB > 50) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  generateThumbnail,
  updatePreviewUrls,
  isPdfPreviewable
};
```

### Step 3: Update Document Controller for Preview

**Location:** `backend/src/controllers/documentController.js`

Add preview endpoint:

```javascript
const previewService = require('../services/previewService');

// Get document preview
const getDocumentPreview = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const result = await query(
      `SELECT d.*, u.username as author_username
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.document_id = $1`,
      [documentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }
    
    const document = result.rows[0];
    
    // Check if document is public or user has access
    if (!document.is_public && (!req.user || req.user.user_id !== document.user_id)) {
      // Check if user has downloaded
      if (req.user) {
        const downloadCheck = await query(
          `SELECT * FROM downloads 
           WHERE user_id = $1 AND document_id = $2`,
          [req.user.user_id, documentId]
        );
        
        if (downloadCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Bạn cần tải tài liệu để xem preview'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: 'Tài liệu không công khai'
        });
      }
    }
    
    const filePath = path.join(__dirname, '../../uploads', document.file_path);
    const canPreview = await previewService.isPdfPreviewable(filePath);
    
    res.json({
      success: true,
      data: {
        documentId: document.document_id,
        title: document.title,
        author: document.author_username,
        fileUrl: `/api/documents/${documentId}/file`,
        thumbnailUrl: document.thumbnail_url,
        canPreview,
        previewMethod: canPreview ? 'react-pdf' : 'google-docs'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Serve preview file (protected)
const getPreviewFile = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const result = await query(
      'SELECT file_path, file_name, is_public, user_id FROM documents WHERE document_id = $1',
      [documentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }
    
    const document = result.rows[0];
    
    // Same access check as above
    if (!document.is_public && (!req.user || req.user.user_id !== document.user_id)) {
      if (req.user) {
        const downloadCheck = await query(
          'SELECT * FROM downloads WHERE user_id = $1 AND document_id = $2',
          [req.user.user_id, documentId]
        );
        
        if (downloadCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Không có quyền truy cập'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: 'Không có quyền truy cập'
        });
      }
    }
    
    const filePath = path.join(__dirname, '../../uploads', document.file_path);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // ... existing exports
  getDocumentPreview,
  getPreviewFile
};
```

Update routes in `backend/src/routes/documents.js`:

```javascript
// Preview routes
router.get('/:documentId/preview', documentController.getDocumentPreview);
router.get('/:documentId/file', documentController.getPreviewFile);
```

### Step 4: Frontend - Document Preview Component

**Location:** `frontend/src/components/DocumentPreview.tsx` (NEW FILE)

```typescript
import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './DocumentPreview.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DocumentPreviewProps {
  documentId: string;
  canPreview: boolean;
  previewMethod: 'react-pdf' | 'google-docs';
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  documentId,
  canPreview,
  previewMethod
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fileUrl = `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/file`;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Không thể tải preview. Vui lòng tải về để xem.');
    setLoading(false);
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  if (!canPreview || previewMethod === 'google-docs') {
    // Fallback to Google Docs Viewer
    return (
      <div className="preview-container">
        <div className="google-docs-viewer">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
            width="100%"
            height="800px"
            title="Document Preview"
            frameBorder="0"
          />
          <p className="preview-notice">
            Preview được cung cấp bởi Google Docs Viewer
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container">
      {loading && (
        <div className="preview-loading">
          <div className="spinner"></div>
          <p>Đang tải preview...</p>
        </div>
      )}

      {error && (
        <div className="preview-error">
          <p>{error}</p>
        </div>
      )}

      {!error && (
        <>
          <div className="preview-controls">
            <div className="page-controls">
              <button
                onClick={goToPreviousPage}
                disabled={pageNumber <= 1}
                className="btn-control"
              >
                ← Trang trước
              </button>
              <span className="page-info">
                Trang {pageNumber} / {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="btn-control"
              >
                Trang sau →
              </button>
            </div>

            <div className="zoom-controls">
              <button onClick={zoomOut} className="btn-control">
                -
              </button>
              <span className="zoom-level">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="btn-control">
                +
              </button>
            </div>
          </div>

          <div className="pdf-viewer">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div>Đang tải tài liệu...</div>}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentPreview;
```

**Location:** `frontend/src/components/DocumentPreview.css` (NEW FILE)

```css
.preview-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.preview-error {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
}

.preview-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.page-controls,
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-control {
  padding: 8px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-control:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #999;
}

.btn-control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info,
.zoom-level {
  font-weight: 500;
  color: #495057;
}

.pdf-viewer {
  display: flex;
  justify-content: center;
  background: #525659;
  padding: 20px;
  border-radius: 8px;
  overflow: auto;
}

.google-docs-viewer {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.preview-notice {
  text-align: center;
  padding: 10px;
  color: #6c757d;
  font-size: 14px;
}
```

---

## Module 7: Verified Author System

### Overview
Allow authors to request verified badge after meeting requirements.

### Step 1: Create Verified Author Controller

**Location:** `backend/src/controllers/verifiedAuthorController.js` (NEW FILE)

```javascript
/**
 * Verified Author Controller - Handle verification requests
 */

const { query, withTransaction } = require('../config/database');
const emailService = require('../services/emailService');

// Check if user meets requirements
const checkEligibility = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    
    const result = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'approved') as approved_docs,
        AVG(average_rating) FILTER (WHERE status = 'approved') as avg_rating,
        SUM(download_count) FILTER (WHERE status = 'approved') as total_downloads
       FROM documents
       WHERE user_id = $1`,
      [userId]
    );
    
    const stats = result.rows[0];
    const approvedDocs = parseInt(stats.approved_docs);
    const avgRating = parseFloat(stats.avg_rating) || 0;
    const totalDownloads = parseInt(stats.total_downloads) || 0;
    
    // Requirements: 10+ approved docs, 4.0+ rating, 100+ downloads
    const meetsRequirements = approvedDocs >= 10 && avgRating >= 4.0 && totalDownloads >= 100;
    
    res.json({
      success: true,
      data: {
        eligible: meetsRequirements,
        stats: {
          approvedDocuments: approvedDocs,
          averageRating: avgRating.toFixed(2),
          totalDownloads: totalDownloads
        },
        requirements: {
          minimumDocuments: 10,
          minimumRating: 4.0,
          minimumDownloads: 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Submit verification request
const submitRequest = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { reason } = req.body;
    
    // Check if already verified
    const userResult = await query(
      'SELECT is_verified_author FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows[0].is_verified_author) {
      return res.status(400).json({
        success: false,
        error: 'Bạn đã là tác giả được xác minh'
      });
    }
    
    // Check for pending request
    const pendingResult = await query(
      `SELECT * FROM verified_author_requests 
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );
    
    if (pendingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bạn đã có yêu cầu đang chờ xử lý'
      });
    }
    
    // Check eligibility
    const statsResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'approved') as approved_docs,
        AVG(average_rating) FILTER (WHERE status = 'approved') as avg_rating,
        SUM(download_count) FILTER (WHERE status = 'approved') as total_downloads
       FROM documents
       WHERE user_id = $1`,
      [userId]
    );
    
    const stats = statsResult.rows[0];
    const approvedDocs = parseInt(stats.approved_docs);
    const avgRating = parseFloat(stats.avg_rating) || 0;
    const totalDownloads = parseInt(stats.total_downloads) || 0;
    
    if (approvedDocs < 10 || avgRating < 4.0 || totalDownloads < 100) {
      return res.status(400).json({
        success: false,
        error: 'Bạn chưa đủ điều kiện để yêu cầu xác minh',
        stats: {
          approvedDocuments: approvedDocs,
          averageRating: avgRating.toFixed(2),
          totalDownloads: totalDownloads
        }
      });
    }
    
    // Create request
    await query(
      `INSERT INTO verified_author_requests (user_id, reason)
       VALUES ($1, $2)`,
      [userId, reason]
    );
    
    res.json({
      success: true,
      message: 'Yêu cầu xác minh đã được gửi. Chúng tôi sẽ xem xét trong vòng 3-5 ngày.'
    });
  } catch (error) {
    next(error);
  }
};

// Get user's request status
const getRequestStatus = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    
    const result = await query(
      `SELECT * FROM verified_author_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: { hasRequest: false }
      });
    }
    
    const request = result.rows[0];
    
    res.json({
      success: true,
      data: {
        hasRequest: true,
        status: request.status,
        reason: request.reason,
        adminNotes: request.admin_notes,
        createdAt: request.created_at,
        reviewedAt: request.reviewed_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// [ADMIN] Get all pending requests
const getPendingRequests = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập'
      });
    }
    
    const result = await query(
      `SELECT 
        r.*,
        u.username,
        u.full_name,
        u.email,
        u.avatar_url,
        COUNT(DISTINCT d.document_id) as document_count,
        AVG(d.average_rating) as avg_rating,
        SUM(d.download_count) as total_downloads
       FROM verified_author_requests r
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN documents d ON u.user_id = d.user_id AND d.status = 'approved'
       WHERE r.status = 'pending'
       GROUP BY r.request_id, u.user_id
       ORDER BY r.created_at ASC`
    );
    
    res.json({
      success: true,
      data: {
        requests: result.rows.map(r => ({
          requestId: r.request_id,
          user: {
            userId: r.user_id,
            username: r.username,
            fullName: r.full_name,
            email: r.email,
            avatar: r.avatar_url
          },
          reason: r.reason,
          stats: {
            documentCount: parseInt(r.document_count),
            averageRating: parseFloat(r.avg_rating).toFixed(2),
            totalDownloads: parseInt(r.total_downloads)
          },
          createdAt: r.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// [ADMIN] Review request
const reviewRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập'
      });
    }
    
    const { requestId } = req.params;
    const { approved, adminNotes } = req.body;
    const status = approved ? 'approved' : 'rejected';
    
    await withTransaction(async (client) => {
      // Get request details
      const requestResult = await client.query(
        `SELECT r.*, u.email, u.full_name
         FROM verified_author_requests r
         JOIN users u ON r.user_id = u.user_id
         WHERE r.request_id = $1`,
        [requestId]
      );
      
      if (requestResult.rows.length === 0) {
        throw new Error('Yêu cầu không tồn tại');
      }
      
      const request = requestResult.rows[0];
      
      // Update request
      await client.query(
        `UPDATE verified_author_requests
         SET status = $1, admin_notes = $2, reviewed_at = NOW(), reviewed_by = $3
         WHERE request_id = $4`,
        [status, adminNotes, req.user.user_id, requestId]
      );
      
      // If approved, update user
      if (approved) {
        await client.query(
          'UPDATE users SET is_verified_author = TRUE WHERE user_id = $1',
          [request.user_id]
        );
      }
      
      // Send notification email
      await emailService.sendVerifiedAuthorNotification(
        request.email,
        request.full_name,
        approved,
        adminNotes
      );
    });
    
    res.json({
      success: true,
      message: `Yêu cầu đã được ${approved ? 'chấp thuận' : 'từ chối'}`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkEligibility,
  submitRequest,
  getRequestStatus,
  getPendingRequests,
  reviewRequest
};
```

### Step 2: Create Routes

**Location:** `backend/src/routes/verifiedAuthor.js` (NEW FILE)

```javascript
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const verifiedAuthorController = require('../controllers/verifiedAuthorController');
const { authenticate } = require('../middleware/auth');

// Check eligibility
router.get('/eligibility', authenticate, verifiedAuthorController.checkEligibility);

// Submit verification request
router.post('/request',
  authenticate,
  [
    body('reason').trim().isLength({ min: 50, max: 1000 })
      .withMessage('Lý do phải từ 50-1000 ký tự')
  ],
  verifiedAuthorController.submitRequest
);

// Get request status
router.get('/status', authenticate, verifiedAuthorController.getRequestStatus);

// Admin routes
router.get('/admin/pending', authenticate, verifiedAuthorController.getPendingRequests);
router.post('/admin/review/:requestId',
  authenticate,
  [
    body('approved').isBoolean().withMessage('Approved phải là boolean'),
    body('adminNotes').optional().trim().isLength({ max: 500 })
  ],
  verifiedAuthorController.reviewRequest
);

module.exports = router;
```

Add to `app.js`:

```javascript
const verifiedAuthorRoutes = require('./routes/verifiedAuthor');
app.use('/api/verified-author', verifiedAuthorRoutes);
```

---

## Module 8: PostgreSQL Full-Text Search

### Overview
Implement fast and accurate search using PostgreSQL's built-in full-text search capabilities.

### Step 1: Update Document Controller with Search

**Location:** `backend/src/controllers/documentController.js`

Add search function:

```javascript
// Full-text search
const searchDocuments = async (req, res, next) => {
  try {
    const { q, university, subject, minRating, sortBy } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự'
      });
    }
    
    // Build search query
    const searchTerm = q.trim().split(' ').join(' & '); // AND search
    let whereConditions = ['d.status = $1', "d.search_vector @@ to_tsquery('english', $2)"];
    let params = ['approved', searchTerm];
    let paramIndex = 3;
    
    if (university) {
      whereConditions.push(`d.university = $${paramIndex}`);
      params.push(university);
      paramIndex++;
    }
    
    if (subject) {
      whereConditions.push(`d.subject = $${paramIndex}`);
      params.push(subject);
      paramIndex++;
    }
    
    if (minRating) {
      whereConditions.push(`d.average_rating >= $${paramIndex}`);
      params.push(parseFloat(minRating));
      paramIndex++;
    }
    
    // Sort order
    let orderClause = "ts_rank(d.search_vector, to_tsquery('english', $2)) DESC, d.created_at DESC";
    if (sortBy === 'downloads') {
      orderClause = 'd.download_count DESC';
    } else if (sortBy === 'rating') {
      orderClause = 'd.average_rating DESC, d.download_count DESC';
    } else if (sortBy === 'newest') {
      orderClause = 'd.created_at DESC';
    }
    
    params.push(limit, offset);
    
    const result = await query(
      `SELECT 
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.file_type,
        d.file_size,
        d.thumbnail_url,
        d.average_rating,
        d.download_count,
        d.view_count,
        d.created_at,
        u.username as author_username,
        u.full_name as author_name,
        u.is_verified_author,
        ts_rank(d.search_vector, to_tsquery('english', $2)) as relevance,
        ts_headline('english', d.title || ' ' || d.description, to_tsquery('english', $2),
          'MaxWords=50, MinWords=20') as highlight
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );
    
    const countResult = await query(
      `SELECT COUNT(*) FROM documents d
       WHERE ${whereConditions.join(' AND ')}`,
      params.slice(0, -2)
    );
    
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        documents: result.rows.map(doc => ({
          id: doc.document_id,
          title: doc.title,
          description: doc.description,
          highlight: doc.highlight,
          university: doc.university,
          subject: doc.subject,
          fileType: doc.file_type,
          fileSize: doc.file_size,
          thumbnail: doc.thumbnail_url,
          rating: parseFloat(doc.average_rating),
          downloads: doc.download_count,
          views: doc.view_count,
          relevance: parseFloat(doc.relevance),
          author: {
            username: doc.author_username,
            name: doc.author_name,
            isVerified: doc.is_verified_author
          },
          createdAt: doc.created_at
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        },
        searchQuery: q
      }
    });
  } catch (error) {
    next(error);
  }
};

// Search suggestions (autocomplete)
const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }
    
    const searchTerm = `${q.trim()}:*`; // Prefix search
    
    const result = await query(
      `SELECT DISTINCT title, download_count
       FROM documents
       WHERE status = 'approved'
         AND search_vector @@ to_tsquery('english', $1)
       ORDER BY download_count DESC
       LIMIT 10`,
      [searchTerm]
    );
    
    res.json({
      success: true,
      data: {
        suggestions: result.rows.map(r => r.title)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // ... existing exports
  searchDocuments,
  getSearchSuggestions
};
```

Update routes in `backend/src/routes/documents.js`:

```javascript
// Search routes
router.get('/search', documentController.searchDocuments);
router.get('/search/suggestions', documentController.getSearchSuggestions);
```

### Step 2: Frontend Search Component

**Location:** `frontend/src/components/SearchBar.tsx`

Update with autocomplete:

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import documentService from '../services/documentService';
import './SearchBar.css';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await documentService.getSearchSuggestions(query);
        setSuggestions(response.data.suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    setShowSuggestions(false);
  };

  return (
    <div className="search-bar-wrapper" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm tài liệu, môn học, trường..."
          className="search-input"
        />
        <button type="submit" className="search-button">
          🔍 Tìm kiếm
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              🔍 {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
```

---

## Module 9: Swagger API Documentation

### Overview
Generate interactive API documentation using Swagger/OpenAPI.

### Step 1: Install Swagger Dependencies

```bash
cd backend
npm install swagger-jsdoc swagger-ui-express
```

### Step 2: Create Swagger Configuration

**Location:** `backend/src/config/swagger.js` (NEW FILE)

```javascript
/**
 * Swagger API Documentation Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShareBuddy API Documentation',
      version: '1.0.0',
      description: 'Comprehensive API documentation for ShareBuddy document sharing platform',
      contact: {
        name: 'ShareBuddy Support',
        email: 'support@sharebuddy.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.sharebuddy.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        Document: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            title: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            university: {
              type: 'string'
            },
            subject: {
              type: 'string'
            },
            fileType: {
              type: 'string'
            },
            fileSize: {
              type: 'integer'
            },
            price: {
              type: 'integer'
            },
            isPublic: {
              type: 'boolean'
            },
            rating: {
              type: 'number',
              format: 'float'
            },
            downloads: {
              type: 'integer'
            },
            views: {
              type: 'integer'
            },
            author: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                name: { type: 'string' },
                isVerified: { type: 'boolean' }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid'
            },
            username: {
              type: 'string'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            fullName: {
              type: 'string'
            },
            credits: {
              type: 'integer'
            },
            isVerifiedAuthor: {
              type: 'boolean'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'] // Path to API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
```

### Step 3: Add Swagger to app.js

**Location:** `backend/src/app.js`

Add Swagger middleware:

```javascript
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ShareBuddy API Docs'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
```

### Step 4: Add JSDoc Comments to Routes

**Example:** `backend/src/routes/auth.js`

```javascript
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', [...], authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', [...], authController.login);
```

**Example:** `backend/src/routes/documents.js`

```javascript
/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get all documents with filtering and pagination
 *     tags: [Documents]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: university
 *         schema:
 *           type: string
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, popular, rating]
 *     responses:
 *       200:
 *         description: List of documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     documents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Document'
 *                     pagination:
 *                       type: object
 */
router.get('/', documentController.getAllDocuments);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     summary: Get single document by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document details
 *       404:
 *         description: Document not found
 */
router.get('/:documentId', documentController.getDocument);

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Upload a new document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - file
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               university:
 *                 type: string
 *               subject:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *               price:
 *                 type: integer
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', authenticate, upload.single('file'), documentController.uploadDocument);
```

### Step 5: Access Documentation

After starting the server, access Swagger UI at:
- Local: `http://localhost:5000/api-docs`
- Production: `https://api.sharebuddy.com/api-docs`

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review all code samples in this guide
- [ ] Ensure all environment variables are configured
- [ ] Backup existing database
- [ ] Test database migration script on development environment

### Module 1: Email System
- [ ] Configure Gmail App Password
- [ ] Run database migration (email verification columns)
- [ ] Create/update `emailService.js`
- [ ] Update `authController.js` with email verification
- [ ] Create frontend `VerifyEmailPage.tsx`
- [ ] Create frontend `ResetPasswordPage.tsx`
- [ ] Test email sending
- [ ] Test verification flow
- [ ] Test password reset flow

### Module 2: OAuth Authentication
- [ ] Set up Google Cloud Console project
- [ ] Configure Google OAuth 2.0 credentials
- [ ] Set up Facebook Developer App
- [ ] Configure Facebook Login
- [ ] Install passport packages
- [ ] Create `passport.js` configuration
- [ ] Update `authController.js` with OAuth methods
- [ ] Update `app.js` with session middleware
- [ ] Create `OAuthSuccessPage.tsx`
- [ ] Update `LoginPage.tsx` with OAuth buttons
- [ ] Test Google OAuth flow
- [ ] Test Facebook OAuth flow
- [ ] Test account merging

### Module 3: Stripe Payment
- [ ] Create Stripe account
- [ ] Get API keys (test mode)
- [ ] Configure webhook endpoint
- [ ] Install stripe package
- [ ] Create `stripeService.js`
- [ ] Create `paymentController.js`
- [ ] Create payment routes
- [ ] Update `app.js` for webhook raw body
- [ ] Test payment creation
- [ ] Test webhook handling
- [ ] Test credit addition
- [ ] Switch to live mode when ready

### Module 4: Q&A System
- [ ] Run database migration (Q&A tables)
- [ ] Create `questionController.js`
- [ ] Create question routes
- [ ] Test question creation
- [ ] Test answer creation
- [ ] Test voting system
- [ ] Test accepted answer feature
- [ ] Frontend Q&A components (if needed)

### Module 5: Collaborative Filtering
- [ ] Run database migration (interaction tables)
- [ ] Create `recommendationService.js`
- [ ] Create `recommendationController.js`
- [ ] Update `documentController.js` with tracking
- [ ] Create recommendation cron job
- [ ] Test interaction tracking
- [ ] Test recommendation generation
- [ ] Refresh materialized view
- [ ] Monitor performance

### Module 6: Document Preview
- [ ] Install react-pdf and dependencies
- [ ] Create `previewService.js`
- [ ] Update `documentController.js` with preview endpoints
- [ ] Create `DocumentPreview.tsx` component
- [ ] Test PDF preview (React-PDF)
- [ ] Test Google Docs fallback
- [ ] Test access control
- [ ] Generate thumbnails (optional)

### Module 7: Verified Author
- [ ] Run database migration (verified author tables)
- [ ] Create `verifiedAuthorController.js`
- [ ] Create verified author routes
- [ ] Test eligibility check
- [ ] Test request submission
- [ ] Test admin review
- [ ] Test email notifications
- [ ] Frontend verification badge display

### Module 8: Full-Text Search
- [ ] Run database migration (search_vector column)
- [ ] Update `documentController.js` with search
- [ ] Test search functionality
- [ ] Test search ranking
- [ ] Update `SearchBar.tsx` with autocomplete
- [ ] Test suggestions
- [ ] Optimize search performance
- [ ] Add search filters

### Module 9: Swagger Documentation
- [ ] Install swagger packages
- [ ] Create `swagger.js` configuration
- [ ] Update `app.js` with Swagger UI
- [ ] Add JSDoc comments to auth routes
- [ ] Add JSDoc comments to document routes
- [ ] Add JSDoc comments to other routes
- [ ] Test Swagger UI interface
- [ ] Review and refine documentation

### Post-Implementation
- [ ] Run full regression testing
- [ ] Update user documentation
- [ ] Update CHANGELOG.md
- [ ] Deploy to staging environment
- [ ] Conduct user acceptance testing
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Gather user feedback

---

## Testing Guidelines

### Unit Testing
Test individual functions:
```bash
npm test
```

### Integration Testing
Test API endpoints with Postman or similar tools.

### E2E Testing
Test complete user flows:
1. Registration → Email Verification → Login
2. OAuth Login → Account Creation
3. Purchase Credits → Upload Document
4. Search → Preview → Download
5. Ask Question → Receive Answer → Accept Answer
6. Request Verified Badge → Admin Approval

---

## Performance Optimization

### Database
- Ensure all indexes are created (check migration script)
- Refresh materialized views regularly
- Monitor query performance with `EXPLAIN ANALYZE`

### File Storage
- Consider moving uploads to cloud storage (AWS S3, Google Cloud Storage)
- Implement CDN for document downloads

### Caching
- Add Redis caching for frequently accessed data
- Cache recommendation results

### Load Balancing
- Use PM2 or similar for Node.js clustering
- Set up nginx reverse proxy

---

## Security Checklist

- [ ] All user inputs are validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized outputs)
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] JWT tokens properly secured
- [ ] File uploads validated (type, size)
- [ ] Stripe webhook signatures verified
- [ ] OAuth tokens encrypted in database
- [ ] Sensitive data not logged
- [ ] HTTPS enforced in production
- [ ] Environment variables secured

---

## Troubleshooting

### Email Not Sending
- Check EMAIL_USER and EMAIL_PASSWORD
- Verify Gmail App Password is correct
- Check firewall/network settings
- Review error logs

### OAuth Redirect Issues
- Verify callback URLs match exactly
- Check OAuth client IDs and secrets
- Ensure session middleware is configured
- Review browser console for errors

### Stripe Webhook Not Working
- Verify webhook secret
- Check webhook endpoint is accessible
- Test with Stripe CLI: `stripe listen --forward-to localhost:5000/api/payments/webhook`
- Review Stripe dashboard logs

### Search Not Working
- Ensure migration created search_vector column
- Verify trigger function is active
- Refresh search vectors: `UPDATE documents SET search_vector = to_tsvector('english', title || ' ' || description)`
- Check PostgreSQL version supports full-text search

### Recommendations Not Showing
- Refresh materialized view: `REFRESH MATERIALIZED VIEW user_similarity`
- Ensure interaction tracking is working
- Check if enough user data exists
- Review recommendation service logs

---

## Maintenance Tasks

### Daily
- Monitor error logs
- Check Stripe webhook delivery
- Review user feedback

### Weekly
- Refresh recommendation materialized views
- Review pending verified author requests
- Analyze search queries for improvements

### Monthly
- Database vacuum and analyze
- Review and archive old logs
- Update dependencies
- Security audit

---

## Conclusion

This comprehensive implementation guide covers all 9 modules needed to complete ShareBuddy platform:

1. ✅ Email System (verification, password reset)
2. ✅ OAuth Authentication (Google + Facebook)
3. ✅ Stripe Payment Integration
4. ✅ Q&A System (questions, answers, voting)
5. ✅ Collaborative Filtering Recommendations
6. ✅ Document Preview (React-PDF + Google Docs)
7. ✅ Verified Author System
8. ✅ PostgreSQL Full-Text Search
9. ✅ Swagger API Documentation

Each module is designed to be implemented independently, allowing for iterative development and testing. Follow the checklists carefully, test thoroughly, and deploy with confidence.

**Estimated Total Implementation Time:**
- Backend: 40-60 hours
- Frontend: 30-40 hours
- Testing: 20-30 hours
- Total: 90-130 hours (2-3 weeks full-time)

**Priority Order:**
1. Email System (critical for user management)
2. OAuth Authentication (improves UX)
3. Full-Text Search (core feature)
4. Document Preview (core feature)
5. Payment System (monetization)
6. Q&A System (community engagement)
7. Recommendations (engagement)
8. Verified Author (trust building)
9. Swagger Docs (developer experience)

---

**END OF IMPLEMENTATION GUIDE**

For questions or issues, refer to:
- System specification: `/docs/Đặc tả hệ thống.html`
- Database design: `/docs/database-design/`
- CHANGELOG: `/docs/CHANGELOG.md`
