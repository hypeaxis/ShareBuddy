# ShareBuddy Testing Guide

## Mục lục
1. [Setup Testing Environment](#setup-testing-environment)
2. [Module 1: Email System](#module-1-email-system)
3. [Module 2: OAuth Authentication](#module-2-oauth-authentication)
4. [Module 3: Payment System](#module-3-payment-system)
5. [Module 4: Q&A System](#module-4-qa-system)
6. [Module 5: Recommendation System](#module-5-recommendation-system)
7. [Module 6: Document Preview](#module-6-document-preview)
8. [Module 7: Verified Author](#module-7-verified-author)
9. [Module 8: Full-Text Search](#module-8-full-text-search)
10. [Core Features Testing](#core-features-testing)
11. [Integration Testing](#integration-testing)
12. [Performance Testing](#performance-testing)

---

## Setup Testing Environment

### 1. Database Setup
```bash
# Tạo test database
createdb sharebuddy_test_db

# Run migrations
psql -d sharebuddy_test_db -f docs/database-design/migration_001_initial_setup.sql
psql -d sharebuddy_test_db -f docs/database-design/migration_002_fix_missing_columns.sql
psql -d sharebuddy_test_db -f docs/database-design/sample_data.sql
```

### 2. Backend Configuration
Đảm bảo `.env` có đầy đủ:
- Database credentials
- Gmail App Password
- Stripe Test Keys (get from https://dashboard.stripe.com/test/apikeys)
- OAuth credentials (optional)

### 3. Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 4. Testing Tools
- **Manual Testing**: Browser DevTools, Postman/Insomnia
- **Database Inspection**: pgAdmin, psql CLI
- **Email Testing**: Gmail inbox hoặc Mailtrap (development)
- **Payment Testing**: Stripe Dashboard (test mode)
- **Network Monitoring**: Browser Network tab

---

## Module 1: Email System

### Test Cases

#### 1.1 Email Verification
**Mục đích**: Verify email khi đăng ký account mới

**Steps**:
1. Đăng ký account mới tại `/register`
   - Email: `test@example.com`
   - Password: `Test123!@#`
   - Full name: `Test User`
2. Check email inbox (hoặc console logs nếu dev mode)
3. Click verification link trong email
4. Verify redirect về login page với success message

**Expected Result**:
- ✅ Email sent successfully (check backend logs)
- ✅ Email contains verification link
- ✅ Link format: `http://localhost:3000/verify-email?token=...`
- ✅ Click link → email_verified = true trong DB
- ✅ Success message hiển thị

**Database Check**:
```sql
SELECT user_id, email, email_verified, verification_token 
FROM users 
WHERE email = 'test@example.com';
```

#### 1.2 Password Reset Flow
**Steps**:
1. Tại `/forgot-password`, nhập email đã đăng ký
2. Check email inbox
3. Click reset link
4. Nhập password mới tại `/reset-password?token=...`
5. Login với password mới

**Expected Result**:
- ✅ Reset email sent
- ✅ Token valid trong 1h (PASSWORD_RESET_EXPIRES)
- ✅ Password updated thành công
- ✅ Old password không còn hoạt động

**Database Check**:
```sql
SELECT reset_token, reset_token_expires 
FROM users 
WHERE email = 'test@example.com';
-- After reset, token should be NULL
```

#### 1.3 Welcome Email
**Steps**:
1. Đăng ký account mới
2. Verify email
3. Check inbox for welcome email

**Expected Result**:
- ✅ Welcome email received after verification
- ✅ Email contains branding và useful links

---

## Module 2: OAuth Authentication

### Prerequisites
- Google OAuth Client ID configured
- Facebook App ID configured

### Test Cases

#### 2.1 Google OAuth Login
**Steps**:
1. Tại `/login`, click "Sign in with Google"
2. Redirect to Google OAuth consent screen
3. Select Google account
4. Authorize ShareBuddy
5. Redirect về `/oauth-success`
6. Verify user data trong dashboard

**Expected Result**:
- ✅ Redirect to Google OAuth
- ✅ Callback URL: `http://localhost:5001/api/auth/google/callback`
- ✅ JWT token stored in localStorage
- ✅ User profile created/updated
- ✅ `google_id` populated in database

**Database Check**:
```sql
SELECT user_id, email, google_id, email_verified, full_name 
FROM users 
WHERE google_id IS NOT NULL 
ORDER BY created_at DESC LIMIT 1;
```

#### 2.2 Facebook OAuth Login
**Steps**: Tương tự Google OAuth

**Expected Result**:
- ✅ `facebook_id` populated
- ✅ Profile picture từ Facebook

#### 2.3 OAuth Account Linking
**Steps**:
1. Đăng ký email account: `test@gmail.com`
2. Logout
3. Login with Google using cùng email `test@gmail.com`

**Expected Result**:
- ✅ Link Google account to existing user (không tạo duplicate)
- ✅ Cả email login và Google login đều hoạt động

---

## Module 3: Payment System

### Prerequisites
- Stripe test keys configured
- Webhook endpoint setup: `http://localhost:5001/api/payment/webhook`

### Test Cases

#### 3.1 View Credit Packages
**Steps**:
1. Login vào hệ thống
2. Navigate to `/purchase-credits`
3. View available packages

**Expected Result**:
- ✅ Display all active packages from DB
- ✅ Show prices (USD và VND)
- ✅ Show bonus credits
- ✅ Highlight popular package

**API Test**:
```bash
curl http://localhost:5001/api/payment/packages
```

#### 3.2 Purchase Credits - Successful Payment
**Steps**:
1. Tại `/purchase-credits`, chọn package (e.g., 100 credits)
2. Click "Select Package"
3. Enter test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
4. Click "Pay"
5. Wait for confirmation

**Expected Result**:
- ✅ Payment intent created
- ✅ Stripe processes payment successfully
- ✅ Webhook triggered (`payment_intent.succeeded`)
- ✅ Credits added to user account
- ✅ Notification created
- ✅ Transaction recorded in `payment_transactions`
- ✅ Success message displayed
- ✅ Redirect to dashboard

**Database Check**:
```sql
-- Check credits increased
SELECT user_id, credits FROM users WHERE user_id = 'YOUR_USER_ID';

-- Check transaction recorded
SELECT * FROM payment_transactions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC LIMIT 1;

-- Check notification created
SELECT * FROM notifications 
WHERE user_id = 'YOUR_USER_ID' 
AND type = 'payment_success' 
ORDER BY created_at DESC LIMIT 1;
```

**Stripe Dashboard Check**:
- Navigate to https://dashboard.stripe.com/test/payments
- Verify payment appears with status "Succeeded"

#### 3.3 Failed Payment
**Steps**:
1. Chọn package
2. Enter declined card: `4000 0000 0000 0002`
3. Attempt payment

**Expected Result**:
- ✅ Payment declined by Stripe
- ✅ Webhook triggered (`payment_intent.payment_failed`)
- ✅ Credits NOT added
- ✅ Transaction status = 'failed'
- ✅ Error notification created
- ✅ Error message displayed

#### 3.4 Payment History
**Steps**:
1. Navigate to `/payment-history`
2. View transaction list

**Expected Result**:
- ✅ Display all transactions với pagination
- ✅ Show status badges (completed, pending, failed)
- ✅ Show date, amount, credits

**API Test**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5001/api/payment/history?page=1&limit=10
```

#### 3.5 Webhook Testing
**Using Stripe CLI** (recommended):
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5001/api/payment/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

**Expected Result**:
- ✅ Webhook signature verified
- ✅ Events processed correctly
- ✅ Database updated accordingly

---

## Module 4: Q&A System

### Test Cases

#### 4.1 Ask Question
**Steps**:
1. Navigate to document detail page
2. Scroll to Q&A section
3. Click "Ask Question"
4. Enter question: "How to solve exercise 3?"
5. Submit

**Expected Result**:
- ✅ Question created với status 'active'
- ✅ Question appears in list
- ✅ Author notification created

**Database Check**:
```sql
SELECT question_id, content, vote_count, answer_count 
FROM questions 
WHERE document_id = 'DOCUMENT_ID' 
ORDER BY created_at DESC LIMIT 1;
```

#### 4.2 Answer Question
**Steps**:
1. View question detail
2. Click "Answer"
3. Enter answer with detailed explanation
4. Submit

**Expected Result**:
- ✅ Answer created
- ✅ Answer count updated on question
- ✅ Questioner receives notification

#### 4.3 Vote Question/Answer
**Steps**:
1. Upvote a question (click up arrow)
2. Downvote an answer (click down arrow)
3. Try to vote again (should toggle)

**Expected Result**:
- ✅ Vote count updated
- ✅ User can change vote (upvote → downvote)
- ✅ User can remove vote (click again)
- ✅ Cannot vote own question/answer

**Database Check**:
```sql
SELECT * FROM question_votes WHERE user_id = 'YOUR_USER_ID';
SELECT * FROM answer_votes WHERE user_id = 'YOUR_USER_ID';
```

#### 4.4 Best Answer Selection
**Steps** (as document author):
1. View question on your document
2. Review answers
3. Click "Mark as Best Answer" on best answer

**Expected Result**:
- ✅ Only document author can mark best answer
- ✅ Only one best answer per question
- ✅ Best answer badge displayed
- ✅ Answer author gets reputation bonus

---

## Module 5: Recommendation System

### Test Cases

#### 5.1 Track User Interactions
**Steps**:
1. Login và browse documents
2. View document details (interaction = 'view')
3. Download documents (interaction = 'download')
4. Rate documents (interaction = 'rate')
5. Comment (interaction = 'comment')

**Expected Result**:
- ✅ Interactions tracked in `user_interactions`
- ✅ Interaction weight: view=1, download=3, rate=2, comment=2

**Database Check**:
```sql
SELECT * FROM user_interactions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY interaction_date DESC LIMIT 10;
```

#### 5.2 Personalized Recommendations
**Steps**:
1. Login with account có interaction history
2. Navigate to homepage hoặc dashboard
3. View "Recommended for You" section

**Expected Result**:
- ✅ Display documents based on:
  - Similar users' preferences (collaborative filtering)
  - Similar content (content-based)
- ✅ Recommendations change sau khi interact với documents khác

**API Test**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5001/api/recommendations/personalized?limit=10
```

#### 5.3 Similar Documents
**Steps**:
1. View document detail page
2. Check sidebar "Similar Documents"

**Expected Result**:
- ✅ Show documents with similar:
  - Category
  - Subject
  - Tags
- ✅ Maximum 5-10 recommendations

**API Test**:
```bash
curl http://localhost:5001/api/recommendations/similar/DOCUMENT_ID
```

#### 5.4 Popular Documents
**Steps**:
1. View homepage
2. Check "Popular Documents" section

**Expected Result**:
- ✅ Documents sorted by download_count + rating
- ✅ Recent documents (last 30 days) prioritized

---

## Module 6: Document Preview

### Test Cases

#### 6.1 PDF Preview
**Steps**:
1. Upload PDF document
2. Navigate to document detail
3. Click "Preview" button
4. View PDF in browser

**Expected Result**:
- ✅ PDF renders using React-PDF
- ✅ Page navigation works (prev/next)
- ✅ Zoom controls functional
- ✅ Thumbnail generated

**Test Files**: Use sample PDFs từ `docs/test-files/` (nếu có)

#### 6.2 DOCX Preview
**Steps**:
1. Upload DOCX document
2. View preview

**Expected Result**:
- ✅ DOCX converted to PDF server-side
- ✅ Preview generated successfully
- ✅ Preview URL stored in `documents.preview_url`

**Backend Check**:
```bash
ls -la backend/uploads/previews/
# Should contain generated PDF preview
```

#### 6.3 PPTX Preview
**Steps**: Similar to DOCX

**Expected Result**:
- ✅ Each slide converted to image/PDF
- ✅ Slide navigation works

---

## Module 7: Verified Author

### Test Cases

#### 7.1 Submit Verification Request
**Steps** (as regular user):
1. Login với account có ít nhất 10 documents uploaded
2. Navigate to `/verified-author/request`
3. Fill form:
   - Portfolio URL
   - Description (why you deserve verification)
   - Supporting documents
4. Submit request

**Expected Result**:
- ✅ Request created với status 'pending'
- ✅ Admin notification created
- ✅ User can view request status at `/verified-author/my-requests`

**Database Check**:
```sql
SELECT * FROM verified_author_requests 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC LIMIT 1;
```

#### 7.2 Admin Review - Approve
**Steps** (as admin):
1. Login với admin account
2. Navigate to admin panel → Verified Author Requests
3. Click "Review" on pending request
4. Enter admin note: "Approved - High quality documents"
5. Click "Approve"

**Expected Result**:
- ✅ Request status = 'approved'
- ✅ User's `is_verified` = true
- ✅ User receives approval notification
- ✅ Verified badge shows on user profile
- ✅ Credit rewards increased (multiplier = 1.5)

**Database Check**:
```sql
SELECT user_id, is_verified FROM users WHERE user_id = 'APPROVED_USER_ID';

SELECT * FROM verified_author_requests 
WHERE request_id = 'REQUEST_ID';
```

#### 7.3 Admin Review - Reject
**Steps**: Similar to approve, but click "Reject"

**Expected Result**:
- ✅ Request status = 'rejected'
- ✅ User receives rejection notification with reason
- ✅ User can submit new request after 30 days

#### 7.4 Verified Author Benefits
**Steps**:
1. Login as verified author
2. Upload document
3. Document gets downloaded by another user

**Expected Result**:
- ✅ Credit reward = base_reward × 1.5
- ✅ Verified badge shown on documents
- ✅ Higher visibility in search results

---

## Module 8: Full-Text Search

### Test Cases

#### 8.1 Basic Search
**Steps**:
1. Navigate to `/search`
2. Enter query: "machine learning"
3. Click "Search"

**Expected Result**:
- ✅ Results display documents matching query
- ✅ Search uses PostgreSQL tsvector
- ✅ Results sorted by relevance (ts_rank)
- ✅ Highlight matched keywords

**API Test**:
```bash
curl "http://localhost:5001/api/search/documents?q=machine%20learning"
```

#### 8.2 Autocomplete Suggestions
**Steps**:
1. Type "data" in search box
2. View suggestions dropdown

**Expected Result**:
- ✅ Suggestions appear after 2 characters
- ✅ Suggestions based on document titles
- ✅ Ordered by popularity (download_count)

**API Test**:
```bash
curl "http://localhost:5001/api/search/suggestions?q=data"
```

#### 8.3 Advanced Search with Filters
**Steps**:
1. Click "Filters" button
2. Set filters:
   - Category: "Lecture Notes"
   - Min Rating: 4 stars
   - Max Cost: 50 credits
   - File Type: PDF
   - Verified Authors Only: ✓
3. Sort by: "Highest Rated"
4. Search

**Expected Result**:
- ✅ Results match all filters
- ✅ Sort order correct
- ✅ Filter combinations work

**API Test**:
```bash
curl "http://localhost:5001/api/search/documents?q=algorithm&category=Lecture%20Notes&minRating=4&maxCost=50&fileType=pdf&verifiedOnly=true&sortBy=rating"
```

#### 8.4 Search Users
**Steps**:
1. Search for username: "john"
2. View results

**Expected Result**:
- ✅ Users matching username/full_name
- ✅ Show user stats (documents, followers)
- ✅ Link to user profile

**API Test**:
```bash
curl "http://localhost:5001/api/search/users?q=john"
```

#### 8.5 Popular Searches
**Steps**:
1. Navigate to search page
2. View "Popular Searches" section

**Expected Result**:
- ✅ Display trending search terms
- ✅ Based on document subjects

---

## Core Features Testing

### Document Management

#### Upload Document
**Steps**:
1. Login
2. Navigate to `/upload`
3. Fill form:
   - Title: "Introduction to Algorithms"
   - Category: "Lecture Notes"
   - Subject: "Computer Science"
   - University: "MIT"
   - Tags: "algorithms, data structures"
   - Credit Cost: 10
   - File: Upload PDF
4. Submit

**Expected Result**:
- ✅ File uploaded to `uploads/documents/`
- ✅ Metadata saved to database
- ✅ Search vector generated
- ✅ Preview generated (if applicable)
- ✅ User credited for upload

**Database Check**:
```sql
SELECT document_id, title, file_path, search_vector 
FROM documents 
WHERE author_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC LIMIT 1;
```

#### Download Document
**Steps**:
1. Browse documents
2. Click document with credit cost
3. Confirm purchase with credits
4. Download file

**Expected Result**:
- ✅ Credits deducted from downloader
- ✅ Credits added to uploader
- ✅ Download count incremented
- ✅ File downloaded successfully
- ✅ Transaction logged

**Database Check**:
```sql
-- Check credit transaction
SELECT * FROM credit_transactions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY transaction_date DESC LIMIT 1;

-- Check download count
SELECT download_count FROM documents WHERE document_id = 'DOCUMENT_ID';
```

#### Rate Document
**Steps**:
1. View document detail
2. Select rating (1-5 stars)
3. Optional: Add review text
4. Submit

**Expected Result**:
- ✅ Rating saved
- ✅ Average rating recalculated
- ✅ Rating distribution updated

**Database Check**:
```sql
SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings 
FROM document_ratings 
WHERE document_id = 'DOCUMENT_ID';
```

### User Profile & Following

#### Follow User
**Steps**:
1. Visit user profile page
2. Click "Follow" button
3. View follower count increase

**Expected Result**:
- ✅ Follower relationship created
- ✅ Followed user receives notification
- ✅ Button changes to "Unfollow"

**Database Check**:
```sql
SELECT * FROM user_follows 
WHERE follower_id = 'YOUR_USER_ID' 
AND following_id = 'TARGET_USER_ID';
```

### Notifications

#### View Notifications
**Steps**:
1. Login
2. Click notification bell icon
3. View notification list

**Expected Result**:
- ✅ Display unread notifications
- ✅ Show notification type icons
- ✅ Mark as read on click
- ✅ Link to relevant page

**Database Check**:
```sql
SELECT * FROM notifications 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC LIMIT 10;
```

---

## Integration Testing

### End-to-End User Journey

#### Scenario 1: New User Complete Flow
1. **Register** → Email verification
2. **Login** → Dashboard
3. **Browse** documents → Search for "algorithms"
4. **Purchase credits** → Stripe payment
5. **Download** document → Credits deducted
6. **Rate & comment** document
7. **Upload** own document
8. **Answer** Q&A question
9. **Apply** for verified author badge

**Success Criteria**:
- ✅ All steps complete without errors
- ✅ Database consistent
- ✅ Notifications sent appropriately
- ✅ Credits calculated correctly

#### Scenario 2: OAuth User Flow
1. **Login with Google**
2. **Link email** to existing account
3. **Purchase credits** with saved payment method
4. **Follow** verified authors
5. **Receive** personalized recommendations

---

## Performance Testing

### Load Testing

#### Database Query Performance
```sql
-- Check slow queries
EXPLAIN ANALYZE 
SELECT * FROM documents 
WHERE search_vector @@ to_tsquery('english', 'algorithm') 
ORDER BY ts_rank(search_vector, to_tsquery('english', 'algorithm')) DESC 
LIMIT 20;

-- Verify indexes used
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
```

#### API Response Times
Use Apache Bench or Artillery:
```bash
# Test search endpoint
ab -n 1000 -c 10 "http://localhost:5001/api/search/documents?q=algorithm"

# Test document list
ab -n 1000 -c 10 "http://localhost:5001/api/documents?page=1&limit=20"
```

**Target Metrics**:
- ✅ Average response time < 200ms
- ✅ 95th percentile < 500ms
- ✅ No errors under load

### Concurrent Users
Test with multiple browser sessions:
- Simultaneous payments
- Concurrent document downloads
- Multiple users searching

**Expected Result**:
- ✅ No race conditions
- ✅ Transaction isolation works
- ✅ No duplicate credit deductions

---

## Common Issues & Debugging

### Email Not Sending
**Check**:
- Gmail App Password correct?
- 2FA enabled on Gmail?
- Check backend logs for errors
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`

### Stripe Payment Failing
**Check**:
- Using test keys (sk_test_, pk_test_)?
- Webhook secret correct?
- Webhook endpoint accessible?
- Check Stripe Dashboard logs

### Search Not Working
**Check**:
- Search vector populated? `SELECT search_vector FROM documents LIMIT 1;`
- GIN index exists? `SELECT * FROM pg_indexes WHERE tablename = 'documents';`
- Query format correct? Use `to_tsquery` properly

### OAuth Redirect Error
**Check**:
- Callback URL matches OAuth app settings
- OAuth credentials in `.env` correct
- Redirect URI allowed in OAuth app

---

## Test Results Checklist

Copy this checklist và check off sau khi test:

### Module 1: Email ✓
- [ ] Email verification works
- [ ] Password reset works
- [ ] Welcome email sent
- [ ] Email templates rendered correctly

### Module 2: OAuth ✓
- [ ] Google login works
- [ ] Facebook login works
- [ ] Account linking works
- [ ] OAuth profile data synced

### Module 3: Payment ✓
- [ ] View credit packages
- [ ] Successful payment flow
- [ ] Failed payment handled
- [ ] Webhook events processed
- [ ] Payment history displays
- [ ] Credits added correctly

### Module 4: Q&A ✓
- [ ] Create question
- [ ] Answer question
- [ ] Vote works
- [ ] Best answer selection works

### Module 5: Recommendations ✓
- [ ] User interactions tracked
- [ ] Personalized recommendations shown
- [ ] Similar documents work
- [ ] Popular documents displayed

### Module 6: Preview ✓
- [ ] PDF preview works
- [ ] DOCX preview works
- [ ] PPTX preview works
- [ ] Thumbnails generated

### Module 7: Verified Author ✓
- [ ] Submit verification request
- [ ] Admin can review
- [ ] Approve/reject works
- [ ] Verified badge displayed
- [ ] Credit multiplier works

### Module 8: Search ✓
- [ ] Basic search works
- [ ] Autocomplete works
- [ ] Advanced filters work
- [ ] User search works
- [ ] Popular searches displayed

### Core Features ✓
- [ ] Document upload
- [ ] Document download
- [ ] Rating & comments
- [ ] User following
- [ ] Notifications
- [ ] Admin panel

---

## Reporting Bugs

When reporting bugs, include:
1. **Module**: Which module?
2. **Steps to reproduce**: Detailed steps
3. **Expected result**: What should happen?
4. **Actual result**: What actually happened?
5. **Environment**: Browser, OS, backend version
6. **Logs**: Backend console logs, browser console errors
7. **Database state**: Relevant database queries
8. **Screenshots**: If applicable

**Example Bug Report**:
```
Module: Payment System
Steps: 
1. Selected 100 credits package
2. Entered card 4242 4242 4242 4242
3. Clicked Pay
Expected: Credits added after payment success
Actual: Payment succeeded but credits not added
Logs: Webhook returned 200 but database transaction failed
Database: payment_transactions shows status 'pending'
```

---

## Next Steps After Testing

1. **Fix bugs** found during testing
2. **Optimize** slow queries
3. **Add monitoring** (Sentry, CloudWatch)
4. **Setup CI/CD** pipeline
5. **Write automated tests** (Jest, Cypress)
6. **Load testing** với real-world scenarios
7. **Security audit** (OWASP Top 10)
8. **Prepare for production** deployment

---

**Last Updated**: December 2024
**Version**: 1.0.0
