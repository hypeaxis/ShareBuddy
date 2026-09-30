/**
 * Preview Controller - Generate and serve document previews
 * Using ImageMagick for reliable thumbnail generation
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { query } = require('../config/database');
const axios = require('axios');
const FormData = require('form-data');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PREVIEW_PAGE_LIMIT = 10;
const THUMBNAIL_WIDTH = 600;
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://localhost:3000';

const resolveFilePath = (dbPath) => {
  if (!dbPath) return null;
  const cleanPath = dbPath.startsWith('/') ? dbPath.slice(1) : dbPath;
  return path.join(process.cwd(), cleanPath);
};

// --- HELPER: Get PDF Buffer from any document type ---
const getRawPdfBytes = async (document) => {
  try {
    const filePath = resolveFilePath(document.file_path);
    const fileType = document.file_type ? document.file_type.toLowerCase().replace('.', '') : 'unknown';

    try {
      await fs.access(filePath);
    } catch (e) {
      return { success: false, error: 'File missing on disk' };
    }

    if (fileType === 'pdf') {
      const buffer = await fs.readFile(filePath);
      return { success: true, buffer };
    }

    if (['docx', 'doc', 'pptx', 'ppt', 'xlsx'].includes(fileType)) {
      const formData = new FormData();
      formData.append('files', fsSync.createReadStream(filePath));

      const response = await axios.post(
        `${GOTENBERG_URL}/forms/libreoffice/convert`, 
        formData, 
        {
          responseType: 'arraybuffer',
          headers: { ...formData.getHeaders() },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      return { success: true, buffer: Buffer.from(response.data) };
    }

    return { success: false, error: 'Unsupported file type for conversion' };
  } catch (error) {
    console.error('PDF Extraction Error:', error.message);
    return { success: false, error: error.message };
  }
};

// --- INTERNAL: Generate 10-page Preview ---
const generatePreviewInternal = async (documentId) => {
  const logPrefix = `[Preview-${documentId}]`;
  try {
    console.log(`${logPrefix} 🎬 Starting preview generation...`);
    
    const docResult = await query('SELECT * FROM documents WHERE document_id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      console.error(`${logPrefix} ❌ Document not found in database`);
      return { success: false, error: 'Document not found' };
    }
    const document = docResult.rows[0];
    console.log(`${logPrefix} 📄 Document found: ${document.title}`);

    const pdfRes = await getRawPdfBytes(document);
    if (!pdfRes.success) {
      console.error(`${logPrefix} ❌ Failed to get PDF bytes: ${pdfRes.error}`);
      return pdfRes;
    }
    console.log(`${logPrefix} ✅ PDF bytes extracted (${pdfRes.buffer.length} bytes)`);

    const pdfDoc = await PDFDocument.load(pdfRes.buffer);
    const totalPages = pdfDoc.getPageCount();
    const actualPreviewPages = Math.min(totalPages, PREVIEW_PAGE_LIMIT);
    console.log(`${logPrefix} 📖 Total pages: ${totalPages}, Preview pages: ${actualPreviewPages}`);

    const previewPdf = await PDFDocument.create();
    const pages = await previewPdf.copyPages(pdfDoc, Array.from({ length: actualPreviewPages }, (_, i) => i));
    
    pages.forEach(page => {
      const { width, height } = page.getSize();
      page.drawText('PREVIEW', {
        x: width / 2 - 100,
        y: height / 2,
        size: 50,
        opacity: 0.15,
        rotate: { angle: 45, type: 'degrees' }
      });
      previewPdf.addPage(page);
    });
    console.log(`${logPrefix} ✅ Preview pages prepared with watermark`);

    const previewBytes = await previewPdf.save();
    console.log(`${logPrefix} ✅ Preview PDF generated (${previewBytes.length} bytes)`);

    const previewDir = path.join(process.cwd(), 'uploads', 'previews');
    await fs.mkdir(previewDir, { recursive: true });
    
    const previewFileName = `preview_${documentId}.pdf`;
    const previewPathFull = path.join(previewDir, previewFileName);
    console.log(`${logPrefix} 💾 Writing to: ${previewPathFull}`);
    
    await fs.writeFile(previewPathFull, previewBytes);
    
    // Force sync to disk
    const fileHandle = await fs.open(previewPathFull, 'r+');
    await fileHandle.sync();
    await fileHandle.close();
    console.log(`${logPrefix} ✅ File written and synced to disk`);
    
    // Verify with small delay for Docker
    await new Promise(resolve => setTimeout(resolve, 100));
    const stats = await fs.stat(previewPathFull);
    console.log(`${logPrefix} ✅ File verified: ${stats.size} bytes`);
    
    const dbPreviewUrl = `/uploads/previews/${previewFileName}`;

    await query(
      `UPDATE documents SET preview_url = $1, preview_pages = $2, preview_generated = TRUE WHERE document_id = $3`,
      [dbPreviewUrl, actualPreviewPages, documentId]
    );
    console.log(`${logPrefix} ✅ Database updated`);

    console.log(`${logPrefix} 🎉 Preview generation completed successfully`);
    return { success: true, previewUrl: dbPreviewUrl };
  } catch (error) {
    console.error(`${logPrefix} ❌ PREVIEW GENERATION FAILED:`);
    console.error(`${logPrefix} Error: ${error.message}`);
    console.error(`${logPrefix} Stack:`, error.stack);
    return { success: false, error: error.message, details: error.stack };
  }
};

// --- INTERNAL: Generate Thumbnail (Page 1 -> PNG) ---
const generateThumbnailInternal = async (documentId) => {
  const logPrefix = `[Thumbnail-${documentId}]`;
  try {
    console.log(`${logPrefix} 🎬 Starting thumbnail generation...`);
    
    const docResult = await query('SELECT * FROM documents WHERE document_id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      console.error(`${logPrefix} ❌ Document not found in database`);
      return { success: false, error: 'Document not found' };
    }
    const document = docResult.rows[0];
    console.log(`${logPrefix} 📄 Document found: ${document.title}, Type: ${document.file_type}`);

    const pdfRes = await getRawPdfBytes(document);
    if (!pdfRes.success) {
      console.error(`${logPrefix} ❌ Failed to get PDF bytes: ${pdfRes.error}`);
      return pdfRes;
    }
    console.log(`${logPrefix} ✅ PDF bytes extracted (${pdfRes.buffer.length} bytes)`);

    const uint8Array = new Uint8Array(pdfRes.buffer);
    console.log(`${logPrefix} � Loading PDF with pdfjs-dist...`);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    console.log(`${logPrefix} ✅ PDF loaded, pages: ${pdfDocument.numPages}`);
    
    console.log(`${logPrefix} 🎨 Rendering page 1...`);
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    console.log(`${logPrefix} 📐 Original viewport: ${viewport.width}x${viewport.height}`);
    
    const scale = THUMBNAIL_WIDTH / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    console.log(`${logPrefix} 📐 Scaled viewport: ${scaledViewport.width}x${scaledViewport.height}, scale: ${scale}`);

    const canvas = createCanvas(scaledViewport.width, scaledViewport.height);
    const context = canvas.getContext('2d');
    console.log(`${logPrefix} 🖼️ Canvas created`);

    // Create render context with proper image/canvas support
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
      canvasFactory: new NodeCanvasFactory(),
      // CRITICAL: Provide Image class to pdfjs-dist
      imageLayer: null,
      background: 'white'
    };

    await page.render(renderContext).promise;
    console.log(`${logPrefix} ✅ Page rendered to canvas`);

    const buffer = canvas.toBuffer('image/png');
    console.log(`${logPrefix} ✅ PNG buffer created (${buffer.length} bytes)`);
    
    const thumbDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    console.log(`${logPrefix} 📁 Thumbnail directory: ${thumbDir}`);
    
    await fs.mkdir(thumbDir, { recursive: true });
    console.log(`${logPrefix} ✅ Directory ensured`);
    
    const thumbName = `thumb_${documentId}.png`;
    const thumbPath = path.join(thumbDir, thumbName);
    console.log(`${logPrefix} 💾 Writing to: ${thumbPath}`);
    
    // Write file with sync to ensure it's flushed to disk
    await fs.writeFile(thumbPath, buffer);
    
    // Force sync to disk (important for Docker volumes)
    const fileHandle = await fs.open(thumbPath, 'r+');
    await fileHandle.sync(); // fsync to ensure data is written to disk
    await fileHandle.close();
    
    console.log(`${logPrefix} ✅ File written and synced to disk`);
    
    // Verify file was written with a small delay for Docker volume sync
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const stats = await fs.stat(thumbPath);
      console.log(`${logPrefix} ✅ File verified on disk: ${stats.size} bytes`);
      
      if (stats.size !== buffer.length) {
        console.warn(`${logPrefix} ⚠️ File size mismatch! Expected: ${buffer.length}, Got: ${stats.size}`);
        throw new Error(`File size mismatch: expected ${buffer.length}, got ${stats.size}`);
      }
    } catch (statError) {
      console.error(`${logPrefix} ⚠️ File verification failed:`, statError.message);
      throw new Error(`File verification failed: ${statError.message}`);
    }

    const dbThumbUrl = `/uploads/thumbnails/${thumbName}`;
    console.log(`${logPrefix} 🗄️ Updating database with: ${dbThumbUrl}`);

    await query(
      'UPDATE documents SET thumbnail_url = $1 WHERE document_id = $2',
      [dbThumbUrl, documentId]
    );
    console.log(`${logPrefix} ✅ Database updated`);

    console.log(`${logPrefix} 🎉 Thumbnail generation completed successfully`);
    return { success: true, thumbnailUrl: dbThumbUrl };

  } catch (error) {
    console.error(`${logPrefix} ❌ THUMBNAIL GENERATION FAILED:`);
    console.error(`${logPrefix} Error name: ${error.name}`);
    console.error(`${logPrefix} Error message: ${error.message}`);
    console.error(`${logPrefix} Error stack:`, error.stack);
    return { success: false, error: error.message, details: error.stack };
  }
};

// --- Node Canvas Factory for PDF.js with Image support ---
class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// CRITICAL FIX: Patch canvas context to properly handle image drawing
const { CanvasRenderingContext2D } = require('canvas');
const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;

CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
  // Ensure image is a valid canvas Image or Canvas
  if (image && typeof image === 'object') {
    // Check if it's already a canvas Image or Canvas - if so, use it directly
    if (image.constructor.name === 'Image' || image.constructor.name === 'Canvas') {
      return originalDrawImage.call(this, image, ...args);
    }
    // If it has a canvas property (from pdfjs), extract it
    if (image.canvas) {
      return originalDrawImage.call(this, image.canvas, ...args);
    }
  }
  // Fallback to original
  return originalDrawImage.call(this, image, ...args);
};

// Set canvas's Image class globally
if (typeof global.Image === 'undefined') {
  global.Image = Image;
}

// Set Canvas globally
if (typeof global.Canvas === 'undefined') {
  const dummyCanvas = createCanvas(0, 0);
  global.Canvas = dummyCanvas.constructor;
}

// FIX: Added proper response
const generatePreview = async (req, res, next) => {
  try {
    const result = await generatePreviewInternal(req.params.documentId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Preview generated successfully',
      data: {
        previewUrl: result.previewUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// Serve preview file
const servePreview = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const docResult = await query(
      'SELECT preview_url, title FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = docResult.rows[0];
    
    if (!document.preview_url) {
      return res.status(404).json({
        success: false,
        error: 'Preview chưa được tạo. Vui lòng tạo preview trước.'
      });
    }

    const previewPath = resolveFilePath(document.preview_url);

    try {
      await fs.access(previewPath);
    } catch (error) {
      console.error('Preview file not found:', previewPath);
      return res.status(404).json({
        success: false,
        error: 'File preview không tồn tại'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview_${document.title}.pdf"`);
    
    const fileBuffer = await fs.readFile(previewPath);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

// FIX: Added proper response
const generateThumbnail = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    
    const result = await generateThumbnailInternal(documentId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Thumbnail generated successfully',
      data: {
        thumbnailUrl: result.thumbnailUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// Serve thumbnail
const serveThumbnail = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const docResult = await query(
      'SELECT thumbnail_url FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = docResult.rows[0];
    
    if (!document.thumbnail_url) {
      return res.status(404).json({
        success: false,
        error: 'Thumbnail chưa được tạo'
      });
    }

    const thumbnailPath = resolveFilePath(document.thumbnail_url);

    try {
      await fs.access(thumbnailPath);
    } catch (error) {
      console.error('Thumbnail file not found:', thumbnailPath);
      return res.status(404).json({
        success: false,
        error: 'File thumbnail không tồn tại'
      });
    }

    res.setHeader('Content-Type', 'image/png');
    
    const fileBuffer = await fs.readFile(thumbnailPath);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

// Get preview info
const getPreviewInfo = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const result = await query(
      `SELECT 
        document_id,
        title,
        preview_url,
        preview_pages,
        thumbnail_url,
        file_size
       FROM documents 
       WHERE document_id = $1`,
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const doc = result.rows[0];

    res.json({
      success: true,
      data: {
        documentId: doc.document_id,
        title: doc.title,
        hasPreview: !!doc.preview_url,
        hasThumbnail: !!doc.thumbnail_url,
        previewPages: doc.preview_pages,
        fileSize: doc.file_size,
        previewUrl: doc.preview_url || null,
        thumbnailUrl: doc.thumbnail_url || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// FIX: Added leading slash to preview_url
const batchGeneratePreviews = async (req, res, next) => {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document IDs phải là mảng không rỗng'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const documentId of documentIds) {
      try {
        const docResult = await query(
          'SELECT * FROM documents WHERE document_id = $1',
          [documentId]
        );

        if (docResult.rows.length === 0) {
          results.failed.push({ documentId, reason: 'Không tìm thấy' });
          continue;
        }

        const document = docResult.rows[0];
        
        // Use getRawPdfBytes helper
        const pdfRes = await getRawPdfBytes(document);
        if (!pdfRes.success) {
          results.failed.push({ documentId, reason: pdfRes.error });
          continue;
        }

        const pdfDoc = await PDFDocument.load(pdfRes.buffer);
        
        const totalPages = pdfDoc.getPageCount();
        const previewPages = Math.min(totalPages, 5);

        const previewPdf = await PDFDocument.create();
        const pages = await previewPdf.copyPages(pdfDoc, Array.from({ length: previewPages }, (_, i) => i));
        
        pages.forEach(page => previewPdf.addPage(page));

        const previewBytes = await previewPdf.save();

        const previewDir = path.join(process.cwd(), 'uploads', 'previews');
        await fs.mkdir(previewDir, { recursive: true });
        
        const previewFileName = `preview_${documentId}.pdf`;
        const previewPath = path.join(previewDir, previewFileName);
        
        await fs.writeFile(previewPath, previewBytes);

        // FIX: Added leading slash
        await query(
          'UPDATE documents SET preview_url = $1, preview_pages = $2 WHERE document_id = $3',
          [`/uploads/previews/${previewFileName}`, previewPages, documentId]
        );

        results.success.push(documentId);
      } catch (error) {
        results.failed.push({ documentId, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: `Đã tạo ${results.success.length}/${documentIds.length} previews`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generatePreview,
  servePreview,
  generateThumbnail,
  generatePreviewInternal,
  generateThumbnailInternal,
  serveThumbnail,
  getPreviewInfo,
  batchGeneratePreviews
};