# ShareBuddy Deployment Quick Setup Guide

## Issue: Missing package-lock.json

The Docker build was failing because `moderation-service/package-lock.json` was missing. This has been fixed.

## Deployment Steps

### 1. Copy Project to Server

```bash
# On your local machine
cd /path/to/ShareBuddy
rsync -avz --exclude 'node_modules' --exclude '.git' . user@your-server:/mnt/e/ShareBuddy/
```

### 2. Create .env File on Server

```bash
# On your server
cd /mnt/e/ShareBuddy
cp .env.docker.example .env.docker
nano .env.docker  # Edit with your actual values
```

**Required environment variables:**

```bash
# Database (use your external PostgreSQL)
DB_HOST=your-postgres-host-ip
DB_PORT=5432
DB_NAME=sharebuddy_db
DB_USER=postgres
DB_PASSWORD=your-secure-password

# Security (generate random secrets)
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
MODERATION_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# OAuth (optional - can leave blank if not using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Stripe (optional - can leave blank if not using)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

### 3. Build and Run with Docker

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 4. Verify Services

```bash
# Backend health check
curl http://localhost:5001/api/health

# Moderation service health check
curl http://localhost:5002/health

# Redis ping
docker exec sharebuddy-redis redis-cli ping

# Frontend
curl http://localhost:3000
```

## Common Issues

### Issue 1: Missing .env file
**Error:** `WARN variable is not set`
**Fix:** Create `.env.docker` file with required variables

### Issue 2: Missing package-lock.json (FIXED)
**Error:** `npm ci` command failed
**Fix:** Already generated, should work now

### Issue 3: Cannot connect to database
**Error:** `ECONNREFUSED` or `Connection timeout`
**Fix:** 
- Ensure PostgreSQL is accessible from Docker containers
- Check DB_HOST is correct (use IP, not localhost)
- Verify firewall rules allow connections

### Issue 4: Redis connection failed
**Error:** `Redis connection error`
**Fix:** Redis runs inside Docker, should work automatically

## Minimal .env for Testing

If you want to test without all services, use this minimal config:

```bash
# Database
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=sharebuddy_db
DB_USER=postgres
DB_PASSWORD=your-password

# Security
JWT_SECRET=test-jwt-secret-min-32-characters-long
SESSION_SECRET=test-session-secret-min-32-chars
MODERATION_WEBHOOK_SECRET=test-webhook-secret-min-32-chars

# Email (can use fake values for testing)
EMAIL_USER=test@example.com
EMAIL_PASSWORD=fake-password

# OAuth (leave blank)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Stripe (leave blank)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Generate Secure Secrets

```bash
# On your server
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('MODERATION_WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Port Mapping

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5001
- **Moderation Service:** http://localhost:5002
- **Redis:** localhost:6379

## Troubleshooting Commands

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs moderation-service
docker-compose logs redis

# Restart a service
docker-compose restart backend

# Rebuild a service
docker-compose build backend
docker-compose up -d backend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Check container status
docker ps -a
```

## Next Steps After Deployment

1. **Database Migration:**
   ```bash
   # Copy migration file to server
   scp docs/database-design/migration_003_moderation_system.sql user@server:/tmp/
   
   # On server, run migration
   psql -h DB_HOST -U DB_USER -d DB_NAME -f /tmp/migration_003_moderation_system.sql
   ```

2. **Test Upload:**
   - Go to http://your-server:3000
   - Register/login
   - Upload a test document
   - Check if moderation works (2-5 seconds)

3. **Monitor:**
   ```bash
   # Watch logs in real-time
   docker-compose logs -f
   
   # Check moderation queue stats
   curl http://localhost:5002/stats
   ```
