# Module 1 & 2 Implementation - Testing Guide

## ✅ Completed Implementation

### Module 1: Email System
- ✅ Email service (emailService.js)
- ✅ Token utilities (tokenUtils.js)
- ✅ Config updates (config.js, .env.example)
- ✅ Auth controller updates (verification, password reset)
- ✅ Frontend pages (VerifyEmail, ForgotPassword, ResetPassword)

### Module 2: OAuth Authentication
- ✅ Passport.js configuration (Google + Facebook strategies)
- ✅ OAuth functions in authController
- ✅ Session middleware in app.js
- ✅ Frontend OAuth buttons in LoginPage
- ✅ OAuthSuccessPage for redirect handling

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

```bash
cd /Users/caoducanh/Coding/ShareBuddy

# Check database connection
psql -d sharebuddy_db -c "SELECT version();"

# Run migration
psql -d sharebuddy_db -f docs/database-design/migration_001_add_missing_features.sql
```

Expected output:
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
...
CREATE TABLE
CREATE INDEX
```

### Step 2: Configure Gmail for Email Service

1. Go to Google Account: https://myaccount.google.com/apppasswords
2. Create "App Password" for Mail
3. Copy the 16-character password

Update `backend/.env`:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

### Step 3: Configure Google OAuth

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5001/api/auth/google/callback`
5. Copy Client ID and Client Secret

Update `backend/.env`:
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
```

### Step 4: Configure Facebook OAuth

1. Go to Facebook Developers: https://developers.facebook.com/
2. Create new app or select existing
3. Add "Facebook Login" product
4. Settings → Basic:
   - Copy App ID and App Secret
5. Facebook Login → Settings:
   - Valid OAuth Redirect URIs: `http://localhost:5001/api/auth/facebook/callback`

Update `backend/.env`:
```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5001/api/auth/facebook/callback
```

### Step 5: Start Backend Server

```bash
cd backend
npm install  # Install express-session if needed
npm start
```

Expected output:
```
✅ Database connected successfully
🚀 ShareBuddy server running on port 5001
```

### Step 6: Start Frontend

```bash
cd frontend
npm start
```

---

## 🧪 Testing Module 1: Email System

### Test 1: User Registration with Email Verification

1. Navigate to: http://localhost:3000/register
2. Fill in registration form:
   - Email: your-test-email@gmail.com
   - Username: testuser123
   - Password: password123
   - Full Name: Test User
3. Click "Đăng ký"
4. Check terminal logs for email sending
5. Check your email inbox for verification email
6. Click verification link in email
7. Should redirect to success page

**Expected Results:**
- ✅ User created in database
- ✅ Email verification token generated
- ✅ Verification email sent
- ✅ 10 welcome credits added
- ✅ Email opens with styled HTML template

### Test 2: Email Verification

1. Copy token from email link: `/verify-email?token=...`
2. Navigate to the link
3. Should see success message
4. User's `email_verified` should be TRUE in database

**Database Check:**
```sql
SELECT email, email_verified, email_verification_token 
FROM users 
WHERE email = 'your-test-email@gmail.com';
```

### Test 3: Forgot Password Flow

1. Navigate to: http://localhost:3000/login
2. Click "Quên mật khẩu?"
3. Enter your email
4. Click "Gửi email đặt lại mật khẩu"
5. Check email for password reset link
6. Click link to reset password page
7. Enter new password
8. Click "Đặt lại mật khẩu"
9. Try logging in with new password

**Expected Results:**
- ✅ Password reset email sent
- ✅ Token expires in 1 hour
- ✅ Password successfully reset
- ✅ Can login with new password

---

## 🧪 Testing Module 2: OAuth Authentication

### Test 1: Google OAuth Login

1. Navigate to: http://localhost:3000/login
2. Click "Đăng nhập với Google" button
3. Should redirect to Google login page
4. Select Google account
5. Grant permissions
6. Should redirect back to `/oauth-success?token=...`
7. Should auto-redirect to dashboard

**Expected Results:**
- ✅ Redirects to Google OAuth consent screen
- ✅ Creates new user if doesn't exist
- ✅ Links Google account if email exists
- ✅ Stores OAuth token in `oauth_tokens` table
- ✅ Returns JWT token
- ✅ Redirects to dashboard

**Database Check:**
```sql
-- Check user was created with Google ID
SELECT user_id, email, username, google_id, email_verified 
FROM users 
WHERE google_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;

-- Check OAuth token stored
SELECT * FROM oauth_tokens 
WHERE provider = 'google' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Test 2: Facebook OAuth Login

1. Navigate to: http://localhost:3000/login
2. Click "Đăng nhập với Facebook" button
3. Should redirect to Facebook login page
4. Enter Facebook credentials
5. Grant permissions
6. Should redirect back with token

**Expected Results:**
- ✅ Redirects to Facebook login
- ✅ Creates new user or links existing
- ✅ Stores Facebook OAuth token
- ✅ User logged in successfully

### Test 3: OAuth Account Merging

**Scenario:** User registers with email, then logs in with Google using same email

1. Register normally: testmerge@gmail.com
2. Logout
3. Click "Đăng nhập với Google"
4. Select Google account with testmerge@gmail.com
5. Should link Google ID to existing account

**Database Check:**
```sql
SELECT user_id, email, google_id, facebook_id 
FROM users 
WHERE email = 'testmerge@gmail.com';
```

Should show:
- ✅ Same user_id
- ✅ google_id now populated
- ✅ Single user account (no duplicate)

---

## 🔍 Debugging

### Backend Logs to Monitor

```bash
# Terminal output should show:
✅ Database connected successfully
🚀 ShareBuddy server running on port 5001

# When OAuth login happens:
Google OAuth strategy executed
User created/found: { user_id: '...', email: '...' }
OAuth token stored

# When email sent:
Email sent successfully to: user@example.com
```

### Common Issues

#### Issue 1: "Email not sent"
**Solution:**
- Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Verify Gmail App Password is correct (16 characters)
- Check if "Less secure app access" is enabled (if using old method)

#### Issue 2: "Google OAuth fails"
**Solution:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Check redirect URI matches exactly in Google Console
- Ensure Google+ API is enabled

#### Issue 3: "Session not working"
**Solution:**
- Check `SESSION_SECRET` is set in `.env`
- Verify express-session is installed: `npm list express-session`
- Clear browser cookies and try again

#### Issue 4: "Database error when registering"
**Solution:**
- Run migration script if not done yet
- Check columns exist: `\d users` in psql
- Verify `email_verification_token`, `google_id`, `facebook_id` columns exist

---

## ✅ Success Criteria

### Module 1 Complete When:
- [ ] User can register and receive verification email
- [ ] Verification link works and marks email as verified
- [ ] Forgot password sends reset email
- [ ] Password reset works with token
- [ ] Welcome email sent after verification
- [ ] All emails have proper HTML styling

### Module 2 Complete When:
- [ ] Google OAuth login creates/links account
- [ ] Facebook OAuth login creates/links account
- [ ] OAuth tokens stored in database
- [ ] Account merging works (same email)
- [ ] User redirected to dashboard after OAuth
- [ ] JWT token generated and stored

---

## 📊 Database Verification Queries

```sql
-- Check email verification columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('email_verified', 'email_verification_token', 'email_verification_expires', 
                       'password_reset_token', 'password_reset_expires', 'google_id', 'facebook_id');

-- Check OAuth tokens table
SELECT * FROM oauth_tokens ORDER BY created_at DESC LIMIT 5;

-- Check users with OAuth
SELECT user_id, email, username, google_id, facebook_id, email_verified 
FROM users 
WHERE google_id IS NOT NULL OR facebook_id IS NOT NULL;

-- Check credit transactions for welcome bonus
SELECT * FROM credit_transactions 
WHERE transaction_type = 'bonus' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🎯 Next Steps

After verifying both modules work:

1. Update `.env.example` with new variables
2. Test error cases (expired tokens, invalid emails)
3. Test rate limiting on email sending
4. Add unit tests for email service
5. Add integration tests for OAuth flow
6. Move on to Module 3: Stripe Payment Integration

---

## 📝 Environment Variables Checklist

Make sure your `backend/.env` has:

```env
# Email (Module 1)
✅ EMAIL_USER=your-email@gmail.com
✅ EMAIL_PASSWORD=your-app-password
✅ EMAIL_FROM=ShareBuddy <noreply@sharebuddy.com>
✅ EMAIL_VERIFICATION_EXPIRES=24h
✅ PASSWORD_RESET_EXPIRES=1h

# Google OAuth (Module 2)
✅ GOOGLE_CLIENT_ID=...apps.googleusercontent.com
✅ GOOGLE_CLIENT_SECRET=...
✅ GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# Facebook OAuth (Module 2)
✅ FACEBOOK_APP_ID=...
✅ FACEBOOK_APP_SECRET=...
✅ FACEBOOK_CALLBACK_URL=http://localhost:5001/api/auth/facebook/callback

# Session (Module 2)
✅ SESSION_SECRET=your-session-secret-change-in-production

# Frontend
✅ FRONTEND_URL=http://localhost:3000
```

---

**Ready to test!** 🚀

Follow the steps above and verify each test case passes. Report any issues in the terminal output or browser console.
