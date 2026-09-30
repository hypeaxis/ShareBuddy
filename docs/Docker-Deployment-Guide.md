# Hướng dẫn triển khai ShareBuddy với Docker

## Tổng quan

ShareBuddy sử dụng Docker để containerize ứng dụng frontend (React + nginx) và backend (Node.js + Express). Database PostgreSQL chạy độc lập bên ngoài Docker containers.

## Kiến trúc hệ thống

```
┌─────────────────┐
│   Frontend      │
│ (React + nginx) │
│   Port: 3000    │
└────────┬────────┘
         │
    Docker Network
         │
┌────────┴────────┐
│    Backend      │
│  (Node.js API)  │
│   Port: 5001    │
└────────┬────────┘
         │
   External DB
         │
┌────────┴────────┐
│   PostgreSQL    │
│ dingleberries   │
│   Port: 5432    │
└─────────────────┘
```

## Yêu cầu hệ thống

- Docker Engine 20.10+
- Docker Compose 2.0+
- PostgreSQL database đã được cấu hình (external)

## Cấu trúc Docker

### 1. Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start application
CMD ["node", "src/app.js"]
```

**Đặc điểm:**
- Base image: `node:18-alpine` (lightweight)
- Chỉ cài đặt production dependencies
- Health check endpoint: `/api/health`
- Port: 5001

### 2. Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

**Đặc điểm:**
- Multi-stage build để giảm kích thước image
- Build stage: Compile React application
- Production stage: nginx serve static files
- Port: 80 (mapped to 3000)

### 3. Nginx Configuration (`frontend/nginx.conf`)

```nginx
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # API proxy to backend
    location /api {
        proxy_pass http://backend:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # React Router support - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Chức năng:**
- Serve React application (SPA routing support)
- Proxy API requests tới backend container
- Gzip compression cho performance
- Cache static assets
- Security headers

### 4. Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sharebuddy-backend
    restart: unless-stopped
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - PORT=5001
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - backend-uploads:/app/uploads
    networks:
      - sharebuddy-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sharebuddy-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - sharebuddy-network

volumes:
  backend-uploads:
    driver: local

networks:
  sharebuddy-network:
    driver: bridge
```

**Cấu hình:**
- 2 services: backend và frontend
- Backend expose port 5001
- Frontend expose port 80 (mapped to host 3000)
- Health check cho backend
- Shared network: `sharebuddy-network`
- Volume persistence cho uploads

## Hướng dẫn triển khai

### Bước 1: Chuẩn bị môi trường

1. **Clone repository:**
```bash
git clone <repository-url>
cd ShareBuddy
```

2. **Tạo file environment:**
```bash
cp .env.docker .env
```

3. **Cấu hình database (`.env`):**
```env
# Database Configuration
DB_HOST=dingleberries.ddns.net
DB_PORT=5432
DB_NAME=sharebuddy_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Application Secrets
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here
```

**⚠️ Lưu ý:** Thay đổi `DB_PASSWORD`, `JWT_SECRET`, và `SESSION_SECRET` bằng giá trị thực tế.

### Bước 2: Build và khởi động containers

1. **Build images:**
```bash
docker-compose build
```

2. **Khởi động services:**
```bash
docker-compose up -d
```

3. **Xem logs:**
```bash
# Tất cả services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Bước 3: Kiểm tra trạng thái

1. **Kiểm tra containers đang chạy:**
```bash
docker-compose ps
```

Expected output:
```
NAME                    IMAGE                   STATUS
sharebuddy-backend      sharebuddy-backend     Up (healthy)
sharebuddy-frontend     sharebuddy-frontend    Up
```

2. **Kiểm tra health check:**
```bash
docker inspect sharebuddy-backend | grep -A 10 "Health"
```

3. **Test endpoints:**
```bash
# Backend health check
curl http://localhost:5001/api/health

# Frontend
curl http://localhost:3000
```

### Bước 4: Truy cập ứng dụng

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5001/api
- **API Documentation:** http://localhost:5001/api/docs (nếu có)

## Quản lý containers

### Khởi động lại services

```bash
# Restart tất cả
docker-compose restart

# Restart một service
docker-compose restart backend
docker-compose restart frontend
```

### Dừng services

```bash
# Dừng containers (giữ data)
docker-compose stop

# Dừng và xóa containers (giữ volumes)
docker-compose down

# Dừng và xóa tất cả (bao gồm volumes)
docker-compose down -v
```

### Xem logs real-time

```bash
docker-compose logs -f --tail=100
```

### Truy cập container shell

```bash
# Backend
docker exec -it sharebuddy-backend sh

# Frontend
docker exec -it sharebuddy-frontend sh
```

## Cập nhật ứng dụng

### Cập nhật code và rebuild

```bash
# Pull latest code
git pull origin main

# Rebuild và restart
docker-compose up -d --build
```

### Rebuild một service cụ thể

```bash
# Backend only
docker-compose up -d --build backend

# Frontend only
docker-compose up -d --build frontend
```

## Troubleshooting

### 1. Backend không kết nối được database

**Triệu chứng:**
```
Error: connect ECONNREFUSED
```

**Giải pháp:**
- Kiểm tra `.env` file có đúng thông tin database
- Verify database server có thể truy cập từ Docker host:
```bash
telnet dingleberries.ddns.net 5432
```
- Kiểm tra firewall/security group cho phép kết nối

### 2. Frontend không load được

**Triệu chứng:**
- Browser hiển thị "Cannot GET /"
- Nginx error logs

**Giải pháp:**
```bash
# Kiểm tra nginx logs
docker-compose logs frontend

# Verify build đã thành công
docker exec -it sharebuddy-frontend ls -la /usr/share/nginx/html
```

### 3. API calls từ frontend bị lỗi CORS

**Triệu chứng:**
- Console error: "CORS policy blocked"

**Giải pháp:**
- Kiểm tra nginx proxy configuration
- Verify backend CORS middleware settings
- Check network connectivity giữa containers:
```bash
docker exec -it sharebuddy-frontend ping backend
```

### 4. Health check failed

**Triệu chứng:**
- Backend container restart liên tục
- Status: "unhealthy"

**Giải pháp:**
```bash
# Kiểm tra backend logs
docker-compose logs backend

# Test health endpoint manually
docker exec -it sharebuddy-backend wget -qO- http://localhost:5001/api/health

# Tăng start_period nếu app khởi động chậm
# Edit docker-compose.yml: start_period: 60s
```

### 5. Volume permission issues

**Triệu chứng:**
```
Error: EACCES: permission denied, mkdir '/app/uploads'
```

**Giải pháp:**
```bash
# Xóa volume cũ
docker-compose down -v

# Tạo lại và set permissions
docker-compose up -d
docker exec -it sharebuddy-backend chmod 777 /app/uploads
```

## Monitoring và Logs

### Xem resource usage

```bash
docker stats sharebuddy-backend sharebuddy-frontend
```

### Export logs

```bash
# Export tất cả logs
docker-compose logs --no-color > logs/docker-$(date +%Y%m%d).log

# Export backend logs only
docker-compose logs --no-color backend > logs/backend-$(date +%Y%m%d).log
```

### Log rotation

Thêm vào `docker-compose.yml`:
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Production Best Practices

### 1. Environment Variables

- **KHÔNG** commit file `.env` vào git
- Sử dụng secrets management (Docker Secrets, AWS Secrets Manager)
- Rotate secrets định kỳ

### 2. Security

```yaml
# Thêm vào docker-compose.yml
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

### 3. Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 4. Backup Strategy

```bash
# Backup uploaded files
docker run --rm -v sharebuddy_backend-uploads:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .

# Restore từ backup
docker run --rm -v sharebuddy_backend-uploads:/data -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/uploads-YYYYMMDD.tar.gz -C /data
```

### 5. SSL/TLS Termination

Sử dụng reverse proxy (nginx, Traefik, Caddy) với Let's Encrypt:

```yaml
# Thêm Traefik service
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=admin@example.com"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./letsencrypt:/letsencrypt

  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`sharebuddy.example.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=myresolver"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Copy files to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          source: "."
          target: "/opt/sharebuddy"
      
      - name: Deploy with Docker Compose
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/sharebuddy
            docker-compose pull
            docker-compose up -d --build
            docker-compose ps
```

## Scaling

### Horizontal Scaling với Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml sharebuddy

# Scale frontend
docker service scale sharebuddy_frontend=3

# Scale backend
docker service scale sharebuddy_backend=2
```

### Load Balancing

Sử dụng nginx hoặc HAProxy làm load balancer:

```nginx
upstream backend {
    least_conn;
    server backend1:5001;
    server backend2:5001;
    server backend3:5001;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

## Tài liệu tham khảo

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [nginx Documentation](https://nginx.org/en/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)

## Liên hệ và hỗ trợ

Nếu gặp vấn đề trong quá trình triển khai, vui lòng:
1. Kiểm tra phần Troubleshooting
2. Xem logs chi tiết: `docker-compose logs -f`
3. Tạo issue trên GitHub repository
4. Liên hệ team DevOps

---

**Phiên bản:** 1.0  
**Ngày cập nhật:** 24/11/2025  
**Tác giả:** ShareBuddy Development Team
