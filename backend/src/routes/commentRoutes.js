/**
 * Comment routes
 * Mounted at: /api/comments
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const commentController = require('../controllers/commentController');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// DEBUG
router.use((req, res, next) => {
  console.log(`[CommentRoute] ${req.method} ${req.url}`);
  next();
});

// --- DOCUMENT CENTRIC ROUTES ---

router.post('/document/:id',
  protect,
  [
    param('id').isUUID().withMessage('Invalid Document UUID'),
    body('content').notEmpty().trim().isLength({ max: 2000 }),
    body('parentId').optional().isUUID()
  ],
  validate,
  commentController.createComment
);

router.get('/document/:id',
  optionalAuth,
  [ param('id').isUUID() ],
  validate,
  commentController.getDocumentComments
);

// --- COMMENT SPECIFIC ROUTES ---

router.get('/:commentId/replies',
  optionalAuth,
  [ param('commentId').isUUID() ],
  validate,
  commentController.getCommentReplies
);

router.put('/:commentId',
  protect,
  [
    param('commentId').isUUID(),
    body('content').notEmpty().isLength({ max: 2000 })
  ],
  validate,
  commentController.updateComment
);

router.delete('/:commentId',
  protect,
  [ param('commentId').isUUID() ],
  validate,
  commentController.deleteComment
);

router.post('/:commentId/like',
  protect,
  [ param('commentId').isUUID() ],
  validate,
  commentController.toggleCommentLike
);

router.post('/:commentId/report',
  protect,
  [
    param('commentId').isUUID(),
    body('reason').notEmpty()
  ],
  validate,
  commentController.reportComment
);

module.exports = router;