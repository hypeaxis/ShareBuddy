# Module 4 & 6 Testing Guide

Hướng dẫn chi tiết để test Module 4 (Q&A System) và Module 6 (Document Preview)

## Mục lục
1. [Chuẩn bị](#chuẩn-bị)
2. [Module 4: Q&A System](#module-4-qa-system)
3. [Module 6: Document Preview](#module-6-document-preview)
4. [Integration Testing](#integration-testing)
5. [Troubleshooting](#troubleshooting)

---

## Chuẩn bị

### 1. Cài đặt Dependencies

Nếu chưa cài đặt, chạy script tự động:
```bash
cd /Users/caoducanh/Coding/ShareBuddy
./scripts/install-missing-deps.sh
```

Hoặc cài thủ công:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Khởi động Database

Đảm bảo PostgreSQL đang chạy và database `sharebuddy_db` đã được tạo.

### 3. Chạy Migration (nếu chưa chạy)

```bash
psql -U sharebuddy_user -d sharebuddy_db -f docs/database-design/migration_001_add_missing_features.sql
```

### 4. Khởi động Backend

```bash
cd backend
npm run dev
```

Backend sẽ chạy tại: `http://localhost:5000`

### 5. Khởi động Frontend

```bash
cd frontend
npm start
```

Frontend sẽ chạy tại: `http://localhost:3000`

---

## Module 4: Q&A System

### 4.1. Kiểm tra Routes

#### Test 1: Get Questions for Document
```bash
curl http://localhost:5000/api/questions/document/{documentId}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "questions": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 0,
      "totalItems": 0
    }
  }
}
```

#### Test 2: Create Question (Protected)

Đầu tiên, đăng nhập để lấy token:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Sau đó tạo câu hỏi:
```bash
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "documentId": "YOUR_DOCUMENT_ID",
    "title": "Làm thế nào để hiểu phần này?",
    "content": "Tôi không hiểu rõ về phần giải thích này. Có thể giải thích chi tiết hơn được không?"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Câu hỏi đã được tạo thành công",
  "data": {
    "questionId": "uuid-here"
  }
}
```

#### Test 3: Create Answer

```bash
curl -X POST http://localhost:5000/api/questions/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "questionId": "QUESTION_ID_HERE",
    "content": "Đây là câu trả lời chi tiết cho câu hỏi của bạn. Phần này giải thích về..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Câu trả lời đã được tạo thành công",
  "data": {
    "answerId": "uuid-here"
  }
}
```

#### Test 4: Vote on Question

```bash
# Upvote
curl -X POST http://localhost:5000/api/questions/{questionId}/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"voteType": 1}'

# Downvote
curl -X POST http://localhost:5000/api/questions/{questionId}/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"voteType": -1}'
```

#### Test 5: Accept Answer (Question Author Only)

```bash
curl -X POST http://localhost:5000/api/questions/answer/{answerId}/accept \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Câu trả lời đã được chấp nhận"
}
```

### 4.2. Kiểm tra Credits System

#### Test Credits After Question

```bash
# Check user credits before
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create question (should add +1 credit)
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "documentId": "DOC_ID",
    "title": "Test question title here",
    "content": "Test question content here with at least 20 characters"
  }'

# Check credits after (should increase by 1)
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Test Credits After Answer

```bash
# Create answer (should add +2 credits)
curl -X POST http://localhost:5000/api/questions/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "questionId": "QUESTION_ID",
    "content": "Test answer content with at least 20 characters"
  }'

# Check credits (should increase by 2)
```

#### Test Credits After Accept Answer

```bash
# Accept answer (answer author gets +5 credits)
curl -X POST http://localhost:5000/api/questions/answer/{answerId}/accept \
  -H "Authorization: Bearer QUESTION_AUTHOR_TOKEN"

# Check answer author's credits (should increase by 5)
```

### 4.3. Frontend Testing

#### Test QuestionList Component

1. Truy cập trang tài liệu: `http://localhost:3000/documents/{documentId}`
2. Cuộn xuống phần "Hỏi & Đáp"
3. Kiểm tra:
   - [ ] Hiển thị danh sách câu hỏi
   - [ ] Nút "Đặt câu hỏi" hoạt động
   - [ ] Filter "Mới nhất", "Nhiều vote", "Chưa trả lời" hoạt động
   - [ ] Vote buttons (▲ ▼) hoạt động
   - [ ] Hiển thị số votes, số answers, số views

#### Test Create Question

1. Click nút "Đặt câu hỏi"
2. Modal hiển thị
3. Nhập tiêu đề (ít nhất 10 ký tự)
4. Nhập nội dung (ít nhất 20 ký tự)
5. Click "Đặt câu hỏi"
6. Kiểm tra:
   - [ ] Modal đóng
   - [ ] Câu hỏi mới xuất hiện trong danh sách
   - [ ] Credits tăng +1

#### Test QuestionDetail Page

1. Click vào một câu hỏi
2. Trang chi tiết hiển thị
3. Kiểm tra:
   - [ ] Hiển thị đầy đủ nội dung câu hỏi
   - [ ] Hiển thị danh sách câu trả lời
   - [ ] Vote buttons hoạt động
   - [ ] Form trả lời hiển thị (nếu đã đăng nhập)
   - [ ] Nút "Chấp nhận" hiển thị (nếu là tác giả câu hỏi)

#### Test Answer Question

1. Trên trang chi tiết câu hỏi
2. Scroll xuống form "Câu trả lời của bạn"
3. Nhập nội dung (ít nhất 20 ký tự)
4. Click "Gửi câu trả lời"
5. Kiểm tra:
   - [ ] Câu trả lời mới xuất hiện
   - [ ] Credits tăng +2
   - [ ] Form được reset

#### Test Accept Answer

1. Đăng nhập bằng tài khoản tác giả câu hỏi
2. Xem câu hỏi của mình
3. Click nút "✓" bên cạnh một câu trả lời
4. Kiểm tra:
   - [ ] Badge "✓ Câu trả lời được chấp nhận" xuất hiện
   - [ ] Câu hỏi có badge "✓ Đã trả lời"
   - [ ] Tác giả câu trả lời nhận +5 credits

---

## Module 6: Document Preview

### 6.1. Kiểm tra Routes

#### Test 1: Generate Preview (Admin Only)

```bash
curl -X POST http://localhost:5000/api/preview/generate/{documentId} \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Preview đã được tạo",
  "data": {
    "previewPath": "/api/preview/document-id",
    "previewPages": 5,
    "totalPages": 20
  }
}
```

#### Test 2: Get Preview Info

```bash
curl http://localhost:5000/api/preview/info/{documentId}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "title": "Document Title",
    "hasPreview": true,
    "hasThumbnail": true,
    "previewPages": 5,
    "totalPages": 20,
    "previewCount": 15,
    "fileSize": 1234567,
    "previewUrl": "/api/preview/uuid",
    "thumbnailUrl": "/api/preview/thumbnail/uuid"
  }
}
```

#### Test 3: Serve Preview PDF

```bash
# Download preview
curl http://localhost:5000/api/preview/{documentId} \
  --output preview.pdf

# Verify it's a PDF
file preview.pdf
# Should output: preview.pdf: PDF document
```

#### Test 4: Generate Thumbnail

```bash
curl -X POST http://localhost:5000/api/preview/thumbnail/{documentId} \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Thumbnail đã được tạo",
  "data": {
    "thumbnailPath": "/api/preview/thumbnail/document-id",
    "width": 300,
    "height": 400
  }
}
```

#### Test 5: Serve Thumbnail

```bash
# Download thumbnail
curl http://localhost:5000/api/preview/thumbnail/{documentId} \
  --output thumbnail.png

# Verify it's an image
file thumbnail.png
# Should output: thumbnail.png: PNG image data
```

#### Test 6: Batch Generate Previews

```bash
curl -X POST http://localhost:5000/api/preview/batch/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -d '{
    "documentIds": [
      "document-id-1",
      "document-id-2",
      "document-id-3"
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Đã tạo 3/3 previews",
  "data": {
    "success": ["doc-id-1", "doc-id-2", "doc-id-3"],
    "failed": []
  }
}
```

### 6.2. Kiểm tra File System

#### Test Preview Files Created

```bash
# Check uploads directory structure
ls -la backend/uploads/
# Should have: documents/ previews/ thumbnails/

# Check preview files
ls -la backend/uploads/previews/
# Should see: preview_<uuid>.pdf files

# Check thumbnail files
ls -la backend/uploads/thumbnails/
# Should see: thumb_<uuid>.png files
```

#### Test Preview File Properties

```bash
# Check preview PDF has watermark
pdfinfo backend/uploads/previews/preview_<uuid>.pdf
# Should show: Pages: 5 (or less than original)

# Check file size (preview should be smaller than original)
du -h backend/uploads/documents/<original>.pdf
du -h backend/uploads/previews/preview_<uuid>.pdf
```

### 6.3. Frontend Testing

#### Test DocumentPreview Component

1. Truy cập trang tài liệu với preview: `http://localhost:3000/documents/{documentId}`
2. Kiểm tra:
   - [ ] PDF preview hiển thị
   - [ ] Watermark "PREVIEW - ShareBuddy" xuất hiện trên mỗi trang
   - [ ] Chỉ hiển thị tối đa 5 trang đầu tiên
   - [ ] Navigation buttons hoạt động (Trang trước/sau)
   - [ ] Zoom buttons hoạt động (+/-)
   - [ ] Page counter hiển thị đúng (1/5)
   - [ ] Alert "Đây chỉ là bản preview" hiển thị
   - [ ] Nút "Mua toàn bộ tài liệu" hiển thị

#### Test Preview Controls

1. Test pagination:
   - [ ] Click "Trang sau" → Chuyển sang trang 2
   - [ ] Click "Trang trước" → Quay về trang 1
   - [ ] Trang đầu → Nút "Trang trước" disabled
   - [ ] Trang cuối → Nút "Trang sau" disabled

2. Test zoom:
   - [ ] Click "+" → PDF phóng to
   - [ ] Click "-" → PDF thu nhỏ
   - [ ] Zoom 50% → Nút "-" disabled
   - [ ] Zoom 200% → Nút "+" disabled
   - [ ] Zoom counter hiển thị % đúng

#### Test Thumbnail Display

1. Truy cập trang danh sách tài liệu
2. Kiểm tra:
   - [ ] Thumbnails hiển thị cho mỗi tài liệu
   - [ ] Click thumbnail → Chuyển đến trang chi tiết
   - [ ] Lazy loading hoạt động (chỉ load khi scroll đến)

#### Test Preview Without Authentication

1. Logout (nếu đang đăng nhập)
2. Truy cập trang tài liệu
3. Kiểm tra:
   - [ ] Preview vẫn hiển thị (public access)
   - [ ] Nút "Mua tài liệu" yêu cầu đăng nhập khi click

---

## Integration Testing

### Test Workflow: Question + Preview

1. **User tìm tài liệu**
   - Browse danh sách
   - Click vào tài liệu
   
2. **User xem preview**
   - Xem 5 trang đầu
   - Zoom in/out
   - Đọc nội dung
   
3. **User đặt câu hỏi về preview**
   - Click "Đặt câu hỏi"
   - Nhập: "Trang 3 có nói về X, có thể giải thích thêm không?"
   - Submit
   
4. **Other user trả lời**
   - Xem câu hỏi
   - Xem lại preview
   - Viết câu trả lời chi tiết
   
5. **Question author accepts answer**
   - Đọc câu trả lời
   - Click "Chấp nhận"
   - Answer author nhận bonus credits
   
6. **User quyết định mua tài liệu**
   - Click "Mua toàn bộ tài liệu"
   - Thanh toán
   - Download full PDF

### Test Database Integrity

```sql
-- Check questions created
SELECT COUNT(*) FROM questions;

-- Check answers created
SELECT COUNT(*) FROM answers;

-- Check credit transactions
SELECT * FROM credit_transactions 
WHERE transaction_type IN ('comment', 'bonus')
ORDER BY created_at DESC 
LIMIT 10;

-- Check preview counts
SELECT document_id, preview_count, preview_pages 
FROM documents 
WHERE preview_path IS NOT NULL;

-- Check question votes
SELECT q.title, q.vote_count, COUNT(qv.vote_id) as actual_votes
FROM questions q
LEFT JOIN question_votes qv ON q.question_id = qv.question_id
GROUP BY q.question_id;

-- Check accepted answers
SELECT q.title, a.content, a.is_accepted
FROM questions q
JOIN answers a ON q.accepted_answer_id = a.answer_id
WHERE q.is_answered = TRUE;
```

---

## Troubleshooting

### Module 4 Issues

#### Issue: "Cannot create question"
**Solutions:**
1. Check authentication token is valid
2. Verify documentId exists in database
3. Check title >= 10 chars and content >= 20 chars
4. Review backend logs for SQL errors

#### Issue: "Vote not working"
**Solutions:**
1. Ensure user is logged in
2. Check voteType is 1 or -1
3. Verify question/answer exists
4. Check for database connection

#### Issue: "Credits not updating"
**Solutions:**
1. Check credit_transactions table for entries
2. Verify transaction trigger is working:
```sql
SELECT * FROM credit_transactions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;
```
3. Check users.credits value matches sum of transactions

### Module 6 Issues

#### Issue: "Preview generation failed"
**Solutions:**
1. Check file exists in uploads/documents/
2. Verify file is valid PDF:
```bash
pdfinfo uploads/documents/file.pdf
```
3. Check pdf-lib installation:
```bash
npm list pdf-lib
```
4. Review error logs for specific PDF issues

#### Issue: "Canvas/Thumbnail errors"
**Solutions:**
1. Verify system dependencies installed (Alpine Linux):
```bash
apk info | grep cairo
apk info | grep pango
```
2. Check canvas npm package:
```bash
npm list canvas
```
3. Rebuild canvas if needed:
```bash
npm rebuild canvas
```

#### Issue: "Preview not displaying in frontend"
**Solutions:**
1. Check preview file exists:
```bash
ls -la uploads/previews/preview_*.pdf
```
2. Verify API URL is correct in frontend
3. Check CORS settings allow PDF serving
4. Test direct URL: `http://localhost:5000/api/preview/{documentId}`

#### Issue: "Watermark not appearing"
**Solutions:**
1. Check pdf-lib version compatibility
2. Verify watermark code in previewController.js
3. Test with different PDF files
4. Check PDF rendering settings

### Common Database Issues

#### Reset Q&A data
```sql
-- Delete all Q&A data
DELETE FROM answer_votes;
DELETE FROM question_votes;
DELETE FROM answers;
DELETE FROM questions;

-- Reset auto-increment (if using serial)
-- Not needed for UUIDs
```

#### Reset preview data
```sql
-- Clear preview info
UPDATE documents 
SET preview_path = NULL, 
    preview_pages = NULL, 
    preview_count = 0,
    thumbnail_path = NULL;
```

### Performance Testing

#### Test with Large Document
```bash
# Upload large PDF (100+ pages)
# Generate preview
time curl -X POST http://localhost:5000/api/preview/generate/{documentId} \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Should complete in < 10 seconds for 100-page PDF
```

#### Test with Multiple Users
```bash
# Simulate 10 concurrent preview requests
for i in {1..10}; do
  curl http://localhost:5000/api/preview/{documentId} \
    --output preview_$i.pdf &
done
wait

# Check all downloads successful
ls -lh preview_*.pdf
```

---

## Success Criteria

### Module 4 (Q&A System)
- ✅ Users can create questions with validation
- ✅ Users can answer questions
- ✅ Vote system works correctly (upvote/downvote)
- ✅ Question author can accept answers
- ✅ Credits awarded correctly (+1 question, +2 answer, +5 accept)
- ✅ Questions sorted by recent/votes/unanswered
- ✅ View count increments on question view
- ✅ Frontend components render properly
- ✅ All database constraints enforced

### Module 6 (Document Preview)
- ✅ Previews generated with 5-page limit
- ✅ Watermark appears on all preview pages
- ✅ Thumbnails generated correctly
- ✅ Preview files served as PDF
- ✅ Thumbnail files served as PNG
- ✅ Preview count tracked
- ✅ Batch generation works for multiple documents
- ✅ Frontend preview component displays PDF
- ✅ Navigation and zoom controls work
- ✅ File system organized properly

### Integration
- ✅ Users can preview → ask questions → get answers
- ✅ Preview accessible without authentication
- ✅ Q&A requires authentication
- ✅ Credits system integrated with Q&A
- ✅ All routes registered in app.js
- ✅ Error handling works correctly

---

## Next Steps

After completing testing:

1. **Fix any issues found** during testing
2. **Document bugs** in CHANGELOG.md
3. **Optimize performance** if needed
4. **Implement remaining modules** (3, 5, 7, 8, 9)
5. **Deploy to staging** environment
6. **User acceptance testing**

---

## Support

Nếu gặp vấn đề không được liệt kê ở đây:

1. Check backend logs: `backend/logs/`
2. Check browser console for frontend errors
3. Review database logs: `tail -f /var/log/postgresql/postgresql.log`
4. Contact dev team với error logs và reproduction steps
