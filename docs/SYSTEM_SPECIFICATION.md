# ShareBuddy - Đặc Tả Hệ Thống Chi Tiết

**Version**: 1.0.0  
**Last Updated**: December 14, 2025  
**Authors**: ShareBuddy Development Team

---

## Mục lục
1. [Use Case của Hệ thống](#1-use-case-của-hệ-thống)
2. [Công nghệ Web/Dịch vụ](#2-công-nghệ-webdịch-vụ)
3. [Thiết kế Database](#3-thiết-kế-database)
4. [Cấu trúc Hệ thống](#4-cấu-trúc-hệ-thống)
5. [Sơ đồ Tệp của Hệ thống](#5-sơ-đồ-tệp-của-hệ-thống)

---

## 1. Use Case của Hệ thống

### 1.1 Tổng quan Actors

ShareBuddy hệ thống có 4 loại actors chính:

| Actor | Mô tả | Quyền truy cập |
|-------|-------|----------------|
| **Guest** | Người dùng chưa đăng nhập | Xem tài liệu, tìm kiếm (giới hạn) |
| **Registered User** | Người dùng đã đăng ký | Full CRUD trên tài liệu của mình, download, Q&A |
| **Verified Author** | User đã được verify | Tất cả quyền của User + credit bonus multiplier |
| **Admin** | Quản trị viên | Full access, quản lý users, verify authors, moderate |

---

### 1.2 Use Case Diagram Tổng Quát

```
┌─────────────────────────────────────────────────────────────────┐
│                      ShareBuddy System                           │
│                                                                  │
│  ┌──────────┐                                                   │
│  │  Guest   │────────► View Documents                           │
│  └──────────┘────────► Search Documents                         │
│       │              ► View Document Details                    │
│       │              ► View Q&A                                 │
│       │              ► Register Account                         │
│       │                                                         │
│  ┌──────────┐                                                   │
│  │   User   │────────► All Guest Features                      │
│  └──────────┘────────► Upload Documents                        │
│       │              ► Download Documents (with credits)        │
│       │              ► Rate & Comment Documents                 │
│       │              ► Ask & Answer Questions                   │
│       │              ► Vote on Q&A                              │
│       │              ► Follow Authors                           │
│       │              ► Purchase Credits (Stripe)                │
│       │              ► Bookmark Documents                       │
│       │              ► Request Verification                     │
│       │              ► View Recommendations                     │
│       │              ► Preview Documents                        │
│       │                                                         │
│  ┌──────────┐                                                   │
│  │Verified  │────────► All User Features                       │
│  │ Author   │────────► Earn 1.5x Credits                       │
│  └──────────┘────────► Verified Badge Display                  │
│       │              ► Higher Search Priority                   │
│       │                                                         │
│  ┌──────────┐                                                   │
│  │  Admin   │────────► All User Features                       │
│  └──────────┘────────► Manage Users                            │
│                      ► Moderate Content                         │
│                      ► Review Verification Requests             │
│                      ► View System Statistics                   │
│                      ► Manage Credit Packages                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

External Systems:
┌──────────────┐
│ Gmail SMTP   │──► Email Verification, Password Reset
└──────────────┘
┌──────────────┐
│ Google OAuth │──► Social Login
└──────────────┘
┌──────────────┐
│Facebook OAuth│──► Social Login
└──────────────┘
┌──────────────┐
│ Stripe API   │──► Payment Processing
└──────────────┘
```

---

### 1.3 Chi tiết Use Cases

#### UC-01: User Authentication & Management

##### UC-01.1: Đăng ký tài khoản (Register)
**Actor**: Guest  
**Precondition**: Chưa có tài khoản  
**Main Flow**:
1. Guest truy cập trang `/register`
2. Guest nhập thông tin:
   - Email (unique, valid format)
   - Password (minimum 8 chars, có chữ hoa, số, ký tự đặc biệt)
   - Full name
   - University (optional)
3. System validate dữ liệu
4. System hash password với bcrypt (12 salt rounds)
5. System tạo verification token
6. System gửi email verification
7. System redirect về `/login` với message "Check email to verify"
8. User click link trong email
9. System verify token và activate account
10. System gửi welcome email

**Postcondition**: Account created với `email_verified = true`, nhận 50 credits khởi đầu

**Alternative Flow**:
- 3a. Email đã tồn tại → Show error "Email already registered"
- 3b. Password không đủ mạnh → Show validation errors
- 8a. Token expired (>24h) → Allow resend verification email

**Business Rules**:
- BR-01.1: Mỗi email chỉ có thể đăng ký 1 account
- BR-01.2: Password phải có min 8 chars, 1 uppercase, 1 number, 1 special char
- BR-01.3: Verification token expires sau 24h
- BR-01.4: New users nhận 50 credits miễn phí

##### UC-01.2: Đăng nhập (Login)
**Actor**: Registered User  
**Precondition**: Có tài khoản verified  
**Main Flow**:
1. User truy cập `/login`
2. User nhập email và password
3. System validate credentials
4. System check `email_verified = true`
5. System tạo JWT token (expires 7 days)
6. System return token và user data
7. Frontend lưu token vào localStorage
8. System redirect về `/dashboard`

**Postcondition**: User logged in, token stored

**Alternative Flow**:
- 3a. Credentials sai → Show error "Invalid email or password"
- 4a. Email chưa verified → Show "Please verify your email first"
- Multiple failed attempts (>5) → Temporary account lock (15 minutes)

**Business Rules**:
- BR-01.5: JWT token expires sau 7 days
- BR-01.6: Lock account sau 5 failed login attempts
- BR-01.7: Session timeout sau 30 days inactivity

##### UC-01.3: OAuth Login (Google/Facebook)
**Actor**: Guest  
**Precondition**: None  
**Main Flow**:
1. Guest click "Sign in with Google/Facebook"
2. System redirect to OAuth provider
3. User authorize ShareBuddy
4. OAuth provider return authorization code
5. System exchange code for access token
6. System fetch user profile (email, name, picture)
7. System check if email exists in database
   - If exists: Link OAuth account to existing user
   - If not: Create new user with OAuth data
8. System generate JWT token
9. System redirect to `/oauth-success`

**Postcondition**: User logged in via OAuth, `google_id` hoặc `facebook_id` populated

**Business Rules**:
- BR-01.8: OAuth accounts auto-verified (email_verified = true)
- BR-01.9: Can link multiple OAuth providers to 1 account
- BR-01.10: OAuth users nhận 50 credits như normal registration

##### UC-01.4: Reset Password
**Actor**: Registered User  
**Precondition**: Quên password  
**Main Flow**:
1. User click "Forgot Password?" tại `/login`
2. User nhập email tại `/forgot-password`
3. System check email exists
4. System generate reset token (1 hour expiry)
5. System gửi reset email với link `/reset-password?token=...`
6. User click link trong email
7. User nhập password mới (2 lần for confirmation)
8. System validate token chưa expire
9. System hash và update password mới
10. System invalidate reset token
11. System gửi confirmation email
12. System redirect về `/login`

**Postcondition**: Password updated, old password invalid

**Alternative Flow**:
- 3a. Email không tồn tại → Still show success (security: không leak user existence)
- 8a. Token expired → Show "Link expired, request new reset"
- 7a. Passwords không match → Show validation error

**Business Rules**:
- BR-01.11: Reset token expires sau 1 hour
- BR-01.12: Only 1 active reset token per user
- BR-01.13: New password phải khác password cũ

---

#### UC-02: Document Management

##### UC-02.1: Upload Document
**Actor**: Registered User  
**Precondition**: User logged in, email verified  
**Main Flow**:
1. User navigate to `/upload`
2. User fill form:
   - Title (10-200 chars)
   - Description (20-1000 chars)
   - Category (select: Lecture Notes, Assignments, Exams, Projects, Others)
   - Subject (text input)
   - University (text input)
   - Tags (comma-separated)
   - Credit Cost (0-1000)
   - File upload (PDF, DOCX, PPTX, XLSX)
3. User click "Upload"
4. System validate file size (max 10MB)
5. System validate file type
6. System generate unique filename
7. System save file to `uploads/documents/`
8. System extract metadata (page count, file size)
9. System generate preview (if PDF/DOCX/PPTX)
10. System generate thumbnail
11. System create search vector (tsvector) từ title + description + tags
12. System save document record to database
13. System credit user +5 credits for upload
14. System redirect to document detail page

**Postcondition**: Document uploaded, searchable, credits earned

**Alternative Flow**:
- 4a. File too large (>10MB) → Show error "File exceeds 10MB limit"
- 5a. Invalid file type → Show "Only PDF, DOCX, PPTX, XLSX allowed"
- 9a. Preview generation fails → Still save document, preview = null

**Business Rules**:
- BR-02.1: Max file size = 10MB
- BR-02.2: Allowed types: PDF, DOCX, PPTX, XLSX
- BR-02.3: Upload reward = +5 credits
- BR-02.4: Verified authors earn +7.5 credits (5 × 1.5)
- BR-02.5: Title must be unique per user

##### UC-02.2: Download Document
**Actor**: Registered User  
**Precondition**: User has enough credits  
**Main Flow**:
1. User view document detail page
2. User click "Download" button
3. System check user credits >= document.credit_cost
4. System show confirmation modal: "Cost: X credits. Continue?"
5. User confirm
6. System start transaction:
   - Deduct credits from downloader
   - Add credits to author
   - Record transaction in `credit_transactions`
   - Increment `download_count`
   - Create notification to author
7. System commit transaction
8. System return file URL
9. Browser download file

**Postcondition**: Credits transferred, download recorded

**Alternative Flow**:
- 3a. Not enough credits → Show "Insufficient credits. Purchase more?"
- 3b. User is author → Free download (no credit deduction)
- 3c. Document is free (credit_cost = 0) → Direct download
- 6a. Transaction fails → Rollback, show error

**Business Rules**:
- BR-02.6: Authors can download own documents free
- BR-02.7: Free documents (cost = 0) don't require transaction
- BR-02.8: Transaction must be atomic (all or nothing)
- BR-02.9: Verified authors earn 1.5x credits from downloads

##### UC-02.3: Search Documents
**Actor**: Guest/User  
**Precondition**: None  
**Main Flow**:
1. User enter search query tại `/search`
2. System show autocomplete suggestions (after 2 chars)
3. User submit search hoặc select suggestion
4. System execute full-text search:
   - Use PostgreSQL tsvector and to_tsquery
   - Rank results by ts_rank (relevance)
5. System apply filters (if any):
   - Category
   - Subject
   - University
   - Min Rating (0-5)
   - Max Cost (credits)
   - File Type
   - Verified Authors Only
6. System apply sorting:
   - Relevance (default)
   - Newest
   - Most Popular (download_count)
   - Highest Rated
7. System paginate results (20 per page)
8. System return results with highlights

**Postcondition**: Search results displayed

**Alternative Flow**:
- 2a. Query < 2 chars → No suggestions
- 4a. No results → Show "No documents found. Try different keywords"

**Business Rules**:
- BR-02.10: Search uses PostgreSQL full-text search
- BR-02.11: Results paginated (20 per page)
- BR-02.12: Verified authors' docs ranked higher (bonus score)
- BR-02.13: Guests can search but limited to 10 results

##### UC-02.4: Rate & Comment Document
**Actor**: Registered User  
**Precondition**: User logged in, has downloaded document  
**Main Flow**:
1. User view document detail
2. User select rating (1-5 stars)
3. User write comment (optional, min 10 chars)
4. User submit
5. System check user đã download document
6. System check user chưa rate document này
7. System save rating và comment
8. System recalculate average_rating của document
9. System create notification to author
10. System credit user +2 for rating

**Postcondition**: Rating saved, average updated

**Alternative Flow**:
- 5a. User chưa download → Show "Download document first to rate"
- 6a. User đã rate → Allow update rating
- 3a. Comment too short (<10 chars) → Show validation error

**Business Rules**:
- BR-02.14: Must download to rate
- BR-02.15: 1 rating per user per document
- BR-02.16: Can update own rating anytime
- BR-02.17: Rating reward = +2 credits

##### UC-02.5: Preview Document
**Actor**: Guest/User  
**Precondition**: Document has preview generated  
**Main Flow**:
1. User click "Preview" button
2. System load preview file từ `uploads/previews/`
3. If PDF: Render with React-PDF
4. If DOCX/PPTX: Show converted PDF preview
5. User navigate pages (prev/next buttons)
6. User zoom in/out
7. User close preview

**Postcondition**: Preview viewed, download_count not incremented

**Alternative Flow**:
- 2a. Preview not available → Show "Preview not available for this document"
- 3a. PDF load error → Show error message

**Business Rules**:
- BR-02.18: Preview is free (no credits required)
- BR-02.19: Preview limited to first 5 pages (if >5 pages)
- BR-02.20: Watermark: "Preview - Download full document"

---

#### UC-03: Payment System (Stripe)

##### UC-03.1: View Credit Packages
**Actor**: Registered User  
**Precondition**: User logged in  
**Main Flow**:
1. User navigate to `/purchase-credits`
2. System fetch active credit packages from database
3. System display packages với:
   - Credits amount
   - Bonus credits
   - Price (USD and VND)
   - Popular badge (if `is_popular = true`)
4. System display current user balance

**Postcondition**: Packages displayed

**Business Rules**:
- BR-03.1: Display only active packages (`is_active = true`)
- BR-03.2: Show both USD and VND pricing
- BR-03.3: Highlight popular package

##### UC-03.2: Purchase Credits
**Actor**: Registered User  
**Precondition**: User logged in, Stripe configured  
**Main Flow**:
1. User select credit package
2. System show checkout form with Stripe Elements
3. User enter card details:
   - Card number
   - Expiry date
   - CVC
   - ZIP code
4. User click "Pay $X.XX"
5. System create payment intent via Stripe API
6. System create/retrieve Stripe customer
7. System save pending transaction to database
8. Stripe processes payment
9. Stripe returns payment status
10. If successful:
    - System receive webhook `payment_intent.succeeded`
    - System start transaction:
      - Add credits to user
      - Update transaction status to 'completed'
      - Create success notification
    - System commit transaction
11. Frontend show success message
12. System redirect to `/dashboard`

**Postcondition**: Credits added, payment recorded

**Alternative Flow**:
- 9a. Payment declined:
  - System receive webhook `payment_intent.payment_failed`
  - Update transaction status to 'failed'
  - Create failure notification
  - Show error message
- 10a. Webhook fails → Manual reconciliation required (admin)

**Business Rules**:
- BR-03.4: Payment processed via Stripe Payment Intents
- BR-03.5: Credits added only after successful webhook
- BR-03.6: Transaction must be atomic
- BR-03.7: Support USD and VND currencies
- BR-03.8: Webhook signature must be verified

##### UC-03.3: View Payment History
**Actor**: Registered User  
**Precondition**: User logged in  
**Main Flow**:
1. User navigate to `/payment-history`
2. System fetch user's transactions từ `payment_transactions`
3. System display list with pagination (10 per page):
   - Date
   - Package (credits purchased)
   - Amount
   - Currency
   - Status (pending, completed, failed, refunded)
4. User can filter by status
5. User can view transaction details

**Postcondition**: Payment history displayed

**Business Rules**:
- BR-03.9: Show all transactions regardless of status
- BR-03.10: Paginate 10 per page
- BR-03.11: Sort by date DESC (newest first)

##### UC-03.4: Refund (Admin)
**Actor**: Admin  
**Precondition**: Payment exists, can be refunded  
**Main Flow**:
1. Admin view transaction in admin panel
2. Admin click "Refund"
3. System confirm refund with Stripe
4. Stripe processes refund
5. System receive webhook `charge.refunded`
6. System start transaction:
   - Deduct credits from user
   - Update transaction status to 'refunded'
   - Create notification to user
7. System commit transaction

**Postcondition**: Payment refunded, credits deducted

**Business Rules**:
- BR-03.12: Can refund within 90 days
- BR-03.13: Credits deducted (if user balance >= amount)
- BR-03.14: If insufficient credits, set balance to 0

---

#### UC-04: Q&A System

##### UC-04.1: Ask Question
**Actor**: Registered User  
**Precondition**: User logged in  
**Main Flow**:
1. User view document detail page
2. User scroll to Q&A section
3. User click "Ask Question"
4. User fill form:
   - Title (10-500 chars)
   - Content/Details (min 20 chars)
5. User submit
6. System validate inputs
7. System create question với status 'active'
8. System credit user +1 for asking
9. System create notification to document author
10. System display question in list

**Postcondition**: Question created, author notified

**Alternative Flow**:
- 6a. Validation fails → Show errors

**Business Rules**:
- BR-04.1: Question reward = +1 credit
- BR-04.2: Title 10-500 chars, content min 20 chars
- BR-04.3: Questions belong to specific document

##### UC-04.2: Answer Question
**Actor**: Registered User  
**Precondition**: User logged in  
**Main Flow**:
1. User view question detail
2. User click "Answer"
3. User write answer (min 20 chars)
4. User submit
5. System validate answer
6. System create answer
7. System increment question.answer_count
8. System credit user +2 for answering
9. System create notification to questioner
10. System display answer

**Postcondition**: Answer created, questioner notified

**Business Rules**:
- BR-04.4: Answer reward = +2 credits
- BR-04.5: Answer min 20 chars
- BR-04.6: Can answer multiple times (different users)

##### UC-04.3: Vote Question/Answer
**Actor**: Registered User  
**Precondition**: User logged in, not own question/answer  
**Main Flow**:
1. User view question or answer
2. User click upvote (▲) or downvote (▼)
3. System check user hasn't voted yet
4. System record vote (type: 'upvote' or 'downvote')
5. System update vote_count:
   - Upvote: +1
   - Downvote: -1
6. System update display

**Postcondition**: Vote recorded, count updated

**Alternative Flow**:
- 3a. User đã vote:
  - Same vote type → Remove vote (toggle)
  - Different vote type → Change vote

**Business Rules**:
- BR-04.7: Cannot vote own question/answer
- BR-04.8: 1 vote per user per question/answer
- BR-04.9: Can change vote anytime
- BR-04.10: Vote_count can be negative

##### UC-04.4: Accept Best Answer
**Actor**: Document Author  
**Precondition**: User is question's document author  
**Main Flow**:
1. User view question on own document
2. User review answers
3. User click "Mark as Best Answer" on best answer
4. System check user is document author
5. System check no other best answer exists
6. System update answer.is_best_answer = true
7. System credit answer author +5 bonus
8. System create notification to answer author
9. System display "✓ Best Answer" badge

**Postcondition**: Best answer marked, bonus credited

**Alternative Flow**:
- 4a. User not document author → Show "Only document author can mark best answer"
- 5a. Best answer exists → Unmark previous, mark new one

**Business Rules**:
- BR-04.11: Only document author can mark best answer
- BR-04.12: Only 1 best answer per question
- BR-04.13: Best answer bonus = +5 credits
- BR-04.14: Can change best answer selection

---

#### UC-05: Recommendation System

##### UC-05.1: Track User Interactions
**Actor**: System (Automatic)  
**Precondition**: User logged in  
**Main Flow**:
1. User performs action:
   - View document detail → interaction_type = 'view', weight = 1
   - Download document → interaction_type = 'download', weight = 3
   - Rate document → interaction_type = 'rate', weight = 2
   - Comment document → interaction_type = 'comment', weight = 2
2. System record interaction in `user_interactions`:
   - user_id
   - document_id
   - interaction_type
   - interaction_date (timestamp)
3. System update user behavior profile

**Postcondition**: Interaction tracked

**Business Rules**:
- BR-05.1: Interactions weighted: view=1, download=3, rate=2, comment=2
- BR-05.2: Interactions expire sau 90 days
- BR-05.3: Used for personalized recommendations

##### UC-05.2: View Personalized Recommendations
**Actor**: Registered User  
**Precondition**: User logged in, has interaction history  
**Main Flow**:
1. User visit homepage or dashboard
2. System fetch user's recent interactions
3. System calculate recommendations:
   - **Collaborative Filtering**: Find similar users (based on interaction patterns)
   - Get documents those users interacted with
   - **Content-Based**: Find documents similar to user's history (same category, subject, tags)
   - Combine both approaches with weights
4. System filter out:
   - Documents user already interacted with
   - Documents user authored
5. System rank by recommendation score
6. System display top 10 recommendations

**Postcondition**: Personalized recommendations displayed

**Business Rules**:
- BR-05.4: Combine collaborative + content-based filtering
- BR-05.5: Update recommendations daily (materialized view refresh)
- BR-05.6: Minimum 5 interactions required for collaborative filtering

##### UC-05.3: View Similar Documents
**Actor**: Guest/User  
**Precondition**: Viewing document detail  
**Main Flow**:
1. User view document detail page
2. System find similar documents based on:
   - Same category (weight: 0.4)
   - Same subject (weight: 0.3)
   - Overlapping tags (weight: 0.3)
3. System calculate similarity score
4. System sort by score DESC
5. System display top 5-10 in sidebar

**Postcondition**: Similar documents displayed

**Business Rules**:
- BR-05.7: Show max 10 similar documents
- BR-05.8: Exclude current document
- BR-05.9: Require min similarity score > 0.3

---

#### UC-06: Verified Author System

##### UC-06.1: Request Verification
**Actor**: Registered User  
**Precondition**: User has uploaded >= 10 documents, avg rating >= 4.0  
**Main Flow**:
1. User navigate to `/verified-author/request`
2. User fill form:
   - Portfolio URL (optional)
   - Description (why deserve verification, min 50 chars)
   - Supporting documents/links (optional)
3. User submit request
4. System validate:
   - User has >= 10 documents uploaded
   - Average rating >= 4.0
   - No pending request exists
5. System create verification request với status 'pending'
6. System create notification to admins
7. System redirect to "My Requests" page

**Postcondition**: Verification request submitted

**Alternative Flow**:
- 4a. < 10 documents → Show "Need at least 10 documents to apply"
- 4b. Rating < 4.0 → Show "Need average rating >= 4.0"
- 4c. Pending request exists → Show "You have a pending request"

**Business Rules**:
- BR-06.1: Require >= 10 documents uploaded
- BR-06.2: Require average rating >= 4.0
- BR-06.3: 1 pending request at a time
- BR-06.4: Can reapply 30 days after rejection

##### UC-06.2: Admin Review Verification Request
**Actor**: Admin  
**Precondition**: Verification request exists, status = 'pending'  
**Main Flow**:
1. Admin navigate to admin panel → Verified Author Requests
2. Admin view list of pending requests
3. Admin click "Review" on a request
4. Admin view request details:
   - User profile
   - Document portfolio
   - Statistics (uploads, ratings, downloads)
   - Request description
5. Admin make decision:
   - **Approve**: Click "Approve" + enter admin note
   - **Reject**: Click "Reject" + enter reason
6. If approved:
   - System update user.is_verified = true
   - System update request.status = 'approved'
   - System create success notification to user
7. If rejected:
   - System update request.status = 'rejected'
   - System create rejection notification with reason
8. System record review date and admin_id

**Postcondition**: Request reviewed, user notified

**Business Rules**:
- BR-06.5: Only admins can review requests
- BR-06.6: Approved users get verified badge
- BR-06.7: Rejected users can reapply after 30 days
- BR-06.8: Admin must provide reason for rejection

##### UC-06.3: Verified Author Benefits
**Actor**: Verified Author  
**Precondition**: User is verified (is_verified = true)  
**Main Flow**:
1. Verified author uploads document → Earn 7.5 credits (5 × 1.5)
2. Verified author's document downloaded → Earn 1.5x credits
3. Documents show verified badge "✓ Verified Author"
4. Profile shows verified badge
5. Documents ranked higher in search results
6. Trust score increased

**Postcondition**: Benefits active

**Business Rules**:
- BR-06.9: Credit multiplier = 1.5x for all document activities
- BR-06.10: Verified badge displayed on documents and profile
- BR-06.11: Search ranking bonus = +10% relevance score
- BR-06.12: Verification can be revoked by admin if quality drops

---

#### UC-07: User Following & Social Features

##### UC-07.1: Follow Author
**Actor**: Registered User  
**Precondition**: User logged in, viewing another user's profile  
**Main Flow**:
1. User view author profile page
2. User click "Follow" button
3. System check not already following
4. System create follow relationship
5. System increment follower_count
6. System create notification to followed user
7. Button changes to "Unfollow"

**Postcondition**: Following relationship created

**Alternative Flow**:
- 3a. Already following → Unfollow (toggle)

**Business Rules**:
- BR-07.1: Cannot follow self
- BR-07.2: Following is asymmetric (A follows B ≠ B follows A)
- BR-07.3: No limit on follows

##### UC-07.2: Bookmark Document
**Actor**: Registered User  
**Precondition**: User logged in  
**Main Flow**:
1. User view document detail
2. User click bookmark icon (🔖)
3. System toggle bookmark status
4. System update UI

**Postcondition**: Document bookmarked/unbookmarked

**Business Rules**:
- BR-07.4: Bookmarks are private
- BR-07.5: No limit on bookmarks
- BR-07.6: Can view all bookmarks at `/bookmarks`

---

#### UC-08: Admin Functions

##### UC-08.1: View System Statistics
**Actor**: Admin  
**Precondition**: Admin logged in  
**Main Flow**:
1. Admin navigate to admin panel
2. System display statistics:
   - Total users, new users (last 7 days)
   - Total documents, uploads (last 7 days)
   - Total credits in circulation
   - Total revenue (Stripe payments)
   - Top uploaders (by document count)
   - Top earners (by credits earned)
   - Popular documents (by downloads)
   - Verified authors count
3. System display charts:
   - User growth over time
   - Document uploads over time
   - Revenue over time

**Postcondition**: Statistics displayed

**Business Rules**:
- BR-08.1: Only admins can view statistics
- BR-08.2: Statistics updated every 15 minutes

##### UC-08.2: Moderate Content
**Actor**: Admin  
**Precondition**: Admin logged in  
**Main Flow**:
1. Admin view reported content
2. Admin review content (document, comment, Q&A)
3. Admin make decision:
   - **Approve**: No action, clear report
   - **Remove**: Delete content, notify user
   - **Ban User**: Deactivate account, notify user
4. System execute decision
5. System log moderation action

**Postcondition**: Content moderated

**Business Rules**:
- BR-08.3: All moderation actions logged
- BR-08.4: Deleted content kept for 30 days (soft delete)
- BR-08.5: Banned users cannot login

---

### 1.4 Use Case Priority Matrix

| Priority | Use Cases | Reason |
|----------|-----------|--------|
| **Critical** | UC-01.1, UC-01.2, UC-02.1, UC-02.2 | Core functionality: Auth + Document CRUD |
| **High** | UC-03.2, UC-04.1, UC-04.2, UC-02.3 | Revenue + Engagement features |
| **Medium** | UC-05.2, UC-06.1, UC-06.2, UC-07.1 | Advanced features, user retention |
| **Low** | UC-08.1, UC-08.2 | Admin tools, can be manual initially |

---

## 2. Công nghệ Web/Dịch vụ

### 2.1 Kiến trúc Tổng Quát

ShareBuddy sử dụng kiến trúc **3-tier** với **RESTful API**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│                    (React 19 + TypeScript)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Web UI     │  │  Mobile Web  │  │   PWA        │         │
│  │  (Desktop)   │  │  (Responsive)│  │  (Future)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                            ▼                                     │
│                    ┌───────────────┐                            │
│                    │  REST API     │                            │
│                    │  (HTTPS)      │                            │
│                    └───────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                        │
│                    (Node.js + Express.js)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Controllers  │  │  Services    │  │  Middleware  │         │
│  │ (Routes)     │  │ (Logic)      │  │  (Auth/Val.) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────┐          │
│  │           External Service Integration            │          │
│  │  Stripe │ Gmail │ Google OAuth │ Facebook OAuth   │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│                    (PostgreSQL 14+)                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Database   │  │  File System │  │   Cache      │         │
│  │   (RDBMS)    │  │  (Uploads)   │  │  (Future)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Frontend Technologies

#### 2.2.1 Core Framework & Libraries

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **React** | 19.2.0 | UI Framework | Industry standard, component-based, large ecosystem |
| **TypeScript** | 4.9.5 | Type Safety | Static typing, better IDE support, fewer runtime errors |
| **Redux Toolkit** | 2.10.1 | State Management | Centralized state, time-travel debugging, middleware support |
| **React Router** | 7.9.6 | Client-side Routing | Declarative routing, code splitting, nested routes |
| **Axios** | 1.13.2 | HTTP Client | Promise-based, interceptors, automatic JSON transformation |

**Dependencies**:
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "typescript": "^4.9.5",
  "@reduxjs/toolkit": "^2.10.1",
  "react-redux": "^9.2.0",
  "react-router-dom": "^7.9.6",
  "axios": "^1.13.2"
}
```

#### 2.2.2 UI Components & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Bootstrap** | 5.3.8 | CSS Framework |
| **React-Bootstrap** | 2.10.10 | React Components |
| **React Icons** | 4.12.0 | Icon Library |
| **CSS3** | - | Custom Styling (Dark Theme, Pastel Colors) |

**Features**:
- Responsive design (mobile-first)
- Dark theme support
- Pastel color palette
- Custom animations

#### 2.2.3 Form Handling & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Hook Form** | 7.66.0 | Form Management |
| **Yup** | 1.7.1 | Schema Validation |
| **@hookform/resolvers** | 5.2.2 | Integration Layer |

**Example Usage**:
```typescript
const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required()
});

const { register, handleSubmit } = useForm({
  resolver: yupResolver(schema)
});
```

#### 2.2.4 Document Preview & PDF

| Technology | Version | Purpose |
|------------|---------|---------|
| **React-PDF** | 7.5.1 | PDF Rendering |
| **pdfjs-dist** | 3.11.174 | PDF.js Library |

**Features**:
- Client-side PDF rendering
- Page navigation
- Zoom controls
- Thumbnail generation

#### 2.2.5 Payment Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **@stripe/stripe-js** | 4.13.0 | Stripe.js Wrapper |
| **@stripe/react-stripe-js** | 2.9.0 | React Components |

**Features**:
- Stripe Elements (CardElement)
- PCI-compliant payment form
- Payment intent confirmation

#### 2.2.6 Notifications & UX

| Technology | Version | Purpose |
|------------|---------|---------|
| **React-Toastify** | 11.0.5 | Toast Notifications |

**Features**:
- Success/error/warning notifications
- Auto-dismiss
- Custom styling

---

### 2.3 Backend Technologies

#### 2.3.1 Core Framework & Runtime

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Node.js** | 16+ | Runtime Environment | Non-blocking I/O, JavaScript ecosystem, great for APIs |
| **Express.js** | 4.18.2 | Web Framework | Minimalist, flexible, large middleware ecosystem |
| **TypeScript** | (Optional) | Type Safety | Can be migrated for better type checking |

#### 2.3.2 Database & ORM

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 14+ | Primary Database |
| **pg** | 8.11.3 | PostgreSQL Driver |
| **pg-pool** | 3.6.1 | Connection Pooling |

**PostgreSQL Features Used**:
- **Full-Text Search**: `tsvector`, `ts_rank`, GIN indexes
- **Materialized Views**: User similarity, statistics aggregation
- **Triggers**: Auto-update timestamps, search vector maintenance
- **Constraints**: Foreign keys, check constraints, unique indexes
- **Transactions**: ACID compliance for payments

**Why PostgreSQL?**:
- ✅ Native full-text search (không cần Elasticsearch)
- ✅ JSON/JSONB support for flexible data
- ✅ Advanced indexing (GIN, GIST, B-tree)
- ✅ Excellent performance with proper indexing
- ✅ ACID transactions for payment safety
- ✅ Open source, mature, well-documented

#### 2.3.3 Authentication & Security

| Technology | Version | Purpose |
|------------|---------|---------|
| **jsonwebtoken** | 9.0.2 | JWT Generation/Verification |
| **bcryptjs** | 2.4.3 | Password Hashing |
| **passport** | 0.6.0 | Authentication Middleware |
| **passport-jwt** | 4.0.1 | JWT Strategy |
| **passport-google-oauth20** | 2.0.0 | Google OAuth |
| **passport-facebook** | 3.0.0 | Facebook OAuth |
| **helmet** | 7.0.0 | Security Headers |
| **express-rate-limit** | 6.10.0 | Rate Limiting |
| **cors** | 2.8.5 | CORS Configuration |

**Security Implementation**:
```javascript
// JWT Configuration
{
  secret: process.env.JWT_SECRET,
  expiresIn: '7d'
}

// Bcrypt Configuration
{
  saltRounds: 12  // High security
}

// Rate Limiting
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100  // 100 requests per window
}
```

#### 2.3.4 File Upload & Processing

| Technology | Version | Purpose |
|------------|---------|---------|
| **multer** | 1.4.5-lts.1 | File Upload Middleware |
| **sharp** | 0.32.5 | Image Processing |
| **pdf-lib** | 1.17.1 | PDF Manipulation |
| **pdfjs-dist** | 3.11.174 | PDF Parsing (server-side) |
| **canvas** | 2.11.2 | Canvas API (for PDF rendering) |
| **mime-types** | 2.1.35 | MIME Type Detection |

**File Processing Pipeline**:
1. Upload via Multer (validate size, type)
2. Generate unique filename
3. Save to `uploads/documents/`
4. Extract metadata (page count, dimensions)
5. Generate preview (if PDF/DOCX/PPTX)
6. Generate thumbnail
7. Save metadata to database

#### 2.3.5 Email Service

| Technology | Version | Purpose |
|------------|---------|---------|
| **nodemailer** | 6.9.4 | Email Sending |

**Email Configuration** (Gmail SMTP):
```javascript
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,  // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD  // App Password
  }
}
```

**Email Templates**:
- Verification email (HTML template)
- Password reset email
- Welcome email
- Payment confirmation
- Notification emails

#### 2.3.6 Payment Processing

| Technology | Version | Purpose |
|------------|---------|---------|
| **stripe** | 14.8.0 | Payment Gateway |

**Stripe Integration**:
- **Payment Intents API**: Secure payment flow
- **Webhooks**: Real-time event handling
- **Customers API**: Save payment methods
- **Refunds API**: Process refunds

**Webhook Events Handled**:
- `payment_intent.succeeded` → Add credits
- `payment_intent.payment_failed` → Notify user
- `charge.refunded` → Deduct credits

#### 2.3.7 Logging & Monitoring

| Technology | Version | Purpose |
|------------|---------|---------|
| **morgan** | 1.10.0 | HTTP Request Logger |
| **winston** | (Future) | Application Logger |
| **Sentry** | (Future) | Error Tracking |

**Morgan Configuration**:
```javascript
morgan(':method :url :status :res[content-length] - :response-time ms')
```

#### 2.3.8 Utilities & Middleware

| Technology | Version | Purpose |
|------------|---------|---------|
| **dotenv** | 16.3.1 | Environment Variables |
| **express-validator** | 7.0.1 | Request Validation |
| **express-session** | 1.18.2 | Session Management |
| **compression** | 1.7.4 | Response Compression |

---

### 2.4 External Services & APIs

#### 2.4.1 Payment Gateway

**Stripe Payment Platform**

| Feature | Usage |
|---------|-------|
| **Payment Intents** | Process credit card payments |
| **Customers** | Store customer data, payment methods |
| **Webhooks** | Real-time event notifications |
| **Dashboard** | Transaction monitoring, refunds |
| **Test Mode** | Development testing with test cards |

**API Endpoints Used**:
- `POST /v1/payment_intents` - Create payment
- `POST /v1/customers` - Create/update customer
- `POST /v1/refunds` - Process refund
- `GET /v1/payment_intents/:id` - Verify payment

**Test Cards**:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

#### 2.4.2 Email Service

**Gmail SMTP**

| Feature | Configuration |
|---------|--------------|
| **Host** | smtp.gmail.com |
| **Port** | 587 (TLS) |
| **Authentication** | App Password (2FA required) |
| **Rate Limit** | 500 emails/day (free), 2000/day (Google Workspace) |

**Setup Steps**:
1. Enable 2FA on Gmail
2. Generate App Password at https://myaccount.google.com/apppasswords
3. Use 16-character password in .env

**Future Migration Path**: SendGrid, AWS SES, Mailgun (for production)

#### 2.4.3 OAuth Providers

**Google OAuth 2.0**

| Feature | Configuration |
|---------|--------------|
| **Provider** | Google Cloud Console |
| **API** | Google+ API |
| **Scopes** | profile, email |
| **Callback URL** | http://localhost:5001/api/auth/google/callback |
| **Data Retrieved** | Email, name, profile picture, Google ID |

**Facebook OAuth 2.0**

| Feature | Configuration |
|---------|--------------|
| **Provider** | Facebook Developers |
| **API** | Facebook Login |
| **Scopes** | public_profile, email |
| **Callback URL** | http://localhost:5001/api/auth/facebook/callback |
| **Data Retrieved** | Email, name, profile picture, Facebook ID |

---

### 2.5 Development Tools & DevOps

#### 2.5.1 Version Control & CI/CD

| Tool | Purpose |
|------|---------|
| **Git** | Version control |
| **GitHub** | Code hosting, collaboration |
| **GitHub Actions** | (Future) CI/CD pipeline |

#### 2.5.2 Code Quality

| Tool | Purpose |
|------|---------|
| **ESLint** | JavaScript/TypeScript linting |
| **Prettier** | (Future) Code formatting |
| **Husky** | (Future) Git hooks |

#### 2.5.3 Testing

| Tool | Purpose |
|------|---------|
| **Jest** | (Future) Unit testing |
| **React Testing Library** | (Future) Component testing |
| **Cypress** | (Future) E2E testing |
| **Postman/Insomnia** | API testing (manual) |

#### 2.5.4 Database Management

| Tool | Purpose |
|------|---------|
| **pgAdmin** | GUI for PostgreSQL |
| **psql** | CLI for PostgreSQL |
| **SQL Migration Scripts** | Version-controlled schema changes |

---

### 2.6 Technology Stack Summary

#### Frontend Stack
```
React 19 (TypeScript)
├── Redux Toolkit (State)
├── React Router (Routing)
├── Bootstrap 5 (UI)
├── Axios (HTTP)
├── React-PDF (Documents)
├── Stripe Elements (Payments)
└── React-Toastify (Notifications)
```

#### Backend Stack
```
Node.js + Express.js
├── PostgreSQL 14+ (Database)
│   ├── Full-text search (tsvector)
│   ├── Materialized views
│   └── GIN indexes
├── JWT + Passport (Auth)
├── Multer + Sharp (Files)
├── Nodemailer (Email)
├── Stripe SDK (Payments)
└── Bcrypt (Security)
```

#### External Services
```
├── Stripe (Payment Gateway)
├── Gmail SMTP (Email Delivery)
├── Google OAuth (Social Login)
└── Facebook OAuth (Social Login)
```

---

### 2.7 Performance Optimizations

#### 2.7.1 Database Optimizations

| Optimization | Implementation |
|--------------|----------------|
| **Indexes** | B-tree on foreign keys, GIN on search_vector, composite indexes |
| **Connection Pooling** | pg-pool with max 20 connections |
| **Materialized Views** | user_similarity refresh daily |
| **Query Optimization** | SELECT only needed columns, avoid N+1 queries |
| **Partitioning** | (Future) Partition large tables by date |

#### 2.7.2 API Optimizations

| Optimization | Implementation |
|--------------|----------------|
| **Compression** | gzip compression for responses |
| **Pagination** | Limit 20 items per page |
| **Rate Limiting** | 100 requests per 15 minutes |
| **Caching** | (Future) Redis for session, API responses |
| **CDN** | (Future) CloudFlare for static assets |

#### 2.7.3 Frontend Optimizations

| Optimization | Implementation |
|--------------|----------------|
| **Code Splitting** | React.lazy() for route-based splitting |
| **Image Optimization** | Lazy loading, WebP format |
| **Bundle Size** | Tree shaking, minification |
| **Caching** | Service Worker (Future PWA) |

---

### 2.8 Security Measures

#### 2.8.1 Authentication Security

| Measure | Implementation |
|---------|----------------|
| **Password Hashing** | Bcrypt with 12 salt rounds |
| **JWT Tokens** | 7-day expiry, httpOnly cookies (future) |
| **OAuth 2.0** | Secure third-party authentication |
| **Session Management** | JWT refresh tokens (future) |

#### 2.8.2 API Security

| Measure | Implementation |
|---------|----------------|
| **HTTPS** | SSL/TLS encryption (production) |
| **CORS** | Whitelist frontend origin |
| **Helmet** | Security headers (XSS, CSP, etc.) |
| **Rate Limiting** | Prevent brute force attacks |
| **Input Validation** | Express-validator for all inputs |
| **SQL Injection** | Parameterized queries (pg library) |

#### 2.8.3 Payment Security

| Measure | Implementation |
|---------|----------------|
| **PCI Compliance** | Stripe handles card data (never touches server) |
| **Webhook Verification** | Stripe signature verification |
| **Transaction Logs** | All payment activities logged |
| **Refund Protection** | Admin-only refund access |

#### 2.8.4 File Upload Security

| Measure | Implementation |
|---------|----------------|
| **File Type Validation** | Whitelist: PDF, DOCX, PPTX, XLSX |
| **File Size Limit** | 10MB max |
| **Malware Scanning** | (Future) ClamAV integration |
| **Unique Filenames** | UUID + timestamp to prevent overwrite |
| **Separate Storage** | Outside webroot |

---

### 2.9 Scalability Considerations

#### 2.9.1 Horizontal Scaling

| Component | Strategy |
|-----------|----------|
| **Backend** | Stateless API servers behind load balancer |
| **Database** | Read replicas for queries, master for writes |
| **File Storage** | AWS S3 / Google Cloud Storage |
| **Session** | Redis for distributed sessions |

#### 2.9.2 Vertical Scaling

| Component | Strategy |
|-----------|----------|
| **Database** | Increase RAM, CPU for query performance |
| **App Server** | Increase Node.js worker processes |

#### 2.9.3 Microservices (Future)

Potential service separation:
- **Auth Service**: Authentication & authorization
- **Document Service**: Upload, search, download
- **Payment Service**: Stripe integration
- **Notification Service**: Email, push notifications
- **Recommendation Service**: ML-based recommendations

---

### 2.10 Technology Decision Rationale

#### Why React?
✅ Component-based architecture  
✅ Large ecosystem & community  
✅ Virtual DOM for performance  
✅ TypeScript support  
✅ Easy state management with Redux

#### Why PostgreSQL over MySQL/MongoDB?
✅ Native full-text search (tsvector)  
✅ Advanced indexing (GIN, GIST)  
✅ ACID transactions (critical for payments)  
✅ JSON support (flexible schema when needed)  
✅ Materialized views (pre-computed data)  
✅ Better for complex queries

#### Why Node.js + Express?
✅ JavaScript full-stack (same language frontend/backend)  
✅ Non-blocking I/O (great for API)  
✅ Large npm ecosystem  
✅ Easy integration with React  
✅ Fast development

#### Why Stripe over PayPal?
✅ Better developer experience  
✅ Comprehensive API documentation  
✅ Built-in fraud detection  
✅ Support for webhooks  
✅ Test mode with test cards  
✅ Lower fees for small transactions

#### Why JWT over Sessions?
✅ Stateless (easier to scale)  
✅ No server-side storage needed  
✅ Works across multiple servers  
✅ Mobile-friendly  
✅ Can include user claims

---

## 3. Thiết kế Database

### 3.1 Database Overview

**Database Management System**: PostgreSQL 14+  
**Total Tables**: 25+ tables  
**Database Size** (estimated with 10k users): ~5GB

**Key Features**:
- Full-text search với tsvector và GIN indexes
- Materialized views cho performance optimization
- Triggers cho auto-update timestamps và search vectors
- Foreign key constraints với CASCADE deletes
- Check constraints cho data integrity
- Composite indexes cho complex queries

---

### 3.2 Entity-Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHAREBUDDY DATABASE SCHEMA                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       USERS          │
├──────────────────────┤
│ PK user_id (UUID)    │
│    email (UNIQUE)    │
│    password_hash     │
│    username (UNIQUE) │
│    full_name         │
│    avatar_url        │
│    bio               │
│    university        │
│    major             │
│    role (ENUM)       │
│    credits (INT)     │
│    is_verified       │──────┐
│    google_id         │      │
│    facebook_id       │      │
│    email_verified    │      │
│    created_at        │      │
└──────────────────────┘      │
         │                    │
         │ 1                  │
         │                    │
         │ N                  │
         ▼                    │
┌──────────────────────┐      │
│     DOCUMENTS        │      │
├──────────────────────┤      │
│ PK document_id (UUID)│      │
│ FK author_id ────────┼──────┘
│    title             │
│    description       │
│    file_name         │
│    file_path         │
│    file_url          │
│    preview_url       │
│    thumbnail_url     │
│    file_size         │
│    file_type         │
│    category          │
│    subject           │
│    university        │
│    download_count    │
│    view_count        │
│    credit_cost       │
│    average_rating    │
│    rating_count      │
│    search_vector     │◄─── tsvector (full-text search)
│    is_public         │
│    status (ENUM)     │
│    created_at        │
└──────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌──────────────────────┐      ┌──────────────────────┐
│   DOCUMENT_RATINGS   │      │  DOCUMENT_COMMENTS   │
├──────────────────────┤      ├──────────────────────┤
│ PK rating_id (UUID)  │      │ PK comment_id (UUID) │
│ FK document_id       │      │ FK document_id       │
│ FK user_id           │      │ FK user_id           │
│    rating (1-5)      │      │ FK parent_comment_id │
│    review_text       │      │    content           │
│    created_at        │      │    likes_count       │
└──────────────────────┘      │    created_at        │
         │                    └──────────────────────┘
         │ UNIQUE(user_id, document_id)
         │
┌──────────────────────┐
│     QUESTIONS        │◄──────────────┐
├──────────────────────┤               │
│ PK question_id (UUID)│               │
│ FK document_id       │               │
│ FK user_id           │               │
│ FK accepted_answer_id│───┐           │
│    title             │   │           │
│    content           │   │           │
│    vote_count        │   │           │
│    answer_count      │   │           │
│    view_count        │   │           │
│    status (ENUM)     │   │           │
│    created_at        │   │           │
└──────────────────────┘   │           │
         │                 │           │
         │ 1               │           │
         │                 │           │
         │ N               │           │
         ▼                 │           │
┌──────────────────────┐   │           │
│      ANSWERS         │◄──┘           │
├──────────────────────┤               │
│ PK answer_id (UUID)  │───────────────┘
│ FK question_id       │
│ FK user_id           │
│    content           │
│    vote_count        │
│    is_best_answer    │
│    created_at        │
└──────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌──────────────────────┐      ┌──────────────────────┐
│   QUESTION_VOTES     │      │    ANSWER_VOTES      │
├──────────────────────┤      ├──────────────────────┤
│ PK vote_id (UUID)    │      │ PK vote_id (UUID)    │
│ FK question_id       │      │ FK answer_id         │
│ FK user_id           │      │ FK user_id           │
│    vote_type (-1,1)  │      │    vote_type (-1,1)  │
│    created_at        │      │    created_at        │
└──────────────────────┘      └──────────────────────┘
  UNIQUE(question_id, user_id)  UNIQUE(answer_id, user_id)

┌──────────────────────┐
│  PAYMENT_PACKAGES    │
├──────────────────────┤
│ PK package_id (UUID) │
│    name              │
│    credits           │
│    bonus_credits     │
│    price_usd         │
│    price_vnd         │
│    is_popular        │
│    is_active         │
│    created_at        │
└──────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌───────────────────────────┐
│  PAYMENT_TRANSACTIONS     │
├───────────────────────────┤
│ PK transaction_id (UUID)  │
│ FK user_id                │
│ FK package_id             │
│    stripe_payment_intent  │
│    stripe_customer_id     │
│    amount                 │
│    currency (USD/VND)     │
│    credits                │
│    status (ENUM)          │
│    payment_method         │
│    created_at             │
└───────────────────────────┘

┌──────────────────────┐
│ CREDIT_TRANSACTIONS  │
├──────────────────────┤
│ PK transaction_id    │
│ FK user_id           │
│    amount (+/-)      │
│    type (ENUM)       │
│    reference_id      │
│    description       │
│    created_at        │
└──────────────────────┘

┌──────────────────────┐      ┌──────────────────────┐
│     BOOKMARKS        │      │      DOWNLOADS       │
├──────────────────────┤      ├──────────────────────┤
│ PK bookmark_id       │      │ PK download_id       │
│ FK user_id           │      │ FK user_id           │
│ FK document_id       │      │ FK document_id       │
│    created_at        │      │    credits_used      │
└──────────────────────┘      │    download_date     │
  UNIQUE(user_id, doc_id)     └──────────────────────┘

┌──────────────────────┐
│    USER_FOLLOWS      │
├──────────────────────┤
│ PK follow_id         │
│ FK follower_id       │
│ FK following_id      │
│    created_at        │
└──────────────────────┘
  UNIQUE(follower_id, following_id)
  CHECK(follower_id != following_id)

┌──────────────────────────┐
│  VERIFIED_AUTHOR_REQUESTS│
├──────────────────────────┤
│ PK request_id (UUID)     │
│ FK user_id               │
│    portfolio_url         │
│    description           │
│    supporting_docs       │
│    status (ENUM)         │
│    admin_note            │
│ FK reviewed_by (admin)   │
│    reviewed_at           │
│    created_at            │
└──────────────────────────┘

┌──────────────────────┐
│  USER_INTERACTIONS   │
├──────────────────────┤
│ PK interaction_id    │
│ FK user_id           │
│ FK document_id       │
│    type (ENUM)       │
│    interaction_date  │
└──────────────────────┘
  Used for recommendations

┌──────────────────────┐
│   OAUTH_TOKENS       │
├──────────────────────┤
│ PK token_id          │
│ FK user_id           │
│    provider          │
│    access_token      │
│    refresh_token     │
│    expires_at        │
│    created_at        │
└──────────────────────┘

┌──────────────────────┐
│   NOTIFICATIONS      │
├──────────────────────┤
│ PK notification_id   │
│ FK user_id           │
│    type (ENUM)       │
│    title             │
│    message           │
│ FK related_doc_id    │
│ FK related_user_id   │
│    is_read           │
│    created_at        │
└──────────────────────┘

┌──────────────────────────┐
│   MATERIALIZED VIEWS     │
├──────────────────────────┤
│  user_similarity         │◄─── Collaborative filtering
│  document_statistics     │◄─── Aggregated stats
│  user_statistics         │◄─── User profile stats
└──────────────────────────┘
```

---

### 3.3 Table Definitions

#### 3.3.1 Core Tables

##### Table: users
**Purpose**: Store user account information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | PRIMARY KEY | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email (login) |
| password_hash | VARCHAR(255) | NULL | Bcrypt hashed password (NULL for OAuth) |
| username | VARCHAR(100) | UNIQUE, NOT NULL | Display username |
| full_name | VARCHAR(255) | NOT NULL | Full name |
| avatar_url | TEXT | NULL | Profile picture URL |
| bio | TEXT | NULL | User biography |
| university | VARCHAR(255) | NULL | University affiliation |
| major | VARCHAR(255) | NULL | Major/field of study |
| role | ENUM | DEFAULT 'user' | user, moderator, admin |
| credits | INTEGER | DEFAULT 50 | Virtual currency balance |
| is_verified | BOOLEAN | DEFAULT FALSE | Verified author status |
| google_id | VARCHAR(255) | UNIQUE | Google OAuth ID |
| facebook_id | VARCHAR(255) | UNIQUE | Facebook OAuth ID |
| email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| verification_token | VARCHAR(255) | NULL | Email verification token |
| verification_expires | TIMESTAMP | NULL | Token expiry |
| reset_token | VARCHAR(255) | NULL | Password reset token |
| reset_token_expires | TIMESTAMP | NULL | Reset token expiry |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |

**Indexes**:
- `idx_users_email` ON (email)
- `idx_users_username` ON (username)
- `idx_users_google_id` ON (google_id) WHERE google_id IS NOT NULL
- `idx_users_facebook_id` ON (facebook_id) WHERE facebook_id IS NOT NULL
- `idx_users_verification_token` ON (verification_token)
- `idx_users_reset_token` ON (reset_token)

##### Table: documents
**Purpose**: Store document metadata

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| document_id | UUID | PRIMARY KEY | Unique identifier |
| author_id | UUID | FK → users(user_id) ON DELETE CASCADE | Document owner |
| title | VARCHAR(500) | NOT NULL | Document title |
| description | TEXT | NULL | Document description |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_path | TEXT | NOT NULL | Storage path |
| file_url | TEXT | NULL | Public URL (if uploaded to CDN) |
| preview_url | TEXT | NULL | Preview file URL |
| thumbnail_url | TEXT | NULL | Thumbnail image URL |
| file_size | BIGINT | NOT NULL | File size in bytes |
| file_type | VARCHAR(50) | NOT NULL | MIME type (pdf, docx, etc.) |
| page_count | INTEGER | NULL | Number of pages |
| category | VARCHAR(100) | NULL | Lecture Notes, Exams, etc. |
| subject | VARCHAR(255) | NULL | Subject/course name |
| university | VARCHAR(255) | NULL | Associated university |
| tags | TEXT[] | NULL | Array of tags |
| download_count | INTEGER | DEFAULT 0 | Total downloads |
| view_count | INTEGER | DEFAULT 0 | Total views |
| credit_cost | INTEGER | DEFAULT 0 | Cost to download (credits) |
| average_rating | DECIMAL(3,2) | DEFAULT 0 | Average rating (0.00-5.00) |
| rating_count | INTEGER | DEFAULT 0 | Total ratings |
| search_vector | TSVECTOR | NULL | Full-text search vector |
| is_public | BOOLEAN | DEFAULT TRUE | Public visibility |
| status | ENUM | DEFAULT 'approved' | pending, approved, rejected |
| created_at | TIMESTAMP | DEFAULT NOW() | Upload date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- `idx_documents_author_id` ON (author_id)
- `idx_documents_category` ON (category)
- `idx_documents_subject` ON (subject)
- `idx_documents_university` ON (university)
- `idx_documents_search_vector` GIN (search_vector) ← Full-text search
- `idx_documents_created_at` ON (created_at DESC)
- `idx_documents_download_count` ON (download_count DESC)
- `idx_documents_average_rating` ON (average_rating DESC)
- `idx_documents_composite` ON (category, subject, average_rating DESC)

**Triggers**:
- `trigger_update_search_vector` BEFORE INSERT OR UPDATE
- `trigger_update_timestamp` BEFORE UPDATE

##### Table: document_ratings
**Purpose**: Store user ratings for documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| rating_id | UUID | PRIMARY KEY | Unique identifier |
| document_id | UUID | FK → documents ON DELETE CASCADE | Rated document |
| user_id | UUID | FK → users ON DELETE CASCADE | Rating author |
| rating | INTEGER | CHECK (1-5), NOT NULL | Star rating |
| review_text | TEXT | NULL | Optional review |
| created_at | TIMESTAMP | DEFAULT NOW() | Rating date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Constraints**:
- UNIQUE(user_id, document_id) ← One rating per user per document

**Indexes**:
- `idx_ratings_document_id` ON (document_id)
- `idx_ratings_user_id` ON (user_id)

#### 3.3.2 Q&A System Tables

##### Table: questions
**Purpose**: Store user questions on documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| question_id | UUID | PRIMARY KEY | Unique identifier |
| document_id | UUID | FK → documents ON DELETE CASCADE | Associated document |
| user_id | UUID | FK → users ON DELETE CASCADE | Question author |
| title | VARCHAR(500) | NOT NULL | Question title |
| content | TEXT | NOT NULL | Question details |
| accepted_answer_id | UUID | FK → answers ON DELETE SET NULL | Best answer (if selected) |
| vote_count | INTEGER | DEFAULT 0 | Net votes (upvotes - downvotes) |
| answer_count | INTEGER | DEFAULT 0 | Total answers |
| view_count | INTEGER | DEFAULT 0 | Total views |
| status | ENUM | DEFAULT 'active' | active, closed, deleted |
| created_at | TIMESTAMP | DEFAULT NOW() | Question date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- `idx_questions_document_id` ON (document_id)
- `idx_questions_user_id` ON (user_id)
- `idx_questions_created_at` ON (created_at DESC)
- `idx_questions_vote_count` ON (vote_count DESC)

##### Table: answers
**Purpose**: Store answers to questions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| answer_id | UUID | PRIMARY KEY | Unique identifier |
| question_id | UUID | FK → questions ON DELETE CASCADE | Parent question |
| user_id | UUID | FK → users ON DELETE CASCADE | Answer author |
| content | TEXT | NOT NULL | Answer content |
| vote_count | INTEGER | DEFAULT 0 | Net votes |
| is_best_answer | BOOLEAN | DEFAULT FALSE | Accepted as best answer |
| created_at | TIMESTAMP | DEFAULT NOW() | Answer date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- `idx_answers_question_id` ON (question_id)
- `idx_answers_user_id` ON (user_id)
- `idx_answers_is_best_answer` ON (is_best_answer) WHERE is_best_answer = TRUE

##### Table: question_votes & answer_votes
**Purpose**: Store votes on questions and answers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| vote_id | UUID | PRIMARY KEY | Unique identifier |
| question_id/answer_id | UUID | FK ON DELETE CASCADE | Voted item |
| user_id | UUID | FK → users ON DELETE CASCADE | Voter |
| vote_type | INTEGER | CHECK (-1 or 1) | -1 = downvote, 1 = upvote |
| created_at | TIMESTAMP | DEFAULT NOW() | Vote date |

**Constraints**:
- UNIQUE(question_id/answer_id, user_id) ← One vote per user per item

#### 3.3.3 Payment System Tables

##### Table: credit_packages
**Purpose**: Store available credit packages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| package_id | UUID | PRIMARY KEY | Unique identifier |
| name | VARCHAR(100) | NOT NULL | Package name |
| credits | INTEGER | NOT NULL | Base credits |
| bonus_credits | INTEGER | DEFAULT 0 | Bonus credits |
| price_usd | DECIMAL(10,2) | NOT NULL | Price in USD |
| price_vnd | INTEGER | NOT NULL | Price in VND |
| is_popular | BOOLEAN | DEFAULT FALSE | Popular badge |
| is_active | BOOLEAN | DEFAULT TRUE | Available for purchase |
| created_at | TIMESTAMP | DEFAULT NOW() | Created date |

**Sample Data**:
```sql
INSERT INTO credit_packages (name, credits, bonus_credits, price_usd, price_vnd) VALUES
('Starter', 50, 0, 0.99, 23000),
('Basic', 100, 10, 1.99, 46000),
('Popular', 250, 50, 4.99, 115000),
('Premium', 500, 150, 9.99, 230000),
('Ultimate', 1000, 500, 19.99, 460000);
```

##### Table: payment_transactions
**Purpose**: Store payment transaction history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| transaction_id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FK → users ON DELETE CASCADE | Purchaser |
| package_id | UUID | FK → credit_packages | Purchased package |
| stripe_payment_intent_id | VARCHAR(255) | UNIQUE | Stripe payment intent ID |
| stripe_customer_id | VARCHAR(255) | NULL | Stripe customer ID |
| amount | DECIMAL(10,2) | NOT NULL | Amount charged |
| currency | VARCHAR(3) | DEFAULT 'USD' | Currency code |
| credits | INTEGER | NOT NULL | Credits purchased |
| status | ENUM | DEFAULT 'pending' | pending, completed, failed, refunded |
| payment_method | VARCHAR(50) | NULL | Payment method type |
| metadata | JSONB | NULL | Additional metadata |
| created_at | TIMESTAMP | DEFAULT NOW() | Transaction date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- `idx_payment_transactions_user_id` ON (user_id)
- `idx_payment_transactions_stripe_payment_intent` ON (stripe_payment_intent_id)
- `idx_payment_transactions_status` ON (status)
- `idx_payment_transactions_created_at` ON (created_at DESC)

#### 3.3.4 Social & Interaction Tables

##### Table: user_follows
**Purpose**: Store user following relationships

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| follow_id | UUID | PRIMARY KEY | Unique identifier |
| follower_id | UUID | FK → users ON DELETE CASCADE | User who follows |
| following_id | UUID | FK → users ON DELETE CASCADE | User being followed |
| created_at | TIMESTAMP | DEFAULT NOW() | Follow date |

**Constraints**:
- UNIQUE(follower_id, following_id)
- CHECK(follower_id != following_id) ← Can't follow self

##### Table: bookmarks
**Purpose**: Store user bookmarked documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| bookmark_id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FK → users ON DELETE CASCADE | User |
| document_id | UUID | FK → documents ON DELETE CASCADE | Bookmarked document |
| created_at | TIMESTAMP | DEFAULT NOW() | Bookmark date |

**Constraints**:
- UNIQUE(user_id, document_id)

##### Table: user_interactions
**Purpose**: Track user interactions for recommendations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| interaction_id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FK → users ON DELETE CASCADE | User |
| document_id | UUID | FK → documents ON DELETE CASCADE | Interacted document |
| interaction_type | ENUM | NOT NULL | view, download, rate, comment |
| interaction_date | TIMESTAMP | DEFAULT NOW() | Interaction timestamp |

**Indexes**:
- `idx_interactions_user_id` ON (user_id)
- `idx_interactions_document_id` ON (document_id)
- `idx_interactions_type` ON (interaction_type)
- `idx_interactions_date` ON (interaction_date DESC)

#### 3.3.5 Additional Tables

##### Table: notifications
**Purpose**: Store user notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| notification_id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FK → users ON DELETE CASCADE | Recipient |
| type | ENUM | NOT NULL | payment_success, new_follower, etc. |
| title | VARCHAR(255) | NOT NULL | Notification title |
| message | TEXT | NULL | Notification content |
| related_document_id | UUID | FK → documents ON DELETE SET NULL | Related document |
| related_user_id | UUID | FK → users ON DELETE SET NULL | Related user |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| created_at | TIMESTAMP | DEFAULT NOW() | Notification date |

**Indexes**:
- `idx_notifications_user_id` ON (user_id)
- `idx_notifications_is_read` ON (is_read) WHERE is_read = FALSE
- `idx_notifications_created_at` ON (created_at DESC)

##### Table: verified_author_requests
**Purpose**: Store verification requests

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| request_id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FK → users ON DELETE CASCADE | Requester |
| portfolio_url | TEXT | NULL | Portfolio URL |
| description | TEXT | NOT NULL | Why deserve verification |
| supporting_docs | TEXT | NULL | Supporting documents |
| status | ENUM | DEFAULT 'pending' | pending, approved, rejected |
| admin_note | TEXT | NULL | Admin review note |
| reviewed_by | UUID | FK → users ON DELETE SET NULL | Reviewing admin |
| reviewed_at | TIMESTAMP | NULL | Review date |
| created_at | TIMESTAMP | DEFAULT NOW() | Request date |

**Indexes**:
- `idx_verified_requests_user_id` ON (user_id)
- `idx_verified_requests_status` ON (status)

---

### 3.4 Materialized Views

#### View: user_similarity
**Purpose**: Pre-compute user similarity for collaborative filtering

```sql
CREATE MATERIALIZED VIEW user_similarity AS
SELECT 
    u1.user_id AS user1_id,
    u2.user_id AS user2_id,
    COUNT(DISTINCT CASE WHEN ui1.interaction_type = ui2.interaction_type 
                   THEN ui1.document_id END) AS common_interactions,
    ROUND(
        COUNT(DISTINCT CASE WHEN ui1.interaction_type = ui2.interaction_type 
                       THEN ui1.document_id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT ui1.document_id) + 
               COUNT(DISTINCT ui2.document_id) - 
               COUNT(DISTINCT CASE WHEN ui1.interaction_type = ui2.interaction_type 
                              THEN ui1.document_id END), 0),
        4
    ) AS similarity_score
FROM user_interactions ui1
JOIN user_interactions ui2 ON ui1.document_id = ui2.document_id 
                            AND ui1.user_id != ui2.user_id
GROUP BY u1.user_id, u2.user_id
HAVING COUNT(DISTINCT CASE WHEN ui1.interaction_type = ui2.interaction_type 
                       THEN ui1.document_id END) >= 3;

CREATE INDEX idx_user_similarity_user1 ON user_similarity(user1_id);
CREATE INDEX idx_user_similarity_score ON user_similarity(similarity_score DESC);
```

**Refresh Strategy**: Daily via cron job

#### View: user_statistics
**Purpose**: Aggregate user statistics

```sql
CREATE MATERIALIZED VIEW user_statistics AS
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    COUNT(DISTINCT d.document_id) AS total_documents,
    COALESCE(SUM(d.download_count), 0) AS total_downloads,
    COALESCE(AVG(d.average_rating), 0) AS avg_document_rating,
    COUNT(DISTINCT f.follower_id) AS follower_count,
    COUNT(DISTINCT q.question_id) AS questions_asked,
    COUNT(DISTINCT a.answer_id) AS answers_given
FROM users u
LEFT JOIN documents d ON d.author_id = u.user_id
LEFT JOIN user_follows f ON f.following_id = u.user_id
LEFT JOIN questions q ON q.user_id = u.user_id
LEFT JOIN answers a ON a.user_id = u.user_id
GROUP BY u.user_id, u.username, u.full_name;
```

---

### 3.5 Database Functions & Triggers

#### Function: update_document_rating
**Purpose**: Recalculate document average rating after rating insert/update/delete

```sql
CREATE OR REPLACE FUNCTION update_document_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE documents SET
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM document_ratings
            WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM document_ratings
            WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
        )
    WHERE document_id = COALESCE(NEW.document_id, OLD.document_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_rating
AFTER INSERT OR UPDATE OR DELETE ON document_ratings
FOR EACH ROW EXECUTE FUNCTION update_document_rating();
```

#### Function: update_search_vector
**Purpose**: Auto-update search vector when document metadata changes

```sql
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

#### Function: update_timestamp
**Purpose**: Auto-update updated_at column

```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to multiple tables
CREATE TRIGGER trigger_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_timestamp
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- ... (apply to other tables)
```

#### Function: calculate_credit_reward
**Purpose**: Calculate credit reward with verified author multiplier

```sql
CREATE OR REPLACE FUNCTION calculate_credit_reward(
    base_amount INTEGER,
    user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    multiplier DECIMAL(3,2);
BEGIN
    SELECT CASE WHEN is_verified THEN 1.5 ELSE 1.0 END
    INTO multiplier
    FROM users
    WHERE users.user_id = calculate_credit_reward.user_id;
    
    RETURN ROUND(base_amount * multiplier);
END;
$$ LANGUAGE plpgsql;
```

---

### 3.6 Database Indexes Strategy

#### Index Types Used

| Index Type | Use Case | Example |
|------------|----------|---------|
| **B-tree** | Primary keys, foreign keys, equality/range queries | `idx_users_email` |
| **GIN** | Full-text search, array columns | `idx_documents_search_vector` |
| **Partial** | Conditional indexes for filtered queries | `idx_notifications_unread` WHERE is_read = FALSE |
| **Composite** | Multi-column queries | `idx_documents_category_subject_rating` |

#### Performance Indexes

```sql
-- Documents search optimization
CREATE INDEX idx_documents_search_vector ON documents USING GIN(search_vector);
CREATE INDEX idx_documents_composite ON documents(category, subject, average_rating DESC);

-- Q&A performance
CREATE INDEX idx_questions_document_vote ON questions(document_id, vote_count DESC);
CREATE INDEX idx_answers_question_best ON answers(question_id, is_best_answer, vote_count DESC);

-- Payment history
CREATE INDEX idx_payment_transactions_user_date ON payment_transactions(user_id, created_at DESC);

-- Recommendations
CREATE INDEX idx_interactions_user_type_date ON user_interactions(user_id, interaction_type, interaction_date DESC);
```

---

### 3.7 Data Integrity Constraints

#### Check Constraints

```sql
-- Ensure credits are non-negative
ALTER TABLE users ADD CONSTRAINT chk_credits_positive CHECK (credits >= 0);

-- Ensure ratings are 1-5
ALTER TABLE document_ratings ADD CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5);

-- Ensure document cost is non-negative
ALTER TABLE documents ADD CONSTRAINT chk_credit_cost_positive CHECK (credit_cost >= 0);

-- Ensure average rating is 0-5
ALTER TABLE documents ADD CONSTRAINT chk_average_rating CHECK (average_rating BETWEEN 0 AND 5);

-- Ensure vote type is -1 or 1
ALTER TABLE question_votes ADD CONSTRAINT chk_vote_type CHECK (vote_type IN (-1, 1));
```

#### Foreign Key Cascade Rules

| Parent Table | Child Table | On Delete | Rationale |
|--------------|-------------|-----------|-----------|
| users | documents | CASCADE | Delete user's documents when user deleted |
| users | questions | CASCADE | Delete user's questions when user deleted |
| documents | questions | CASCADE | Delete questions when document deleted |
| questions | answers | CASCADE | Delete answers when question deleted |
| users | bookmarks | CASCADE | Delete bookmarks when user deleted |
| users | payment_transactions | CASCADE | Keep transaction history with user |

---

### 3.8 Database Security

#### Row-Level Security (Future Enhancement)

```sql
-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see public documents or own documents
CREATE POLICY documents_select_policy ON documents
FOR SELECT
USING (
    is_public = TRUE 
    OR author_id = current_setting('app.current_user_id')::UUID
);

-- Policy: Users can only update own documents
CREATE POLICY documents_update_policy ON documents
FOR UPDATE
USING (author_id = current_setting('app.current_user_id')::UUID);
```

#### Sensitive Data Encryption

| Column | Encryption Method |
|--------|-------------------|
| password_hash | Bcrypt (12 rounds) - application layer |
| email | Stored in plaintext (required for login, but indexed) |
| payment data | Never stored (handled by Stripe) |

---

### 3.9 Backup & Recovery Strategy

#### Backup Plan

| Backup Type | Frequency | Retention | Method |
|-------------|-----------|-----------|--------|
| **Full Backup** | Daily 2 AM | 30 days | `pg_dump` |
| **Incremental** | Every 6 hours | 7 days | WAL archiving |
| **Transaction Log** | Continuous | 7 days | WAL streaming |

#### Backup Commands

```bash
# Full backup
pg_dump -Fc sharebuddy_db > backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -d sharebuddy_db -c backup_20251214.dump

# Point-in-time recovery (with WAL)
pg_basebackup -D /backup/base -Ft -z -P
```

---

### 3.10 Database Scalability

#### Horizontal Scaling (Read Replicas)

```
┌─────────────┐
│   Master    │ ← Writes
│  (Primary)  │
└─────────────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌─────────────┐  ┌─────────────┐
│  Replica 1  │  │  Replica 2  │ ← Reads
│   (Slave)   │  │   (Slave)   │
└─────────────┘  └─────────────┘
```

**Use Cases**:
- Replica 1: Search queries, document listings
- Replica 2: Analytics, reporting, recommendations

#### Partitioning Strategy (Future)

```sql
-- Partition large tables by date
CREATE TABLE user_interactions_2025_01 PARTITION OF user_interactions
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE user_interactions_2025_02 PARTITION OF user_interactions
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... monthly partitions
```

**Benefits**:
- Faster queries (scan only relevant partitions)
- Easier archiving (drop old partitions)
- Improved maintenance (vacuum/analyze per partition)

---

### 3.11 Query Optimization Examples

#### Example 1: Document Search with Filters

```sql
-- Optimized search query
EXPLAIN ANALYZE
SELECT 
    d.document_id,
    d.title,
    d.description,
    d.average_rating,
    d.download_count,
    u.username,
    u.is_verified,
    ts_rank(d.search_vector, query) AS relevance
FROM documents d
JOIN users u ON d.author_id = u.user_id,
     to_tsquery('english', 'algorithm | programming') AS query
WHERE 
    d.search_vector @@ query
    AND d.category = 'Lecture Notes'
    AND d.average_rating >= 4.0
    AND d.is_public = TRUE
ORDER BY relevance DESC, d.download_count DESC
LIMIT 20;
```

**Indexes Used**:
- `idx_documents_search_vector` (GIN) ← Fast full-text search
- `idx_documents_composite` (category, average_rating) ← Filter optimization

#### Example 2: Personalized Recommendations

```sql
-- Find similar users and their documents
SELECT DISTINCT
    d.document_id,
    d.title,
    d.average_rating,
    SUM(us.similarity_score) AS recommendation_score
FROM user_similarity us
JOIN user_interactions ui ON ui.user_id = us.user2_id
JOIN documents d ON d.document_id = ui.document_id
WHERE 
    us.user1_id = 'current_user_uuid'
    AND ui.document_id NOT IN (
        SELECT document_id 
        FROM user_interactions 
        WHERE user_id = 'current_user_uuid'
    )
GROUP BY d.document_id, d.title, d.average_rating
ORDER BY recommendation_score DESC
LIMIT 10;
```

**Performance**:
- Uses materialized view `user_similarity` (pre-computed)
- Index on `user_similarity(user1_id)`

---

---

## 4. Cấu trúc Hệ thống

### 4.1 System Architecture Overview

ShareBuddy sử dụng **3-Tier Architecture** với sự phân tách rõ ràng giữa Presentation, Business Logic và Data Access Layer.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER (Frontend)                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       React 19 + TypeScript                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │   Pages    │  │ Components │  │   Redux    │  │  Services  │ │  │
│  │  │            │  │            │  │   Store    │  │   (API)    │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/HTTPS (REST API)
                                    │ JSON
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION TIER (Backend)                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Node.js + Express.js                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │   Routes   │→ │Controllers │→ │  Services  │→ │ Middleware │ │  │
│  │  │            │  │            │  │            │  │            │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SQL Queries
                                    │ Connection Pool
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA TIER (Database)                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        PostgreSQL 14+                             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │   Tables   │  │  Indexes   │  │  Triggers  │  │ Functions  │ │  │
│  │  │            │  │            │  │            │  │            │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐    │
│  │   Stripe   │   │   Gmail    │   │   Google   │   │  Facebook  │    │
│  │  (Payment) │   │  (Email)   │   │  (OAuth)   │   │   (OAuth)  │    │
│  └────────────┘   └────────────┘   └────────────┘   └────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Backend Architecture

#### 4.2.1 Folder Structure (MVC Pattern)

```
backend/
├── src/
│   ├── app.js                    # Main Express application
│   ├── config/
│   │   ├── config.js             # Environment configuration
│   │   ├── database.js           # PostgreSQL connection pool
│   │   └── passport.js           # Passport OAuth strategies
│   │
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication middleware
│   │   ├── upload.js             # Multer file upload configuration
│   │   └── errorHandler.js      # Global error handling
│   │
│   ├── routes/                   # API route definitions
│   │   ├── authRoutes.js         # POST /api/auth/register, /login
│   │   ├── userRoutes.js         # GET/PUT /api/users/:id
│   │   ├── documentRoutes.js     # CRUD /api/documents
│   │   ├── questionRoutes.js     # Q&A endpoints
│   │   ├── paymentRoutes.js      # Stripe payment endpoints
│   │   ├── searchRoutes.js       # Full-text search
│   │   ├── recommendationRoutes.js # Recommendation engine
│   │   ├── verifiedAuthorRoutes.js # Author verification
│   │   ├── previewRoutes.js      # Document preview generation
│   │   ├── ratingRoutes.js       # Rating & review
│   │   ├── commentRoutes.js      # Comments
│   │   ├── creditRoutes.js       # Credit transactions
│   │   ├── socialRoutes.js       # Follow/bookmark
│   │   └── adminRoutes.js        # Admin panel
│   │
│   ├── controllers/              # Request handlers (business logic)
│   │   ├── authController.js     # Registration, login, OAuth
│   │   ├── userController.js     # User profile, statistics
│   │   ├── documentController.js # Document CRUD, upload
│   │   ├── questionController.js # Q&A logic
│   │   ├── paymentController.js  # Stripe webhooks
│   │   ├── searchController.js   # Search implementation
│   │   ├── recommendationController.js # Collaborative filtering
│   │   ├── verifiedAuthorController.js # Verification requests
│   │   ├── previewController.js  # PDF preview/thumbnail
│   │   ├── ratingController.js   # Rating CRUD
│   │   ├── commentController.js  # Comment CRUD
│   │   ├── creditController.js   # Credit history
│   │   ├── socialController.js   # Follow/bookmark logic
│   │   └── adminController.js    # Admin operations
│   │
│   ├── services/                 # Business logic layer
│   │   ├── emailService.js       # Nodemailer integration
│   │   ├── paymentService.js     # Stripe API calls
│   │   ├── searchService.js      # PostgreSQL full-text search
│   │   ├── recommendationService.js # Recommendation algorithms
│   │   └── verifiedAuthorService.js # Verification workflow
│   │
│   └── utils/
│       └── tokenUtils.js         # JWT helper functions
│
├── uploads/                      # File storage (documents)
│   ├── documents/                # Original files
│   ├── previews/                 # PDF previews
│   └── thumbnails/               # Document thumbnails
│
├── package.json                  # Dependencies
├── .env                          # Environment variables
├── .env.example                  # Environment template
└── Dockerfile                    # Docker container config
```

#### 4.2.2 Request Flow (Example: Document Upload)

```
┌────────────┐
│   Client   │
└────────────┘
      │
      │ POST /api/documents (multipart/form-data)
      │ Headers: Authorization: Bearer <JWT>
      │
      ▼
┌────────────────────────────────────────────────────────────┐
│  1. Middleware Chain                                       │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
│  │   CORS    │→ │ Rate Limit│→ │   Auth    │            │
│  │           │  │           │  │ (JWT)     │            │
│  └───────────┘  └───────────┘  └───────────┘            │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  2. Route Handler: /api/documents                          │
│     documentRoutes.js                                      │
│     router.post('/', auth, upload.single('file'), ...)    │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  3. Multer Middleware: upload.js                           │
│     - Save file to uploads/documents/                      │
│     - Validate file type (PDF, DOCX, etc.)                │
│     - Check file size (max 50MB)                          │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  4. Controller: documentController.createDocument()        │
│     - Extract file metadata (size, type, name)            │
│     - Call previewService.generatePreview()               │
│     - Call previewService.generateThumbnail()             │
│     - Prepare document data                               │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  5. Database Query: INSERT INTO documents                  │
│     - Save metadata to PostgreSQL                         │
│     - Trigger: update_search_vector()                     │
│     - Return document_id                                  │
└────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│  6. Response to Client                                     │
│     {                                                      │
│       "success": true,                                    │
│       "document": {                                       │
│         "document_id": "uuid",                           │
│         "title": "...",                                  │
│         "file_url": "/uploads/documents/..."            │
│       }                                                   │
│     }                                                     │
└────────────────────────────────────────────────────────────┘
```

#### 4.2.3 API Endpoints Summary

| Module | Endpoint | Method | Description | Auth Required |
|--------|----------|--------|-------------|---------------|
| **Auth** | `/api/auth/register` | POST | User registration | No |
| | `/api/auth/login` | POST | Login with email/password | No |
| | `/api/auth/verify-email/:token` | GET | Email verification | No |
| | `/api/auth/forgot-password` | POST | Send reset email | No |
| | `/api/auth/reset-password/:token` | POST | Reset password | No |
| | `/api/auth/google` | GET | Google OAuth | No |
| | `/api/auth/facebook` | GET | Facebook OAuth | No |
| **Users** | `/api/users/me` | GET | Get current user profile | Yes |
| | `/api/users/:id` | GET | Get user by ID | No |
| | `/api/users/:id` | PUT | Update user profile | Yes (own) |
| | `/api/users/:id/avatar` | PUT | Update avatar | Yes (own) |
| **Documents** | `/api/documents` | GET | List documents (paginated) | No |
| | `/api/documents/:id` | GET | Get document details | No |
| | `/api/documents` | POST | Upload document | Yes |
| | `/api/documents/:id` | PUT | Update document | Yes (owner) |
| | `/api/documents/:id` | DELETE | Delete document | Yes (owner) |
| | `/api/documents/:id/download` | POST | Download document (deduct credits) | Yes |
| | `/api/documents/:id/view` | POST | Increment view count | No |
| **Search** | `/api/search` | GET | Full-text search documents | No |
| | `/api/search/suggestions` | GET | Search autocomplete | No |
| **Q&A** | `/api/questions` | GET | List questions by document | No |
| | `/api/questions` | POST | Ask question | Yes |
| | `/api/questions/:id/answers` | POST | Post answer | Yes |
| | `/api/questions/:id/vote` | POST | Upvote/downvote | Yes |
| **Payment** | `/api/payment/packages` | GET | List credit packages | No |
| | `/api/payment/create-payment-intent` | POST | Create Stripe payment | Yes |
| | `/api/payment/webhook` | POST | Stripe webhook | No (Stripe) |
| | `/api/payment/history` | GET | Payment transaction history | Yes |
| **Recommendations** | `/api/recommendations` | GET | Personalized recommendations | Yes |
| **Verified Author** | `/api/verified-author/request` | POST | Submit verification request | Yes |
| | `/api/verified-author/requests` | GET | List verification requests | Admin |
| | `/api/verified-author/approve/:id` | PUT | Approve request | Admin |

---

### 4.3 Frontend Architecture

#### 4.3.1 Folder Structure (React + TypeScript)

```
frontend/
├── public/
│   ├── index.html                # HTML template
│   ├── favicon.ico               # App icon
│   └── robots.txt                # SEO
│
├── src/
│   ├── index.tsx                 # React app entry point
│   ├── App.tsx                   # Root component with routing
│   ├── App.css                   # Global styles
│   │
│   ├── pages/                    # Page components (routes)
│   │   ├── HomePage.tsx          # Landing page
│   │   ├── SearchPage.tsx        # Search results
│   │   ├── PurchaseCreditsPage.tsx # Buy credits
│   │   ├── PaymentHistoryPage.tsx  # Transaction history
│   │   ├── QuestionDetailPage.tsx  # Q&A detail
│   │   ├── VerifiedAuthorRequestPage.tsx # Verification form
│   │   ├── VerifiedAuthorsPage.tsx # List verified authors
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx     # Login form
│   │   │   ├── RegisterPage.tsx  # Registration form
│   │   │   ├── VerifyEmailPage.tsx # Email verification
│   │   │   ├── ForgotPasswordPage.tsx # Password reset request
│   │   │   ├── ResetPasswordPage.tsx  # Password reset
│   │   │   └── OAuthSuccessPage.tsx   # OAuth callback
│   │   │
│   │   ├── documents/
│   │   │   ├── DocumentsPage.tsx     # Document listing
│   │   │   ├── DocumentDetailPage.tsx # Document view
│   │   │   └── UploadPage.tsx        # Document upload
│   │   │
│   │   ├── user/
│   │   │   ├── ProfilePage.tsx       # User profile
│   │   │   └── DashboardPage.tsx     # User dashboard
│   │   │
│   │   └── admin/
│   │       └── AdminPage.tsx         # Admin panel
│   │
│   ├── components/               # Reusable UI components
│   │   ├── layout/
│   │   │   ├── Navbar.tsx            # Navigation bar
│   │   │   ├── Footer.tsx            # Footer
│   │   │   └── Sidebar.tsx           # Sidebar menu
│   │   │
│   │   ├── auth/
│   │   │   ├── ProtectedRoute.tsx    # Route guard
│   │   │   └── OAuthButtons.tsx      # Google/Facebook login
│   │   │
│   │   ├── documents/
│   │   │   ├── DocumentCard.tsx      # Document preview card
│   │   │   ├── DocumentList.tsx      # Document grid/list
│   │   │   ├── DocumentFilter.tsx    # Filter/sort controls
│   │   │   ├── UploadForm.tsx        # Upload form
│   │   │   └── DocumentPreview.tsx   # PDF preview viewer
│   │   │
│   │   ├── ratings/
│   │   │   ├── RatingStars.tsx       # Star rating display
│   │   │   └── RatingForm.tsx        # Rate document form
│   │   │
│   │   ├── comments/
│   │   │   ├── CommentList.tsx       # Comment thread
│   │   │   └── CommentForm.tsx       # Post comment
│   │   │
│   │   ├── user/
│   │   │   ├── UserCard.tsx          # User profile card
│   │   │   └── CreditDisplay.tsx     # Credit balance
│   │   │
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx    # Loading indicator
│   │   │   ├── Pagination.tsx        # Pagination controls
│   │   │   ├── SearchBar.tsx         # Search input
│   │   │   └── ErrorMessage.tsx      # Error display
│   │   │
│   │   └── QuestionList.tsx          # Q&A list
│   │
│   ├── store/                    # Redux state management
│   │   ├── index.ts              # Configure store
│   │   ├── authSlice.ts          # Auth state (user, token)
│   │   ├── documentSlice.ts      # Document state
│   │   ├── searchSlice.ts        # Search state
│   │   └── paymentSlice.ts       # Payment state
│   │
│   ├── services/                 # API communication
│   │   ├── api.ts                # Axios instance with interceptors
│   │   ├── authService.ts        # Auth API calls
│   │   ├── documentService.ts    # Document API calls
│   │   ├── userService.ts        # User API calls
│   │   ├── searchService.ts      # Search API calls
│   │   ├── paymentService.ts     # Payment API calls
│   │   └── questionService.ts    # Q&A API calls
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts            # Authentication hook
│   │   ├── useDebounce.ts        # Debounce hook
│   │   └── usePagination.ts      # Pagination hook
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── user.ts               # User types
│   │   ├── document.ts           # Document types
│   │   ├── payment.ts            # Payment types
│   │   └── api.ts                # API response types
│   │
│   ├── utils/                    # Utility functions
│   │   ├── formatters.ts         # Date, number formatters
│   │   ├── validators.ts         # Form validation
│   │   └── constants.ts          # App constants
│   │
│   └── styles/                   # CSS/SCSS styles
│       ├── variables.css         # CSS variables
│       └── themes.css            # Theme styles
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── .env                          # Environment variables
└── Dockerfile                    # Docker container config
```

#### 4.3.2 Component Hierarchy (Example: Document Detail Page)

```
DocumentDetailPage
├── Navbar (layout)
│   ├── SearchBar (common)
│   ├── UserMenu
│   └── CreditDisplay (user)
│
├── Document Info Section
│   ├── Document Metadata
│   │   ├── Title
│   │   ├── Author (UserCard)
│   │   ├── RatingStars (ratings)
│   │   └── Download Count
│   │
│   └── Action Buttons
│       ├── Download Button
│       ├── Bookmark Button
│       └── Share Button
│
├── DocumentPreview (PDF viewer)
│   └── react-pdf integration
│
├── RatingForm (ratings)
│   └── Star selector + review text
│
├── CommentList (comments)
│   ├── CommentForm
│   └── Comment Items (nested)
│       ├── Reply Button
│       └── Like Button
│
├── QuestionList
│   ├── Ask Question Button
│   └── Question Items
│       ├── Vote Buttons
│       └── Answer List
│
└── Recommendations Section
    └── DocumentList (similar documents)
        └── DocumentCard[]
```

#### 4.3.3 State Management (Redux)

```typescript
// Store Structure
{
  auth: {
    user: {
      user_id: string,
      email: string,
      username: string,
      credits: number,
      role: 'user' | 'moderator' | 'admin',
      is_verified: boolean
    },
    token: string | null,
    isAuthenticated: boolean,
    loading: boolean,
    error: string | null
  },
  
  documents: {
    list: Document[],
    currentDocument: Document | null,
    loading: boolean,
    error: string | null,
    pagination: {
      page: number,
      limit: number,
      total: number
    }
  },
  
  search: {
    query: string,
    results: Document[],
    filters: {
      category: string,
      subject: string,
      rating: number
    },
    loading: boolean
  },
  
  payment: {
    packages: CreditPackage[],
    history: PaymentTransaction[],
    loading: boolean
  }
}
```

---

### 4.4 Authentication Flow

#### 4.4.1 JWT Authentication

```
┌─────────────┐                              ┌─────────────┐
│   Client    │                              │   Backend   │
└─────────────┘                              └─────────────┘
      │                                              │
      │  POST /api/auth/login                       │
      │  { email, password }                        │
      ├─────────────────────────────────────────────►
      │                                              │
      │                                   1. Validate credentials
      │                                   2. Query database
      │                                   3. Compare bcrypt hash
      │                                              │
      │  ◄─────────────────────────────────────────┤
      │  { token: "JWT", user: {...} }              │
      │                                              │
      │  Store token in localStorage                │
      │                                              │
      │  GET /api/documents                         │
      │  Headers: Authorization: Bearer <JWT>       │
      ├─────────────────────────────────────────────►
      │                                              │
      │                                   1. Extract JWT from header
      │                                   2. Verify signature
      │                                   3. Decode payload
      │                                   4. Check expiration
      │                                   5. Fetch user from DB
      │                                              │
      │  ◄─────────────────────────────────────────┤
      │  { documents: [...] }                       │
      │                                              │
```

**JWT Payload**:
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1702531200,
  "exp": 1702617600
}
```

#### 4.4.2 OAuth 2.0 Flow (Google)

```
┌────────┐          ┌────────┐          ┌────────┐          ┌────────┐
│ Client │          │Backend │          │ Google │          │  DB    │
└────────┘          └────────┘          └────────┘          └────────┘
    │                   │                   │                   │
    │ Click "Login      │                   │                   │
    │ with Google"      │                   │                   │
    ├──────────────────►│                   │                   │
    │                   │                   │                   │
    │                   │ Redirect to       │                   │
    │                   │ Google OAuth      │                   │
    │ ◄─────────────────┤                   │                   │
    │                   │                   │                   │
    │ User authorizes   │                   │                   │
    ├──────────────────────────────────────►│                   │
    │                   │                   │                   │
    │                   │ ◄─────────────────┤                   │
    │                   │ Authorization code│                   │
    │                   │                   │                   │
    │                   │ Exchange code     │                   │
    │                   │ for access token  │                   │
    │                   ├──────────────────►│                   │
    │                   │                   │                   │
    │                   │ ◄─────────────────┤                   │
    │                   │ Access token      │                   │
    │                   │                   │                   │
    │                   │ Get user profile  │                   │
    │                   ├──────────────────►│                   │
    │                   │                   │                   │
    │                   │ ◄─────────────────┤                   │
    │                   │ { email, name }   │                   │
    │                   │                   │                   │
    │                   │ Check if user exists                  │
    │                   ├──────────────────────────────────────►│
    │                   │                   │                   │
    │                   │ ◄─────────────────────────────────────┤
    │                   │ User data or create new               │
    │                   │                   │                   │
    │                   │ Generate JWT      │                   │
    │                   │                   │                   │
    │ ◄─────────────────┤                   │                   │
    │ Redirect with JWT │                   │                   │
    │                   │                   │                   │
```

---

### 4.5 Payment Flow (Stripe Integration)

```
┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐
│ Client │       │Backend │       │ Stripe │       │   DB   │
└────────┘       └────────┘       └────────┘       └────────┘
    │                 │                 │                 │
    │ Select credit   │                 │                 │
    │ package         │                 │                 │
    ├────────────────►│                 │                 │
    │                 │                 │                 │
    │                 │ Create Payment  │                 │
    │                 │ Intent          │                 │
    │                 ├────────────────►│                 │
    │                 │                 │                 │
    │                 │ ◄───────────────┤                 │
    │                 │ clientSecret    │                 │
    │                 │                 │                 │
    │ ◄───────────────┤                 │                 │
    │ clientSecret    │                 │                 │
    │                 │                 │                 │
    │ Stripe Element  │                 │                 │
    │ (enter card)    │                 │                 │
    │                 │                 │                 │
    │ Confirm payment │                 │                 │
    ├─────────────────────────────────►│                 │
    │                 │                 │                 │
    │                 │                 │ Process payment │
    │                 │                 │                 │
    │                 │ ◄───────────────┤                 │
    │                 │ Webhook         │                 │
    │                 │ (payment_       │                 │
    │                 │  intent.        │                 │
    │                 │  succeeded)     │                 │
    │                 │                 │                 │
    │                 │ Update user     │                 │
    │                 │ credits         │                 │
    │                 ├────────────────────────────────────►
    │                 │                 │                 │
    │                 │ Create payment  │                 │
    │                 │ transaction     │                 │
    │                 │ record          │                 │
    │                 ├────────────────────────────────────►
    │                 │                 │                 │
    │ ◄───────────────┤                 │                 │
    │ Payment success │                 │                 │
    │ Redirect        │                 │                 │
    │                 │                 │                 │
```

---

### 4.6 Document Upload & Processing Flow

```
┌────────┐       ┌────────┐       ┌─────────┐       ┌────────┐
│ Client │       │Backend │       │ Multer  │       │   DB   │
└────────┘       └────────┘       └─────────┘       └────────┘
    │                 │                 │                 │
    │ Select file     │                 │                 │
    │ Fill metadata   │                 │                 │
    │                 │                 │                 │
    │ POST /api/      │                 │                 │
    │ documents       │                 │                 │
    │ (multipart)     │                 │                 │
    ├────────────────►│                 │                 │
    │                 │                 │                 │
    │                 │ Validate file   │                 │
    │                 │ (type, size)    │                 │
    │                 ├────────────────►│                 │
    │                 │                 │                 │
    │                 │ Save to         │                 │
    │                 │ uploads/        │                 │
    │                 │ documents/      │                 │
    │                 │ ◄───────────────┤                 │
    │                 │ file path       │                 │
    │                 │                 │                 │
    │                 │ Generate        │                 │
    │                 │ preview (PDF)   │                 │
    │                 │ using pdf-lib   │                 │
    │                 │                 │                 │
    │                 │ Generate        │                 │
    │                 │ thumbnail       │                 │
    │                 │ using Sharp     │                 │
    │                 │                 │                 │
    │                 │ INSERT INTO     │                 │
    │                 │ documents       │                 │
    │                 ├────────────────────────────────────►
    │                 │                 │                 │
    │                 │ Trigger:        │                 │
    │                 │ update_search_  │                 │
    │                 │ vector()        │                 │
    │                 │ ◄───────────────────────────────────
    │                 │                 │                 │
    │ ◄───────────────┤                 │                 │
    │ { document_id,  │                 │                 │
    │   file_url,     │                 │                 │
    │   preview_url } │                 │                 │
    │                 │                 │                 │
```

---

### 4.7 Search Architecture

#### 4.7.1 Full-Text Search Flow

```
┌────────┐       ┌────────┐       ┌────────────┐
│ Client │       │Backend │       │ PostgreSQL │
└────────┘       └────────┘       └────────────┘
    │                 │                 │
    │ Type search     │                 │
    │ query           │                 │
    │                 │                 │
    │ GET /api/search?│                 │
    │ q=algorithm&    │                 │
    │ category=       │                 │
    │ Lecture Notes   │                 │
    ├────────────────►│                 │
    │                 │                 │
    │                 │ SELECT * FROM   │
    │                 │ documents WHERE │
    │                 │ search_vector   │
    │                 │ @@ to_tsquery   │
    │                 │ ('algorithm')   │
    │                 │ AND category=   │
    │                 │ 'Lecture Notes' │
    │                 │ ORDER BY        │
    │                 │ ts_rank(...)    │
    │                 ├────────────────►│
    │                 │                 │
    │                 │                 │ Use GIN index
    │                 │                 │ Fast lookup
    │                 │                 │
    │                 │ ◄───────────────┤
    │                 │ Results         │
    │                 │                 │
    │ ◄───────────────┤                 │
    │ { documents: [] }                 │
    │                 │                 │
```

**Search Vector Generation** (Automatic via Trigger):
```sql
-- Weighted full-text search vector
search_vector = 
    setweight(to_tsvector('english', title), 'A') ||        -- Weight A (highest)
    setweight(to_tsvector('english', description), 'B') ||  -- Weight B
    setweight(to_tsvector('english', subject), 'C') ||      -- Weight C
    setweight(to_tsvector('english', tags), 'D')            -- Weight D (lowest)
```

---

### 4.8 Recommendation System Architecture

#### 4.8.1 Collaborative Filtering Algorithm

```
┌───────────────────────────────────────────────────────────────┐
│                  Recommendation Pipeline                       │
└───────────────────────────────────────────────────────────────┘

Step 1: Collect User Interactions
┌────────────────────────────────┐
│  user_interactions table       │
│  - user_id                     │
│  - document_id                 │
│  - interaction_type            │
│    (view, download, rate)      │
│  - interaction_date            │
└────────────────────────────────┘
            │
            ▼
Step 2: Calculate User Similarity (Materialized View)
┌────────────────────────────────┐
│  user_similarity               │
│  - user1_id                    │
│  - user2_id                    │
│  - common_interactions         │
│  - similarity_score            │
│    (Jaccard similarity)        │
└────────────────────────────────┘
            │
            ▼
Step 3: Find Similar Users
┌────────────────────────────────┐
│  SELECT user2_id               │
│  FROM user_similarity          │
│  WHERE user1_id = current_user │
│  ORDER BY similarity_score DESC│
│  LIMIT 10                      │
└────────────────────────────────┘
            │
            ▼
Step 4: Recommend Documents from Similar Users
┌────────────────────────────────┐
│  SELECT documents              │
│  WHERE document_id IN (        │
│    SELECT document_id          │
│    FROM user_interactions      │
│    WHERE user_id IN (          │
│      similar_users)            │
│  )                             │
│  AND document_id NOT IN (      │
│    SELECT document_id          │
│    FROM user_interactions      │
│    WHERE user_id = current_user│
│  )                             │
└────────────────────────────────┘
            │
            ▼
Step 5: Rank by Popularity & Relevance
┌────────────────────────────────┐
│  ORDER BY                      │
│    recommendation_score DESC,  │
│    download_count DESC,        │
│    average_rating DESC         │
│  LIMIT 20                      │
└────────────────────────────────┘
```

**Jaccard Similarity Formula**:
```
similarity_score = 
    |interactions(user1) ∩ interactions(user2)| 
    ────────────────────────────────────────────
    |interactions(user1) ∪ interactions(user2)|
```

---

### 4.9 Security Architecture

#### 4.9.1 Security Layers

```
┌────────────────────────────────────────────────────────────┐
│  Layer 1: Network Security                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  - HTTPS (TLS 1.3)                                   │ │
│  │  - CORS policy (whitelist frontend domain)          │ │
│  │  - Rate limiting (100 req/15min per IP)             │ │
│  │  - Helmet.js (security headers)                     │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 2: Authentication & Authorization                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  - JWT tokens (HS256, 24h expiry)                   │ │
│  │  - Bcrypt password hashing (12 rounds)              │ │
│  │  - OAuth 2.0 (Google, Facebook)                     │ │
│  │  - Role-based access control (RBAC)                 │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 3: Input Validation                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  - express-validator (sanitization)                 │ │
│  │  - File type validation (whitelist)                 │ │
│  │  - File size limits (max 50MB)                      │ │
│  │  - SQL injection prevention (parameterized queries) │ │
│  │  - XSS prevention (escape HTML)                     │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 4: Database Security                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  - Connection pooling (pg-pool)                     │ │
│  │  - Prepared statements                              │ │
│  │  - Row-level security (future)                      │ │
│  │  - Database user permissions (least privilege)      │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

#### 4.9.2 Middleware Execution Order

```javascript
app.use(limiter);                    // 1. Rate limiting
app.use(helmet());                   // 2. Security headers
app.use(cors());                     // 3. CORS policy
app.use(express.json());             // 4. JSON parsing
app.use(session());                  // 5. Session management
app.use(passport.initialize());      // 6. Passport init

// Route-specific middleware
router.post('/documents', 
    auth,                            // 7. JWT authentication
    upload.single('file'),           // 8. File upload
    validate,                        // 9. Input validation
    documentController.create        // 10. Controller
);
```

---

### 4.10 Error Handling Architecture

#### 4.10.1 Error Flow

```
┌────────────────────────────────────────────────────────────┐
│  1. Error Occurs                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  - Validation Error (400)                            │ │
│  │  - Authentication Error (401)                        │ │
│  │  - Authorization Error (403)                         │ │
│  │  - Not Found Error (404)                             │ │
│  │  - Database Error (500)                              │ │
│  │  - External Service Error (502)                      │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  2. Controller Catches Error                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  try {                                               │ │
│  │    // business logic                                 │ │
│  │  } catch (error) {                                   │ │
│  │    next(error);  // Pass to error handler           │ │
│  │  }                                                   │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  3. Global Error Handler (errorHandler.js)                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  - Determine error type                              │ │
│  │  - Log error details (production)                    │ │
│  │  - Format error response                             │ │
│  │  - Set appropriate HTTP status code                  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  4. Return JSON Error Response                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  {                                                   │ │
│  │    "error": true,                                    │ │
│  │    "message": "Document not found",                  │ │
│  │    "statusCode": 404,                                │ │
│  │    "details": {...}  // Optional                     │ │
│  │  }                                                   │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### 4.11 Logging & Monitoring

#### 4.11.1 Logging Strategy

| Log Type | Tool | Storage | Purpose |
|----------|------|---------|---------|
| **HTTP Requests** | morgan | stdout | Track API calls |
| **Application Errors** | winston (future) | File/DB | Debug issues |
| **Database Queries** | pg (debug mode) | stdout | Query optimization |
| **Payment Events** | Stripe dashboard | Stripe servers | Transaction monitoring |

#### 4.11.2 Morgan Log Format

```bash
# Combined format (production)
:remote-addr - :remote-user [:date[clf]] 
":method :url HTTP/:http-version" 
:status :res[content-length] 
":referrer" ":user-agent"

# Example output:
192.168.1.1 - - [14/Dec/2025:10:30:00 +0000] 
"GET /api/documents?page=1 HTTP/1.1" 
200 2048 
"http://localhost:3000/documents" 
"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
```

---

---

## 5. Sơ đồ Tệp của Hệ thống

### 5.1 Project Root Structure

```
ShareBuddy/
├── frontend/                       # React frontend application
├── backend/                        # Node.js backend API
├── docs/                           # Documentation
├── docker-compose.yml              # Docker orchestration
├── .env.docker                     # Docker environment variables
├── .env.docker.example             # Docker environment template
├── .gitignore                      # Git ignore rules
├── package-lock.json               # Root package lock
└── README.md                       # Project overview
```

---

### 5.2 Frontend File Structure (Detailed)

```
frontend/
├── public/                         # Static assets
│   ├── index.html                  # HTML template
│   ├── favicon.ico                 # App icon
│   ├── logo192.png                 # PWA icon (192x192)
│   ├── logo512.png                 # PWA icon (512x512)
│   ├── manifest.json               # PWA manifest
│   └── robots.txt                  # SEO crawler rules
│
├── src/
│   ├── index.tsx                   # React entry point (ReactDOM.render)
│   ├── App.tsx                     # Root component with React Router
│   ├── App.css                     # Global app styles
│   ├── index.css                   # Global reset styles
│   ├── logo.svg                    # React logo
│   ├── react-app-env.d.ts          # TypeScript React types
│   ├── reportWebVitals.ts          # Performance monitoring
│   ├── setupTests.ts               # Jest test configuration
│   │
│   ├── pages/                      # Page-level components (routes)
│   │   ├── HomePage.tsx                    # Landing page (/)
│   │   ├── SearchPage.tsx                  # Search results (/search)
│   │   ├── PurchaseCreditsPage.tsx         # Buy credits (/credits/purchase)
│   │   ├── PaymentHistoryPage.tsx          # Transaction history (/payment/history)
│   │   ├── QuestionDetailPage.tsx          # Q&A detail page (/questions/:id)
│   │   ├── VerifiedAuthorRequestPage.tsx   # Verification form (/verified-author/request)
│   │   ├── VerifiedAuthorsPage.tsx         # List verified authors (/verified-authors)
│   │   │
│   │   ├── auth/                           # Authentication pages
│   │   │   ├── LoginPage.tsx               # Login form (/login)
│   │   │   ├── RegisterPage.tsx            # Registration (/register)
│   │   │   ├── VerifyEmailPage.tsx         # Email verification (/verify-email/:token)
│   │   │   ├── ForgotPasswordPage.tsx      # Password reset request (/forgot-password)
│   │   │   ├── ResetPasswordPage.tsx       # Reset password (/reset-password/:token)
│   │   │   └── OAuthSuccessPage.tsx        # OAuth callback (/oauth/success)
│   │   │
│   │   ├── documents/                      # Document pages
│   │   │   ├── DocumentsPage.tsx           # Document listing (/documents)
│   │   │   ├── DocumentDetailPage.tsx      # Document detail (/documents/:id)
│   │   │   └── UploadPage.tsx              # Upload document (/documents/upload)
│   │   │
│   │   ├── user/                           # User profile pages
│   │   │   ├── ProfilePage.tsx             # User profile (/profile/:id)
│   │   │   └── DashboardPage.tsx           # User dashboard (/dashboard)
│   │   │
│   │   └── admin/                          # Admin pages
│   │       └── AdminPage.tsx               # Admin panel (/admin)
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── layout/                         # Layout components
│   │   │   ├── Navbar.tsx                  # Top navigation bar
│   │   │   ├── Footer.tsx                  # Page footer
│   │   │   └── Sidebar.tsx                 # Sidebar menu (if needed)
│   │   │
│   │   ├── auth/                           # Auth components
│   │   │   ├── ProtectedRoute.tsx          # Route guard for authenticated users
│   │   │   └── OAuthButtons.tsx            # Google/Facebook login buttons
│   │   │
│   │   ├── documents/                      # Document components
│   │   │   ├── DocumentCard.tsx            # Document card (grid/list item)
│   │   │   ├── DocumentList.tsx            # Document grid/list container
│   │   │   ├── DocumentFilter.tsx          # Filter/sort controls
│   │   │   └── UploadForm.tsx              # Document upload form
│   │   │
│   │   ├── ratings/                        # Rating components
│   │   │   ├── RatingStars.tsx             # Star rating display (read-only)
│   │   │   └── RatingForm.tsx              # Star rating input form
│   │   │
│   │   ├── comments/                       # Comment components
│   │   │   ├── CommentList.tsx             # Comment thread display
│   │   │   └── CommentForm.tsx             # Post comment form
│   │   │
│   │   ├── user/                           # User components
│   │   │   ├── UserCard.tsx                # User profile card
│   │   │   └── CreditDisplay.tsx           # Credit balance display
│   │   │
│   │   ├── common/                         # Common UI components
│   │   │   ├── LoadingSpinner.tsx          # Loading indicator
│   │   │   ├── Pagination.tsx              # Pagination controls
│   │   │   ├── SearchBar.tsx               # Search input with autocomplete
│   │   │   └── ErrorMessage.tsx            # Error display component
│   │   │
│   │   ├── DocumentPreview.tsx             # PDF preview viewer (react-pdf)
│   │   └── QuestionList.tsx                # Q&A question list
│   │
│   ├── store/                      # Redux state management
│   │   ├── index.ts                        # Configure store, combine reducers
│   │   ├── authSlice.ts                    # Auth state (user, token, isAuthenticated)
│   │   ├── documentSlice.ts                # Document state (list, current, pagination)
│   │   ├── searchSlice.ts                  # Search state (query, results, filters)
│   │   └── paymentSlice.ts                 # Payment state (packages, history)
│   │
│   ├── services/                   # API communication layer
│   │   ├── api.ts                          # Axios instance with interceptors
│   │   ├── authService.ts                  # Auth API calls (login, register, verify)
│   │   ├── documentService.ts              # Document API calls (CRUD, download)
│   │   ├── userService.ts                  # User API calls (profile, update)
│   │   ├── searchService.ts                # Search API calls
│   │   ├── paymentService.ts               # Payment API calls (Stripe)
│   │   └── questionService.ts              # Q&A API calls
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts                      # Authentication hook (get user, logout)
│   │   ├── useDebounce.ts                  # Debounce hook (search input)
│   │   └── usePagination.ts                # Pagination hook
│   │
│   ├── types/                      # TypeScript type definitions
│   │   ├── user.ts                         # User, AuthState types
│   │   ├── document.ts                     # Document, DocumentFilter types
│   │   ├── payment.ts                      # CreditPackage, PaymentTransaction types
│   │   └── api.ts                          # API response types, error types
│   │
│   ├── utils/                      # Utility functions
│   │   ├── formatters.ts                   # Date, number, currency formatters
│   │   ├── validators.ts                   # Form validation helpers
│   │   └── constants.ts                    # App constants (API_URL, categories, etc.)
│   │
│   └── styles/                     # Global styles
│       ├── variables.css                   # CSS custom properties (colors, fonts)
│       └── themes.css                      # Theme styles (light/dark mode)
│
├── package.json                    # Frontend dependencies
├── tsconfig.json                   # TypeScript configuration
├── .env                            # Frontend environment variables
├── .env.example                    # Environment template
├── .gitignore                      # Git ignore rules
├── .dockerignore                   # Docker ignore rules
├── Dockerfile                      # Frontend Docker image
├── nginx.conf                      # Nginx configuration (production)
└── README.md                       # Frontend documentation
```

**Key Frontend Files**:

| File | Purpose | Key Content |
|------|---------|-------------|
| `src/index.tsx` | React entry point | `ReactDOM.render(<App />, root)` |
| `src/App.tsx` | Root component | React Router setup, global providers |
| `src/store/index.ts` | Redux store | `configureStore`, middleware setup |
| `src/services/api.ts` | Axios instance | Interceptors for JWT, error handling |
| `src/components/layout/Navbar.tsx` | Navigation | Links, user menu, credit display |
| `src/pages/documents/DocumentDetailPage.tsx` | Document view | Preview, download, ratings, comments, Q&A |
| `src/components/auth/ProtectedRoute.tsx` | Route guard | Redirect to login if not authenticated |

---

### 5.3 Backend File Structure (Detailed)

```
backend/
├── src/
│   ├── app.js                      # Express application entry point
│   │   ├── Middleware setup (CORS, helmet, compression, rate limit)
│   │   ├── Session & Passport initialization
│   │   ├── Route registration
│   │   ├── Error handler
│   │   └── Server start (port 5000)
│   │
│   ├── config/                     # Configuration files
│   │   ├── config.js               # Environment variables wrapper
│   │   │   └── Exports: PORT, DATABASE_URL, JWT_SECRET, STRIPE_KEY, etc.
│   │   │
│   │   ├── database.js             # PostgreSQL connection pool
│   │   │   ├── Pool configuration (max: 20 connections)
│   │   │   ├── connectDB() function
│   │   │   └── Query helper function
│   │   │
│   │   └── passport.js             # Passport OAuth strategies
│   │       ├── JWT Strategy (extract from Authorization header)
│   │       ├── Google OAuth Strategy
│   │       ├── Facebook OAuth Strategy
│   │       └── Serialize/deserialize user
│   │
│   ├── middleware/                 # Express middleware
│   │   ├── auth.js                 # JWT authentication middleware
│   │   │   ├── verifyToken() - Verify JWT from header
│   │   │   ├── requireAuth() - Ensure user authenticated
│   │   │   ├── requireAdmin() - Ensure user is admin
│   │   │   └── optionalAuth() - Attach user if token present
│   │   │
│   │   ├── upload.js               # Multer file upload configuration
│   │   │   ├── Storage: diskStorage (uploads/documents/)
│   │   │   ├── File filter: PDF, DOCX, PPTX, XLSX
│   │   │   ├── Size limit: 50MB
│   │   │   └── Export: upload.single('file')
│   │   │
│   │   └── errorHandler.js         # Global error handling middleware
│   │       ├── Format error response
│   │       ├── Log errors (production)
│   │       └── Return JSON { error, message, statusCode }
│   │
│   ├── routes/                     # API route definitions
│   │   ├── authRoutes.js           # Authentication routes
│   │   │   ├── POST   /api/auth/register
│   │   │   ├── POST   /api/auth/login
│   │   │   ├── GET    /api/auth/verify-email/:token
│   │   │   ├── POST   /api/auth/forgot-password
│   │   │   ├── POST   /api/auth/reset-password/:token
│   │   │   ├── GET    /api/auth/google
│   │   │   ├── GET    /api/auth/google/callback
│   │   │   ├── GET    /api/auth/facebook
│   │   │   └── GET    /api/auth/facebook/callback
│   │   │
│   │   ├── userRoutes.js           # User routes
│   │   │   ├── GET    /api/users/me
│   │   │   ├── GET    /api/users/:id
│   │   │   ├── PUT    /api/users/:id
│   │   │   └── PUT    /api/users/:id/avatar
│   │   │
│   │   ├── documentRoutes.js       # Document CRUD routes
│   │   │   ├── GET    /api/documents (query: page, limit, category, sort)
│   │   │   ├── GET    /api/documents/:id
│   │   │   ├── POST   /api/documents (upload.single('file'))
│   │   │   ├── PUT    /api/documents/:id
│   │   │   ├── DELETE /api/documents/:id
│   │   │   ├── POST   /api/documents/:id/download
│   │   │   └── POST   /api/documents/:id/view
│   │   │
│   │   ├── searchRoutes.js         # Search routes
│   │   │   ├── GET    /api/search (query: q, category, subject, rating)
│   │   │   └── GET    /api/search/suggestions (autocomplete)
│   │   │
│   │   ├── questionRoutes.js       # Q&A routes
│   │   │   ├── GET    /api/questions (query: document_id)
│   │   │   ├── POST   /api/questions
│   │   │   ├── GET    /api/questions/:id
│   │   │   ├── POST   /api/questions/:id/answers
│   │   │   ├── POST   /api/questions/:id/vote
│   │   │   └── POST   /api/answers/:id/vote
│   │   │
│   │   ├── paymentRoutes.js        # Payment routes
│   │   │   ├── GET    /api/payment/packages
│   │   │   ├── POST   /api/payment/create-payment-intent
│   │   │   ├── POST   /api/payment/webhook (Stripe webhook)
│   │   │   └── GET    /api/payment/history
│   │   │
│   │   ├── recommendationRoutes.js # Recommendation routes
│   │   │   └── GET    /api/recommendations
│   │   │
│   │   ├── verifiedAuthorRoutes.js # Verified author routes
│   │   │   ├── POST   /api/verified-author/request
│   │   │   ├── GET    /api/verified-author/requests (admin)
│   │   │   └── PUT    /api/verified-author/approve/:id (admin)
│   │   │
│   │   ├── previewRoutes.js        # Preview routes
│   │   │   └── GET    /api/preview/:document_id
│   │   │
│   │   ├── ratingRoutes.js         # Rating routes
│   │   │   ├── GET    /api/ratings (query: document_id)
│   │   │   ├── POST   /api/ratings
│   │   │   ├── PUT    /api/ratings/:id
│   │   │   └── DELETE /api/ratings/:id
│   │   │
│   │   ├── commentRoutes.js        # Comment routes
│   │   │   ├── GET    /api/comments (query: document_id)
│   │   │   ├── POST   /api/comments
│   │   │   ├── PUT    /api/comments/:id
│   │   │   ├── DELETE /api/comments/:id
│   │   │   └── POST   /api/comments/:id/like
│   │   │
│   │   ├── creditRoutes.js         # Credit routes
│   │   │   ├── GET    /api/credits/history
│   │   │   └── GET    /api/credits/balance
│   │   │
│   │   ├── socialRoutes.js         # Social routes
│   │   │   ├── POST   /api/social/follow/:user_id
│   │   │   ├── DELETE /api/social/unfollow/:user_id
│   │   │   ├── GET    /api/social/followers/:user_id
│   │   │   ├── GET    /api/social/following/:user_id
│   │   │   ├── POST   /api/social/bookmark/:document_id
│   │   │   ├── DELETE /api/social/unbookmark/:document_id
│   │   │   └── GET    /api/social/bookmarks
│   │   │
│   │   └── adminRoutes.js          # Admin routes
│   │       ├── GET    /api/admin/users
│   │       ├── PUT    /api/admin/users/:id/role
│   │       ├── DELETE /api/admin/users/:id
│   │       ├── GET    /api/admin/documents
│   │       ├── PUT    /api/admin/documents/:id/status
│   │       └── GET    /api/admin/statistics
│   │
│   ├── controllers/                # Request handlers (business logic)
│   │   ├── authController.js       # Authentication logic
│   │   │   ├── register() - Create user, hash password, send verification email
│   │   │   ├── login() - Validate credentials, generate JWT
│   │   │   ├── verifyEmail() - Verify email token, update user
│   │   │   ├── forgotPassword() - Generate reset token, send email
│   │   │   ├── resetPassword() - Verify token, update password
│   │   │   ├── googleOAuthCallback() - Handle Google OAuth
│   │   │   └── facebookOAuthCallback() - Handle Facebook OAuth
│   │   │
│   │   ├── documentController.js   # Document CRUD logic
│   │   │   ├── getDocuments() - List documents with pagination
│   │   │   ├── getDocumentById() - Get document details
│   │   │   ├── createDocument() - Upload document, generate preview
│   │   │   ├── updateDocument() - Update metadata
│   │   │   ├── deleteDocument() - Delete file and database record
│   │   │   ├── downloadDocument() - Deduct credits, log download
│   │   │   └── incrementViewCount() - Increment view count
│   │   │
│   │   ├── userController.js       # User profile logic
│   │   │   ├── getCurrentUser() - Get authenticated user
│   │   │   ├── getUserById() - Get public user profile
│   │   │   ├── updateUser() - Update user profile
│   │   │   └── updateAvatar() - Upload and update avatar
│   │   │
│   │   ├── searchController.js     # Search logic
│   │   │   ├── search() - Full-text search with filters
│   │   │   └── getSuggestions() - Autocomplete suggestions
│   │   │
│   │   ├── questionController.js   # Q&A logic
│   │   │   ├── getQuestions() - List questions by document
│   │   │   ├── createQuestion() - Post question
│   │   │   ├── getQuestionById() - Get question with answers
│   │   │   ├── createAnswer() - Post answer
│   │   │   ├── voteQuestion() - Upvote/downvote question
│   │   │   └── voteAnswer() - Upvote/downvote answer
│   │   │
│   │   ├── paymentController.js    # Payment logic
│   │   │   ├── getPackages() - List credit packages
│   │   │   ├── createPaymentIntent() - Create Stripe payment intent
│   │   │   ├── handleWebhook() - Process Stripe webhooks
│   │   │   └── getPaymentHistory() - Get user transaction history
│   │   │
│   │   ├── recommendationController.js # Recommendation logic
│   │   │   └── getRecommendations() - Get personalized recommendations
│   │   │
│   │   ├── verifiedAuthorController.js # Verified author logic
│   │   │   ├── createRequest() - Submit verification request
│   │   │   ├── getRequests() - List all requests (admin)
│   │   │   └── approveRequest() - Approve/reject request (admin)
│   │   │
│   │   ├── previewController.js    # Preview generation logic
│   │   │   └── getPreview() - Generate and return PDF preview
│   │   │
│   │   ├── ratingController.js     # Rating logic
│   │   │   ├── getRatings() - Get ratings for document
│   │   │   ├── createRating() - Post rating
│   │   │   ├── updateRating() - Update rating
│   │   │   └── deleteRating() - Delete rating
│   │   │
│   │   ├── commentController.js    # Comment logic
│   │   │   ├── getComments() - Get comments for document
│   │   │   ├── createComment() - Post comment
│   │   │   ├── updateComment() - Update comment
│   │   │   ├── deleteComment() - Delete comment
│   │   │   └── likeComment() - Like/unlike comment
│   │   │
│   │   ├── creditController.js     # Credit logic
│   │   │   ├── getCreditHistory() - Get credit transaction history
│   │   │   └── getCreditBalance() - Get current credit balance
│   │   │
│   │   ├── socialController.js     # Social logic
│   │   │   ├── followUser() - Follow user
│   │   │   ├── unfollowUser() - Unfollow user
│   │   │   ├── getFollowers() - Get user followers
│   │   │   ├── getFollowing() - Get users followed by user
│   │   │   ├── bookmarkDocument() - Bookmark document
│   │   │   ├── unbookmarkDocument() - Remove bookmark
│   │   │   └── getBookmarks() - Get user bookmarks
│   │   │
│   │   └── adminController.js      # Admin logic
│   │       ├── getUsers() - List all users
│   │       ├── updateUserRole() - Change user role
│   │       ├── deleteUser() - Delete user
│   │       ├── getDocuments() - List all documents
│   │       ├── updateDocumentStatus() - Approve/reject document
│   │       └── getStatistics() - Get system statistics
│   │
│   ├── services/                   # Business logic layer
│   │   ├── emailService.js         # Email service (Nodemailer)
│   │   │   ├── sendVerificationEmail() - Send email verification
│   │   │   ├── sendPasswordResetEmail() - Send password reset
│   │   │   └── sendNotificationEmail() - Send notification
│   │   │
│   │   ├── paymentService.js       # Payment service (Stripe)
│   │   │   ├── createPaymentIntent() - Create Stripe payment intent
│   │   │   ├── confirmPayment() - Confirm payment
│   │   │   └── refundPayment() - Process refund
│   │   │
│   │   ├── searchService.js        # Search service
│   │   │   ├── fullTextSearch() - PostgreSQL full-text search
│   │   │   └── buildSearchQuery() - Build search query
│   │   │
│   │   ├── recommendationService.js # Recommendation service
│   │   │   ├── getCollaborativeRecommendations() - Collaborative filtering
│   │   │   ├── calculateUserSimilarity() - Calculate similarity
│   │   │   └── refreshSimilarityView() - Refresh materialized view
│   │   │
│   │   └── verifiedAuthorService.js # Verified author service
│   │       ├── createRequest() - Create verification request
│   │       ├── approveRequest() - Approve request
│   │       └── rejectRequest() - Reject request
│   │
│   └── utils/                      # Utility functions
│       └── tokenUtils.js           # JWT helper functions
│           ├── generateToken() - Generate JWT
│           ├── verifyToken() - Verify JWT
│           └── decodeToken() - Decode JWT
│
├── uploads/                        # File storage directory
│   ├── documents/                  # Original uploaded files
│   │   └── [uuid].pdf              # Example: a1b2c3d4-e5f6-...pdf
│   ├── previews/                   # Document previews (first 3 pages)
│   │   └── [uuid]_preview.pdf
│   └── thumbnails/                 # Document thumbnails
│       └── [uuid]_thumb.jpg
│
├── package.json                    # Backend dependencies
│   ├── Dependencies:
│   │   ├── express               (^4.18.2)  - Web framework
│   │   ├── pg                    (^8.11.3)  - PostgreSQL client
│   │   ├── bcryptjs              (^2.4.3)   - Password hashing
│   │   ├── jsonwebtoken          (^9.0.2)   - JWT authentication
│   │   ├── passport              (^0.6.0)   - OAuth authentication
│   │   ├── passport-google-oauth20 (^2.0.0) - Google OAuth
│   │   ├── passport-facebook     (^3.0.0)   - Facebook OAuth
│   │   ├── multer                (^1.4.5)   - File upload
│   │   ├── stripe                (^14.8.0)  - Payment processing
│   │   ├── nodemailer            (^6.9.4)   - Email sending
│   │   ├── pdf-lib               (^1.17.1)  - PDF manipulation
│   │   ├── pdfjs-dist            (^3.11.174) - PDF rendering
│   │   ├── sharp                 (^0.32.5)  - Image processing
│   │   ├── cors                  (^2.8.5)   - CORS middleware
│   │   ├── helmet                (^7.0.0)   - Security headers
│   │   ├── compression           (^1.7.4)   - Response compression
│   │   ├── express-rate-limit    (^6.10.0)  - Rate limiting
│   │   ├── express-validator     (^7.0.1)   - Input validation
│   │   ├── morgan                (^1.10.0)  - HTTP logging
│   │   └── dotenv                (^16.3.1)  - Environment variables
│   │
│   └── Scripts:
│       ├── start                 - node src/app.js (production)
│       ├── dev                   - nodemon src/app.js (development)
│       ├── test                  - jest (testing)
│       ├── lint                  - eslint src/ (linting)
│       ├── db:init               - Initialize database
│       └── db:seed               - Seed sample data
│
├── .env                            # Environment variables (secret)
│   ├── PORT=5000
│   ├── DATABASE_URL=postgresql://...
│   ├── JWT_SECRET=...
│   ├── STRIPE_SECRET_KEY=...
│   ├── STRIPE_PUBLISHABLE_KEY=...
│   ├── STRIPE_WEBHOOK_SECRET=...
│   ├── GOOGLE_CLIENT_ID=...
│   ├── GOOGLE_CLIENT_SECRET=...
│   ├── FACEBOOK_APP_ID=...
│   ├── FACEBOOK_APP_SECRET=...
│   ├── GMAIL_USER=...
│   ├── GMAIL_PASSWORD=...
│   ├── FRONTEND_URL=http://localhost:3000
│   └── NODE_ENV=development
│
├── .env.example                    # Environment template (public)
├── .gitignore                      # Git ignore rules
├── .dockerignore                   # Docker ignore rules
├── Dockerfile                      # Backend Docker image
└── README.md                       # Backend documentation
```

**Key Backend Files**:

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/app.js` | Express app | `app`, `server.listen()` |
| `src/config/database.js` | PostgreSQL pool | `pool`, `connectDB()` |
| `src/config/passport.js` | OAuth strategies | `passport` |
| `src/middleware/auth.js` | JWT auth | `requireAuth()`, `requireAdmin()` |
| `src/middleware/upload.js` | File upload | `upload.single('file')` |
| `src/controllers/documentController.js` | Document logic | `getDocuments()`, `createDocument()`, etc. |
| `src/services/emailService.js` | Email sending | `sendVerificationEmail()` |
| `src/services/paymentService.js` | Stripe integration | `createPaymentIntent()` |

---

### 5.4 Documentation Structure

```
docs/
├── SYSTEM_SPECIFICATION.md         # This file (comprehensive spec)
│   ├── 1. Use Case của Hệ thống
│   ├── 2. Công nghệ Web/Dịch vụ
│   ├── 3. Thiết kế Database
│   ├── 4. Cấu trúc Hệ thống
│   └── 5. Sơ đồ Tệp của Hệ thống
│
├── database-design/                # Database schema files
│   ├── init_database.sql           # Core database schema (13 tables)
│   ├── migration_001_add_missing_features.sql  # Additional features (10+ tables)
│   ├── migration_002_fix_missing_columns.sql   # Schema fixes
│   └── sample_data.sql             # Sample data for testing
│
├── api/                            # API documentation (future)
│   ├── authentication.md           # Auth endpoints
│   ├── documents.md                # Document endpoints
│   ├── users.md                    # User endpoints
│   ├── payment.md                  # Payment endpoints
│   └── questions.md                # Q&A endpoints
│
└── Đặc tả hệ thống.html            # HTML version of specification
```

---

### 5.5 Environment Variables Breakdown

#### 5.5.1 Backend Environment Variables

```bash
# Server Configuration
PORT=5000                                   # Backend server port
NODE_ENV=development                        # Environment (development/production)
FRONTEND_URL=http://localhost:3000          # Frontend URL for CORS

# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/sharebuddy_db
DB_HOST=localhost                           # PostgreSQL host
DB_PORT=5432                                # PostgreSQL port
DB_USER=sharebuddy_user                     # Database user
DB_PASSWORD=your_secure_password            # Database password
DB_NAME=sharebuddy_db                       # Database name
DB_MAX_CONNECTIONS=20                       # Connection pool size

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here         # JWT signing secret (256-bit)
JWT_EXPIRES_IN=24h                          # JWT expiration time

# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_...               # Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...          # Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...             # Stripe webhook secret

# OAuth Configuration (Google)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# OAuth Configuration (Facebook)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/facebook/callback

# Email Configuration (Gmail SMTP)
GMAIL_USER=your_email@gmail.com             # Gmail account
GMAIL_PASSWORD=your_app_specific_password   # App-specific password
EMAIL_FROM=ShareBuddy <noreply@sharebuddy.com>

# Session Configuration
SESSION_SECRET=your_session_secret_key      # Express session secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000                 # 15 minutes (in milliseconds)
RATE_LIMIT_MAX_REQUESTS=100                 # Max requests per window

# File Upload Configuration
MAX_FILE_SIZE=52428800                      # 50MB (in bytes)
UPLOAD_DIR=./uploads                        # Upload directory
```

#### 5.5.2 Frontend Environment Variables

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000     # Backend API URL

# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_... # Stripe publishable key

# OAuth Configuration
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# App Configuration
REACT_APP_NAME=ShareBuddy                   # App name
REACT_APP_VERSION=1.0.0                     # App version

# Feature Flags (optional)
REACT_APP_ENABLE_OAUTH=true                 # Enable OAuth login
REACT_APP_ENABLE_PAYMENT=true               # Enable payment features
REACT_APP_ENABLE_PREVIEW=true               # Enable document preview
```

---

### 5.6 Docker Configuration Files

#### 5.6.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:14-alpine
    container_name: sharebuddy-db
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./docs/database-design/init_database.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./docs/database-design/migration_001_add_missing_features.sql:/docker-entrypoint-initdb.d/02-migration.sql
    ports:
      - "5432:5432"
    networks:
      - sharebuddy-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sharebuddy-backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      PORT: 5000
    volumes:
      - ./backend/uploads:/app/uploads
    ports:
      - "5000:5000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - sharebuddy-network
    restart: unless-stopped

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sharebuddy-frontend
    environment:
      REACT_APP_API_URL: http://localhost:5000
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - sharebuddy-network
    restart: unless-stopped

volumes:
  postgres-data:
    driver: local

networks:
  sharebuddy-network:
    driver: bridge
```

#### 5.6.2 Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create uploads directory
RUN mkdir -p uploads/documents uploads/previews uploads/thumbnails

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "src/app.js"]
```

#### 5.6.3 Frontend Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build React app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

### 5.7 Configuration Files

#### 5.7.1 TypeScript Configuration (frontend/tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES6",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

#### 5.7.2 Git Ignore (.gitignore)

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.production

# Uploads
backend/uploads/documents/*
backend/uploads/previews/*
backend/uploads/thumbnails/*
!backend/uploads/.gitkeep

# Build output
frontend/build/
backend/dist/

# IDE
.vscode/
.idea/
*.swp
*.swo
*.swn
.DS_Store

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Docker
docker-compose.override.yml
```

---

### 5.8 File Naming Conventions

#### 5.8.1 Frontend Naming Conventions

| File Type | Convention | Example |
|-----------|------------|---------|
| **React Components** | PascalCase | `DocumentCard.tsx`, `UserProfile.tsx` |
| **Pages** | PascalCase + Page suffix | `HomePage.tsx`, `DocumentDetailPage.tsx` |
| **Hooks** | camelCase + use prefix | `useAuth.ts`, `useDebounce.ts` |
| **Services** | camelCase + Service suffix | `authService.ts`, `documentService.ts` |
| **Types** | camelCase | `user.ts`, `document.ts` |
| **Utils** | camelCase | `formatters.ts`, `validators.ts` |
| **CSS** | kebab-case | `button.css`, `navbar.css` |

#### 5.8.2 Backend Naming Conventions

| File Type | Convention | Example |
|-----------|------------|---------|
| **Routes** | camelCase + Routes suffix | `authRoutes.js`, `documentRoutes.js` |
| **Controllers** | camelCase + Controller suffix | `authController.js`, `userController.js` |
| **Services** | camelCase + Service suffix | `emailService.js`, `paymentService.js` |
| **Middleware** | camelCase | `auth.js`, `upload.js`, `errorHandler.js` |
| **Config** | camelCase | `database.js`, `passport.js` |
| **Utils** | camelCase + Utils suffix | `tokenUtils.js`, `dateUtils.js` |

#### 5.8.3 Uploaded File Naming

| File Type | Convention | Example |
|-----------|------------|---------|
| **Documents** | UUID + original extension | `a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf` |
| **Previews** | UUID + _preview + extension | `a1b2c3d4-e5f6-7890-abcd-ef1234567890_preview.pdf` |
| **Thumbnails** | UUID + _thumb + extension | `a1b2c3d4-e5f6-7890-abcd-ef1234567890_thumb.jpg` |
| **Avatars** | user_UUID + extension | `user_a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg` |

---

### 5.9 Total File Count & Size Estimation

#### 5.9.1 Frontend Statistics

| Category | File Count | Total Lines (est.) |
|----------|------------|--------------------|
| **Pages** | 18 files | ~3,600 lines |
| **Components** | 20 files | ~4,000 lines |
| **Redux Slices** | 4 files | ~800 lines |
| **Services** | 6 files | ~1,200 lines |
| **Types** | 4 files | ~400 lines |
| **Hooks** | 3 files | ~300 lines |
| **Utils** | 3 files | ~300 lines |
| **Config** | 3 files | ~100 lines |
| **Total** | **61 files** | **~10,700 lines** |

#### 5.9.2 Backend Statistics

| Category | File Count | Total Lines (est.) |
|----------|------------|--------------------|
| **Routes** | 13 files | ~1,300 lines |
| **Controllers** | 13 files | ~2,600 lines |
| **Services** | 5 files | ~1,000 lines |
| **Middleware** | 3 files | ~300 lines |
| **Config** | 3 files | ~300 lines |
| **Utils** | 1 file | ~100 lines |
| **Total** | **38 files** | **~5,600 lines** |

#### 5.9.3 Database & Documentation

| Category | File Count | Total Lines |
|----------|------------|-------------|
| **SQL Files** | 3 files | ~1,100 lines |
| **Documentation** | 1 file (this) | **3,364 lines** |
| **README** | 2 files | ~200 lines |
| **Total** | **6 files** | **~4,664 lines** |

---

### 5.10 Project Size Summary

```
┌──────────────────────────────────────────────────────────┐
│                  ShareBuddy Project Size                  │
├──────────────────────────────────────────────────────────┤
│  Frontend:        61 files    (~10,700 lines)            │
│  Backend:         38 files    (~5,600 lines)             │
│  Database:         3 files    (~1,100 lines)             │
│  Documentation:    6 files    (~4,664 lines)             │
├──────────────────────────────────────────────────────────┤
│  Total Source:   108 files    (~22,064 lines)            │
│  Dependencies:   node_modules (~50,000+ files)           │
│  Uploads:        Variable     (user-generated content)   │
├──────────────────────────────────────────────────────────┤
│  Estimated Disk Size (without node_modules & uploads):   │
│    - Source code:           ~5 MB                        │
│    - node_modules:          ~300 MB                      │
│    - Uploads (10k docs):    ~10 GB                       │
│    - Database (10k users):  ~5 GB                        │
├──────────────────────────────────────────────────────────┤
│  Total (production):        ~15.3 GB                     │
└──────────────────────────────────────────────────────────┘
```

---

**Mục 5 hoàn thành.**

Đã bao gồm:
- Project root structure
- Complete frontend file tree (61 files, 18 pages, 20 components)
- Complete backend file tree (38 files, 13 routes, 13 controllers, 5 services)
- Documentation structure
- Environment variables breakdown (backend + frontend)
- Docker configuration (docker-compose.yml, Dockerfiles)
- Configuration files (tsconfig.json, .gitignore)
- File naming conventions (frontend + backend + uploads)
- File count & size statistics
- Total project size estimation (~22k lines of code)

---

## 📋 Summary

**ShareBuddy System Specification** hoàn thành với 5 mục chính:

1. ✅ **Use Case của Hệ thống** - 25+ use cases, 4 actors, priority matrix
2. ✅ **Công nghệ Web/Dịch vụ** - Full stack technology overview (React, Node.js, PostgreSQL)
3. ✅ **Thiết kế Database** - 25+ tables, ERD, indexes, triggers, views, optimization
4. ✅ **Cấu trúc Hệ thống** - Architecture, flows, security, error handling
5. ✅ **Sơ đồ Tệp của Hệ thống** - Complete file structure, naming conventions, environment variables

**Document Stats**:
- Total lines: **3,364 lines**
- Total sections: **5 major sections** with **50+ subsections**
- Diagrams: **15+ ASCII diagrams** (architecture, ERD, flows)
- Tables: **30+ detailed tables** (database schema, API endpoints, statistics)

Tài liệu đã sẵn sàng để sử dụng cho development, onboarding, và reference! 🎉
