/**
 * ShareBuddy Backend Server
 * Main application entry point with Express.js setup
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
const passport = require('./config/passport');
const paymentController = require('./controllers/paymentController');

// Import middleware and routes
const errorHandler = require('./middleware/errorHandler');
const { connectDB } = require('./config/database');

// Import routes - Enable main routes for testing
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const questionRoutes = require('./routes/questionRoutes');
const previewRoutes = require('./routes/previewRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const verifiedAuthorRoutes = require('./routes/verifiedAuthorRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const searchRoutes = require('./routes/searchRoutes');
const creditRoutes = require('./routes/creditRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const commentRoutes = require('./routes/commentRoutes');
const feedRoutes = require('./routes/feedRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
// const socialRoutes = require('./routes/socialRoutes');
// const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting configuration
// Strict rate limiter for authentication endpoints (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Quá nhiều requests đăng nhập/đăng ký, vui lòng thử lại sau.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient rate limiter for general API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Quá nhiều requests từ IP này, vui lòng thử lại sau.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post(
  '/api/payment/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware setup
// CORS configuration - Must be before other middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Apply general rate limiter to all routes
app.use(generalLimiter);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan('combined'));

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'sharebuddy-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

//Static files in docker - serve public assets

const uploadPath = path.join(process.cwd(), 'uploads');

app.use(
  '/uploads',
  express.static(uploadPath, {
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  })
);

// API Routes - Enable routes for testing
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/verified-author', verifiedAuthorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/webhooks', webhookRoutes);
// app.use('/api/social', socialRoutes);
// app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'ShareBuddy API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/auth',
      '/api/users', 
      '/api/documents',
      '/api/questions',
      '/api/preview',
      '/api/recommendations',
      '/api/verified-author',
      '/api/payment',
      '/api/search',
      '/api/ratings',
      '/api/comments',
      '/api/feed',
      '/api/notifications',
      '/api/credits',
      '/api/webhooks',
      '/api/social',
      '/api/admin',
      '/api/health'
    ]
  });
});

// Global error handler
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Initialize moderation queue
    const { initQueue } = require('./services/moderationQueue');
    await initQueue();
    console.log('✅ Moderation queue initialized');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 ShareBuddy server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  const { closeQueue } = require('./services/moderationQueue');
  await closeQueue();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  const { closeQueue } = require('./services/moderationQueue');
  await closeQueue();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;