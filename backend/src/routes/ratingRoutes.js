/**
 * Rating routes
 * Mounted at: /api/ratings
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const ratingController = require('../controllers/ratingController');

const router = express.Router();

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// DEBUG: Log all requests to this router
router.use((req, res, next) => {
  console.log(`[RatingRoute] ${req.method} ${req.url}`);
  next();
});

// --- DOCUMENT CENTRIC ROUTES ---

// 1. Rate document
router.post('/document/:id',
  protect,
  [
    param('id').isUUID().withMessage('Invalid UUID'),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().isLength({ max: 1000 })
  ],
  validate,
  ratingController.rateDocument
);

// 2. Get stats (specific path first)
router.get('/document/:id/stats',
  optionalAuth,
  [ param('id').isUUID() ],
  validate,
  ratingController.getDocumentRatings
);

// 3. Get user rating
router.get('/document/:id/user-rating',
  protect,
  [ param('id').isUUID() ],
  validate,
  ratingController.getUserRating
);

// 4. Get ratings list (generic path last)
router.get('/document/:id',
  optionalAuth,
  [ param('id').isUUID() ],
  validate,
  ratingController.getDocumentRatings
);

router.delete('/document/:id',
  protect,
  [ param('id').isUUID() ],
  validate,
  ratingController.deleteRating
);

// --- RATING SPECIFIC ROUTES ---

router.post('/:ratingId/like',
  protect,
  [ param('ratingId').isUUID() ],
  validate,
  ratingController.toggleRatingLike
);

router.post('/:ratingId/report',
  protect,
  [
    param('ratingId').isUUID(),
    body('reason').notEmpty()
  ],
  validate,
  ratingController.reportRating
);

// --- GENERAL ROUTES ---

router.get('/top-rated',
  optionalAuth,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('minRatings').optional().isInt({ min: 1 }),
    query('subject').optional().isLength({ min: 1 })
  ],
  validate,
  ratingController.getTopRatedDocuments
);

module.exports = router;