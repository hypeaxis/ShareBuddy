# Automated Moderation System - Setup Guide

This guide explains how to set up and run the AI-powered automated moderation system for ShareBuddy.

## 📋 Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ installed
- PostgreSQL database with migration_003 applied
- Backend and frontend already configured

## 🗄️ Step 1: Database Migration

If you haven't already run the moderation system migration:

```bash
cd /Users/caoducanh/Coding/ShareBuddy
psql -U postgres -d sharebuddy_db -f docs/database-design/migration_003_moderation_system.sql
```

Verify the migration:
```sql
-- Check if moderation_jobs table exists
SELECT * FROM information_schema.tables WHERE table_name = 'moderation_jobs';

-- Check trigger function
SELECT * FROM information_schema.routines WHERE routine_name = 'sync_moderation_to_documents';

-- Test get_moderation_stats function
SELECT * FROM get_moderation_stats();
```

## 🔧 Step 2: Environment Configuration

### Backend Environment Variables

Add these to your `/backend/.env` file:

```bash
# Redis Configuration (for Moderation Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Moderation Service
MODERATION_SERVICE_URL=http://localhost:5002
MODERATION_WEBHOOK_SECRET=your-secure-webhook-secret-change-in-production-min-32-chars
```

**For Docker deployment**, use these values in `.env.docker`:
```bash
REDIS_HOST=redis
REDIS_PORT=6379
MODERATION_SERVICE_URL=http://moderation-service:5002
```

### Generate Webhook Secret

Generate a secure webhook secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it for `MODERATION_WEBHOOK_SECRET` in both backend and moderation-service `.env` files.

## 📦 Step 3: Install Dependencies

### Backend Dependencies

```bash
cd backend
npm install
```

The following packages were added:
- `bull@4.12.0` - Job queue management
- `redis@4.6.12` - Redis client

### Moderation Service Dependencies

```bash
cd moderation-service
npm install
```

## 🐳 Step 4: Start Services with Docker

### Option A: Full Docker Compose (Recommended for Production)

```bash
cd /Users/caoducanh/Coding/ShareBuddy
docker-compose up -d
```

This starts:
- Backend (port 5001)
- Frontend (port 3000)
- Redis (port 6379)
- Moderation Service (port 5002)

### Option B: Local Development (Backend + Moderation Service locally)

**Terminal 1 - Start Redis:**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Terminal 2 - Start Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Start Moderation Service:**
```bash
cd moderation-service
npm start
```

**Terminal 4 - Start Frontend:**
```bash
cd frontend
npm start
```

## ✅ Step 5: Verify Setup

### Check Service Health

```bash
# Backend health
curl http://localhost:5001/api/health

# Moderation service health
curl http://localhost:5002/health

# Redis connection
redis-cli ping
# Should return: PONG
```

### Check Queue Statistics

```bash
curl http://localhost:5002/stats
```

Expected response:
```json
{
  "queue": {
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 0,
    "delayed": 0
  },
  "redis": {
    "status": "connected"
  }
}
```

### Check Database

```sql
-- Check moderation_jobs table
SELECT * FROM moderation_jobs LIMIT 5;

-- Check documents_with_moderation view
SELECT * FROM documents_with_moderation WHERE has_moderation_data = true LIMIT 5;

-- Get queue stats
SELECT * FROM get_moderation_stats();
```

## 🧪 Step 6: Test Upload Workflow

### 1. Upload a Test Document

Use the frontend or API to upload a document:

```bash
curl -X POST http://localhost:5001/api/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.pdf" \
  -F "title=Test Document" \
  -F "description=Testing moderation" \
  -F "category=Technology" \
  -F "cost=0"
```

Expected response:
```json
{
  "message": "Tài liệu đã được tải lên thành công và đang được kiểm duyệt. Bạn sẽ nhận được thông báo khi hoàn tất.",
  "document": {
    "document_id": "...",
    "title": "Test Document",
    "status": "pending"
  },
  "moderation": {
    "jobId": "...",
    "status": "queued"
  }
}
```

### 2. Monitor the Job

**Check queue stats:**
```bash
curl http://localhost:5002/stats
```

**Check moderation_jobs table:**
```sql
SELECT 
  job_id,
  document_id,
  moderation_status,
  moderation_score,
  moderation_flags,
  created_at,
  updated_at
FROM moderation_jobs
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Check Document Status

**After moderation completes (2-5 seconds), check documents table:**
```sql
SELECT 
  document_id,
  title,
  status,
  moderation_score,
  rejection_reason,
  file_path
FROM documents
WHERE document_id = 'YOUR_DOCUMENT_ID';
```

### 4. Verify File Location

**If approved (score > 0.5):**
```bash
ls -lh backend/uploads/documents/
```

**If rejected (score ≤ 0.5):**
```bash
ls -lh backend/uploads/temp/
# Should be empty (file deleted)
```

## 🔍 Monitoring

### View Backend Logs

```bash
# Docker
docker-compose logs -f backend

# Local
cd backend && npm run dev
```

### View Moderation Service Logs

```bash
# Docker
docker-compose logs -f moderation-service

# Local
cd moderation-service && npm start
```

### View Redis Logs

```bash
# Docker
docker-compose logs -f redis

# Local
redis-cli monitor
```

### Check Queue Activity

```bash
# Get queue statistics
curl http://localhost:5002/stats | jq

# Check failed jobs
redis-cli LRANGE bull:moderation-queue:failed 0 -1
```

## 🎯 Scoring System

### Understanding Moderation Scores

The moderation service calculates a final score using:

**Final Score = (AI Score × 0.7) + (Rule Score × 0.3)**

**AI Score Components:**
- TensorFlow.js toxicity model (threshold 0.7)
- Detects: toxic, severe_toxic, obscene, threat, insult, identity_hate

**Rule Score Components:**
- Spam pattern detection (0.2 penalty)
- Profanity checking (0.3 penalty)
- Excessive caps ratio (0.15 penalty)
- Repetitive content (0.1 penalty)

### Decision Threshold

- **Score > 0.5**: Document approved (status='approved')
- **Score ≤ 0.5**: Document rejected (status='rejected')

### Moderation Flags

Possible flags in `moderation_flags` array:
- `toxic` - Contains toxic language
- `spam` - Spam pattern detected
- `profanity` - Contains profanity
- `excessive_caps` - Too many capital letters
- `repetitive_content` - Repetitive text patterns

## 🐛 Troubleshooting

### Issue: Queue not processing jobs

**Solution:**
```bash
# Check Redis connection
redis-cli ping

# Check moderation service health
curl http://localhost:5002/health

# Restart moderation service
docker-compose restart moderation-service
```

### Issue: Files stuck in temp folder

**Solution:**
```bash
# Check moderation_jobs table for failed jobs
SELECT * FROM moderation_jobs WHERE moderation_status = 'failed';

# Manually move approved files
cd backend/uploads
mv temp/* documents/

# Clean up rejected files
rm -rf temp/*
```

### Issue: Webhook not received

**Solution:**
```bash
# Check MODERATION_WEBHOOK_SECRET matches in both services
echo $MODERATION_WEBHOOK_SECRET

# Check backend webhook endpoint
curl -X POST http://localhost:5001/api/webhooks/moderation \
  -H "X-Webhook-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check moderation service logs
docker-compose logs moderation-service | grep webhook
```

### Issue: TensorFlow model not loading

**Solution:**
```bash
# Check moderation service logs
docker-compose logs moderation-service | grep tensorflow

# Rebuild moderation service Docker image
docker-compose build moderation-service
docker-compose up -d moderation-service

# Verify model download
docker exec -it moderation-service ls -lh node_modules/@tensorflow-models/toxicity
```

## 📊 Performance Tuning

### Adjust Queue Concurrency

Edit `moderation-service/src/queue/processor.js`:
```javascript
// Default: 2 concurrent jobs
processor.process('moderation-job', 5, processJob);
```

### Adjust Retry Configuration

Edit `backend/src/services/moderationQueue.js`:
```javascript
attempts: 5, // Increase from 3
backoff: {
  type: 'exponential',
  delay: 5000 // Increase from 2000
}
```

### Redis Memory Limit

Edit `docker-compose.yml`:
```yaml
redis:
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## 🔒 Security Considerations

1. **Webhook Secret**: Use a strong random secret in production
2. **Temp File Access**: Ensure `/uploads/temp/` is not publicly accessible
3. **Redis Password**: Set REDIS_PASSWORD in production
4. **Rate Limiting**: Consider adding rate limits to upload endpoint
5. **File Cleanup**: Schedule cron job to clean old temp files:
   ```bash
   # Delete temp files older than 24 hours
   find /path/to/backend/uploads/temp -mtime +1 -type f -delete
   ```

## 📈 Monitoring Metrics

Key metrics to monitor:

1. **Queue Health**:
   - Waiting jobs count (should be low)
   - Failed jobs percentage (should be <5%)
   - Average processing time

2. **Moderation Accuracy**:
   - Approval rate
   - Rejection rate
   - Admin takedown rate (false positives)

3. **System Performance**:
   - Redis memory usage
   - CPU usage during processing
   - Webhook response time

## 🚀 Production Deployment

### Before Deploying:

1. ✅ Run database migration
2. ✅ Set all environment variables
3. ✅ Generate secure webhook secret
4. ✅ Test upload workflow locally
5. ✅ Build Docker images
6. ✅ Configure Redis persistence
7. ✅ Set up monitoring/alerting
8. ✅ Schedule temp file cleanup

### Deployment Commands:

```bash
# Build images
docker-compose build

# Push to registry (if using)
docker-compose push

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Verify all services
docker-compose ps
curl https://your-domain.com/api/health
curl https://your-domain.com:5002/health
```

## 📞 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Check database migration status
4. Review this setup guide
5. Contact the development team

---

**Last Updated**: December 16, 2024  
**Version**: 1.6.0
