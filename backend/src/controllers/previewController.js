/**
 * Preview Controller - Generate and serve document previews
 */

const { PDFDocument } = require('pdf-lib');
const { createCanvas } = require('canvas');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { query } = require('../config/database');
const axios = require('axios');
const FormData = require('form-data');

// PDF.js setup for Node environment
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

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
  try {
    const docResult = await query('SELECT * FROM documents WHERE document_id = $1', [documentId]);
    if (docResult.rows.length === 0) return { success: false, error: 'Not found' };
    const document = docResult.rows[0];

    const pdfRes = await getRawPdfBytes(document);
    if (!pdfRes.success) return pdfRes;

    const pdfDoc = await PDFDocument.load(pdfRes.buffer);
    const totalPages = pdfDoc.getPageCount();
    const actualPreviewPages = Math.min(totalPages, PREVIEW_PAGE_LIMIT);

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

    const previewBytes = await previewPdf.save();

    const previewDir = path.join(process.cwd(), 'uploads', 'previews');
    await fs.mkdir(previewDir, { recursive: true });
    const previewFileName = `preview_${documentId}.pdf`;
    const previewPathFull = path.join(previewDir, previewFileName);
    await fs.writeFile(previewPathFull, previewBytes);
    
    const dbPreviewUrl = `/uploads/previews/${previewFileName}`;

    await query(
      `UPDATE documents SET preview_url = $1, preview_pages = $2, preview_generated = TRUE WHERE document_id = $3`,
      [dbPreviewUrl, actualPreviewPages, documentId]
    );

    return { success: true, previewUrl: dbPreviewUrl };
  } catch (error) {
    console.error('Preview Gen Error:', error);
    return { success: false, error: error.message };
  }
};

// --- INTERNAL: Generate Thumbnail (Page 1 -> PNG) ---
const generateThumbnailInternal = async (documentId) => {
  try {
    const docResult = await query('SELECT * FROM documents WHERE document_id = $1', [documentId]);
    if (docResult.rows.length === 0) return { success: false, error: 'Not found' };
    const document = docResult.rows[0];

    const pdfRes = await getRawPdfBytes(document);
    if (!pdfRes.success) return pdfRes;

    const uint8Array = new Uint8Array(pdfRes.buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    
    const scale = THUMBNAIL_WIDTH / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = createCanvas(scaledViewport.width, scaledViewport.height);
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      canvasFactory: new NodeCanvasFactory(),
    }).promise;

    const buffer = canvas.toBuffer('image/png');
    const thumbDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    await fs.mkdir(thumbDir, { recursive: true });
    const thumbName = `thumb_${documentId}.png`;
    const thumbPath = path.join(thumbDir, thumbName);
    await fs.writeFile(thumbPath, buffer);

    const dbThumbUrl = `/uploads/thumbnails/${thumbName}`;

    await query(
      'UPDATE documents SET thumbnail_url = $1 WHERE document_id = $2',
      [dbThumbUrl, documentId]
    );

    return { success: true, thumbnailUrl: dbThumbUrl };

  } catch (error) {
    console.error('Thumbnail Gen Error:', error);
    return { success: false, error: error.message };
  }
};

// --- Node Canvas Factory for PDF.js ---
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