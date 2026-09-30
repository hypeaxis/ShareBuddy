# Frontend Dockerfile for ShareBuddy
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Build arguments for React environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_APP_NAME
ARG REACT_APP_VERSION

# Set environment variables for build
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_APP_NAME=${REACT_APP_APP_NAME}
ENV REACT_APP_VERSION=${REACT_APP_VERSION}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
