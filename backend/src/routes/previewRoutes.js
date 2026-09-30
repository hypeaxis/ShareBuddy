/**
 * Preview routes - Document preview and thumbnail generation
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const previewController = require('../controllers/previewController');
const { protect } = require('../middleware/auth');

// Get preview info (Public)
router.get('/:documentId/info', previewController.getPreviewInfo);

// Serve actual PDF preview file (Public)
router.get('/:documentId', previewController.servePreview);

// Serve thumbnail image (Public)
router.get('/thumbnail/:documentId', previewController.serveThumbnail);

// --- GENERATION ROUTES (Updated: No Admin Required) ---

// Generate PDF preview manually (Protected - usually Owner triggers this)
router.post('/:documentId/generate',
  protect,
  previewController.generatePreview
);

// Generate thumbnail manually
router.post('/:documentId/thumbnail',
  protect,
  previewController.generateThumbnail
);

module.exports = router;