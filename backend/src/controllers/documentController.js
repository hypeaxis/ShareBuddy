/**
 * Document controller
 * Handles document management, search, download, and interactions
 */

const { query, withTransaction } = require('../config/database');
const previewController = require('./previewController');
const path = require('path');
const fs = require('fs');

// Helper to resolve file paths safely
const resolveFilePath = (dbPath) => {
  if (!dbPath) return null;
  // If path starts with /uploads, strip it to avoid duplication when joining with process.cwd()
  const cleanPath = dbPath.startsWith('/') ? dbPath.slice(1) : dbPath;
  return path.join(process.cwd(), cleanPath);
};

// Get all documents with filters and pagination
const getDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    const {
      search,
      subject,
      university,
      major,
      minRating,
      maxCost,
      verifiedAuthor,
      year,
      authorId,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      tags
    } = req.query;

    // Build WHERE clause dynamically
    let whereConditions = ["d.status = 'approved'"];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`d.title ILIKE $${paramCount}`);
      queryParams.push(`%${search}%`);
    }

    if (subject) {
      paramCount++;
      whereConditions.push(`d.subject ILIKE $${paramCount}`);
      queryParams.push(`%${subject}%`);
    }

    if (university) {
      paramCount++;
      whereConditions.push(`u.university = $${paramCount}`);
      queryParams.push(university);
    }

    if (major) {
      paramCount++;
      whereConditions.push(`u.major = $${paramCount}`);
      queryParams.push(major);
    }

    if (minRating) {
      paramCount++;
      whereConditions.push(`d.average_rating >= $${paramCount}`);
      queryParams.push(parseFloat(minRating));
    }

    if (maxCost) {
      paramCount++;
      whereConditions.push(`d.credit_cost <= $${paramCount}`);
      queryParams.push(parseInt(maxCost));
    }

    if (verifiedAuthor === 'true' || verifiedAuthor === true) {
      whereConditions.push(`u.is_verified_author = true`);
    }

    if (year) {
      paramCount++;
      whereConditions.push(`EXTRACT(YEAR FROM d.created_at) = $${paramCount}`);
      queryParams.push(parseInt(year));
    }

    if (authorId) {
      paramCount++;
      whereConditions.push(`d.author_id = $${paramCount}`);
      queryParams.push(authorId);
    }

    // TAGS FILTER
    if (tags) {
      let tagsArray = [];
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(t => t.trim());
      }
      tagsArray = tagsArray.filter(tag => tag.length > 0);

      if (tagsArray.length > 0) {
        const existsConditions = tagsArray.map((tag) => {
          paramCount++;
          queryParams.push(`%${tag}%`); 
          return `EXISTS (SELECT 1 FROM document_tags t WHERE t.document_id = d.document_id AND t.tag_name ILIKE $${paramCount})`;
        });
        whereConditions.push(`(${existsConditions.join(' OR ')})`);
      }
    }

    // Add pagination params
    queryParams.push(limit, offset);
    const limitParam = ++paramCount;
    const offsetParam = ++paramCount;

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Sorting
    const sortByMapping = {
      'newest': 'created_at',
      'oldest': 'created_at',
      'popular': 'download_count',
      'rating': 'average_rating',
      'downloads': 'download_count',
      'created_at': 'created_at',
      'title': 'title',
      'download_count': 'download_count',
      'avg_rating': 'average_rating',
      'credit_cost': 'credit_cost'
    };
    
    const sortOrderMapping = {
      'newest': 'DESC',
      'oldest': 'ASC',
      'popular': 'DESC',
      'rating': 'DESC',
      'downloads': 'DESC'
    };
    
    const mappedSortBy = sortByMapping[sortBy] || 'created_at';
    const mappedSortOrder = sortOrderMapping[sortBy] || sortOrder.toUpperCase();
    const finalSortOrder = ['ASC', 'DESC'].includes(mappedSortOrder) ? mappedSortOrder : 'DESC';

    const documentsQuery = `
      SELECT 
        d.document_id,
        d.title,
        d.description,
        d.file_name,
        d.file_size,
        d.file_type,
        d.university,
        d.subject,
        d.download_count,
        d.view_count,
        d.credit_cost,
        d.is_public,
        d.is_premium,
        d.status,
        d.average_rating,
        d.rating_count,
        d.created_at,
        d.updated_at,
        d.thumbnail_url,
        d.preview_url,
        u.user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.is_verified_author,
        COALESCE(
          (SELECT array_agg(tag_name) 
           FROM document_tags 
           WHERE document_id = d.document_id), 
          ARRAY[]::text[]
        ) as tags
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      ${whereClause}
      ORDER BY ${mappedSortBy === 'average_rating' ? 'd.average_rating' : 'd.' + mappedSortBy} ${finalSortOrder}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await query(documentsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT d.document_id) as total
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Check bookmarks for authenticated users
    let bookmarkedDocIds = [];
    if (req.user) {
      const bookmarksQuery = await query(
        'SELECT document_id FROM bookmarks WHERE user_id = $1',
        [req.user.user_id]
      );
      bookmarkedDocIds = bookmarksQuery.rows.map(row => row.document_id);
    }

    res.json({
      success: true,
      data: {
        items: result.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          description: row.description,
          fileName: row.file_name,
          fileType: row.file_type,
          subject: row.subject,
          university: row.university,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          viewCount: row.view_count,
          avgRating: row.average_rating ? parseFloat(row.average_rating).toFixed(1) : '0.0',
          ratingCount: row.rating_count || 0,
          tags: row.tags || [],
          createdAt: row.created_at,
          thumbnailUrl: row.thumbnail_url,
          previewUrl: row.preview_url,
          author: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          },
          userInteraction: req.user ? {
            isBookmarked: bookmarkedDocIds.includes(row.document_id),
            canDownload: req.user.user_id === row.user_id || req.user.credits >= row.credit_cost
          } : null
        })),
        page,
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get document by ID
const getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT d.document_id, d.title, d.description, d.file_url, d.thumbnail_url,
              d.subject, d.credit_cost, d.download_count, d.status, d.author_id,
              d.created_at, d.updated_at,
              d.file_name, d.file_type,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              u.university, u.major,
              COALESCE(rating_stats.avg_rating, 0) as avg_rating,
              COALESCE(rating_stats.rating_count, 0)::integer as rating_count,
              COALESCE(question_stats.question_count, 0)::integer as question_count,
              COALESCE(comment_stats.comment_count, 0)::integer as comment_count
       FROM documents d
       JOIN users u ON d.author_id = u.user_id
       LEFT JOIN (
         SELECT document_id, AVG(rating) as avg_rating, COUNT(*)::integer as rating_count
         FROM ratings
         GROUP BY document_id
       ) rating_stats ON d.document_id = rating_stats.document_id
       LEFT JOIN (
         SELECT document_id, COUNT(*)::integer as question_count
         FROM questions
         GROUP BY document_id
       ) question_stats ON d.document_id = question_stats.document_id
       LEFT JOIN (
         SELECT document_id, COUNT(*)::integer as comment_count
         FROM comments
         GROUP BY document_id
       ) comment_stats ON d.document_id = comment_stats.document_id
       WHERE d.document_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = result.rows[0];

    // Check permissions
    if (document.status !== 'approved' && 
        (!req.user || req.user.user_id !== document.author_id)) {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập tài liệu này'
      });
    }

    // User interactions
    let isBookmarked = false;
    let userRating = null;
    let canDownload = false;

    if (req.user) {
      const bookmarkResult = await query(
        'SELECT 1 FROM bookmarks WHERE user_id = $1 AND document_id = $2',
        [req.user.user_id, id]
      );
      isBookmarked = bookmarkResult.rows.length > 0;

      const ratingResult = await query(
        'SELECT rating FROM ratings WHERE user_id = $1 AND document_id = $2',
        [req.user.user_id, id]
      );
      if (ratingResult.rows.length > 0) {
        userRating = { rating: ratingResult.rows[0].rating };
      }

      if (req.user.user_id === document.user_id) {
        canDownload = true;
      } else {
        const downloadResult = await query(
          'SELECT 1 FROM downloads WHERE user_id = $1 AND document_id = $2',
          [req.user.user_id, id]
        );
        canDownload = downloadResult.rows.length > 0 || req.user.credits >= document.credit_cost;
      }
    }

    res.json({
      success: true,
      data: {
        document: {
          id: document.document_id,
          title: document.title,
          description: document.description,
          fileName: document.file_name,
          fileType: document.file_type,
          fileUrl: document.file_url,
          thumbnailUrl: document.thumbnail_url,
          subject: document.subject,
          creditCost: document.credit_cost,
          downloadCount: document.download_count,
          status: document.status,
          avgRating: document.avg_rating ? parseFloat(document.avg_rating).toFixed(1) : null,
          ratingCount: parseInt(document.rating_count) || 0,
          questionCount: parseInt(document.question_count) || 0,
          commentCount: parseInt(document.comment_count) || 0,
          createdAt: document.created_at,
          updatedAt: document.updated_at,
          author: {
            id: document.author_id,
            username: document.username,
            fullName: document.full_name,
            avatarUrl: document.avatar_url,
            isVerifiedAuthor: document.is_verified_author,
            university: document.university,
            major: document.major
          },
          userInteraction: req.user ? {
            isBookmarked,
            userRating,
            canDownload
          } : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Upload document
const uploadDocument = async (req, res, next) => {
  try {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`\n🆕 [${requestId}] Upload request received`);
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Không có file được upload' });
    }

    const { title, description, subject, creditCost, university, tags } = req.body;
    
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Tiêu đề phải có ít nhất 3 ký tự' });
    }

    const userId = req.user.user_id;
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const fileType = path.extname(req.file.originalname).toLowerCase().slice(1);
    
    let document;
    let moderationJob;
    
    // Transaction
    await withTransaction(async (client) => {
      // Insert Document
      const result = await client.query(
        `INSERT INTO documents (author_id, title, description, file_path, file_name, file_size, file_type, subject, university, credit_cost, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING document_id, title, description, file_path, file_name, file_size, file_type, subject, university, credit_cost, status, created_at`,
        [userId, title, description, fileUrl, fileName, fileSize, fileType, subject, university || null, parseInt(creditCost) || 0, 'pending']
      );
      document = result.rows[0];
      
      // Create Moderation Job
      const moderationResult = await client.query(
        `INSERT INTO moderation_jobs (document_id, moderation_status)
         VALUES ($1, $2)
         RETURNING job_id, document_id, moderation_status, created_at`,
        [document.document_id, 'queued']
      );
      moderationJob = moderationResult.rows[0];
    });
    
    // Tags
    if (tags) {
      const tagList = typeof tags === 'string' 
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : Array.isArray(tags) ? tags : [];
      
      if (tagList.length > 0) {
        for (const tag of tagList) {
          await query(
            'INSERT INTO document_tags (document_id, tag_name) VALUES ($1, $2)',
            [document.document_id, tag]
          );
        }
      }
    }
    
    // --- AUTOMATIC GENERATION ---
    console.log(`[${requestId}] 🖼️ Generating preview & thumbnail...`);
    
    // Run concurrently
    Promise.allSettled([
        previewController.generatePreviewInternal(document.document_id),
        previewController.generateThumbnailInternal(document.document_id)
    ]).then(results => {
        const [previewRes, thumbRes] = results;
        if(previewRes.status === 'fulfilled' && previewRes.value.success) 
            console.log(`[${requestId}] ✅ Preview generated`);
        else 
            console.error(`[${requestId}] ❌ Preview failed`);

        if(thumbRes.status === 'fulfilled' && thumbRes.value.success) 
            console.log(`[${requestId}] ✅ Thumbnail generated`);
        else 
            console.error(`[${requestId}] ❌ Thumbnail failed`);
    });

    // Redis Moderation
    console.log(`[${requestId}] 🚀 Pushing to Redis queue for moderation...`);
    setImmediate(async () => {
      try {
        const { addModerationJob } = require('../services/moderationQueue');
        await addModerationJob({
          document_id: document.document_id,
          file_path: fileUrl,
          metadata: { title, description, subject, fileType, userId }
        });
      } catch (queueError) {
        console.error(`[${requestId}] ⚠️ Failed to push to Redis queue:`, queueError.message);
      }
    });
    
    console.log(`[${requestId}] ℹ️ Credit will be awarded after moderation approval`);
    console.log(`[${requestId}] 🎉 Document uploaded successfully - awaiting moderation`);

    // Check and auto-verify user if eligible (async, non-blocking)
    setImmediate(async () => {
      try {
        const verifiedAuthorService = require('../services/verifiedAuthorService');
        await verifiedAuthorService.checkAndAutoVerify(userId);
      } catch (err) {
        console.error(`[${requestId}] ⚠️ Auto-verification check failed:`, err.message);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tài liệu đã được tải lên và đang được kiểm duyệt.',
      data: {
        document: {
          id: document.document_id,
          title: document.title,
          status: document.status,
          createdAt: document.created_at
        },
        moderation: moderationJob ? { jobId: moderationJob.job_id } : null
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
};

// Download document
const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // 1. Fetch document metadata
    const docResult = await query(
      `SELECT file_path, file_name, credit_cost, author_id, title
       FROM documents
       WHERE document_id = $1 AND status = 'approved'`,
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tài liệu không tồn tại hoặc chưa được duyệt' });
    }

    const doc = docResult.rows[0];

    // 2. Verify File Existence
    const absolutePath = resolveFilePath(doc.file_path);
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return res.status(500).json({ success: false, error: 'File gốc không tìm thấy trên server' });
    }

    // 3. Check Permissions
    const existingDownload = await query(
      'SELECT 1 FROM downloads WHERE user_id = $1 AND document_id = $2',
      [userId, id]
    );

    const isOwner = doc.author_id === userId;
    const alreadyDownloaded = existingDownload.rows.length > 0;

    // 4. Process Payment (if not owner/downloaded)
    if (!isOwner && !alreadyDownloaded) {
      const userResult = await query('SELECT credits FROM users WHERE user_id = $1', [userId]);

      if (userResult.rows[0].credits < doc.credit_cost) {
        return res.status(402).json({ success: false, error: 'Không đủ credits' });
      }

      await withTransaction(async (client) => {
        // Record download
        await client.query('INSERT INTO downloads (user_id, document_id) VALUES ($1, $2)', [userId, id]);
        // Update stats
        await client.query('UPDATE documents SET download_count = download_count + 1 WHERE document_id = $1', [id]);
        // Deduct from User
        await client.query(
          `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
           VALUES ($1, $2, 'download', $3, $4)`,
          [userId, -doc.credit_cost, `Tải tài liệu: ${doc.title}`, id]
        );
        // Add to Author
        await client.query(
          `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
           VALUES ($1, $2, 'earn', $3, $4)`,
          [doc.author_id, doc.credit_cost, `Bán tài liệu: ${doc.title}`, id]
        );
      });
    }

    // 5. Send File
    // Expose header so frontend can read filename
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);

    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);

  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      next(err);
    }
  }
};

const bookmarkDocument = async (req, res, next) => {
try {
  const { id: documentId } = req.params;
  const userId = req.user.user_id;
  // Check if document exists and is approved
  const docResult = await query(
    'SELECT document_id, title FROM documents WHERE document_id = $1 AND status = $2',
    [documentId, 'approved']
  );

  if (docResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Tài liệu không tồn tại hoặc chưa được duyệt'
    });
  }
// Check if already bookmarked
const existingBookmark = await query(
  'SELECT 1 FROM bookmarks WHERE user_id = $1 AND document_id = $2',
  [userId, documentId]
);

if (existingBookmark.rows.length > 0) {
  return res.status(409).json({
    success: false,
    error: 'Tài liệu đã được bookmark rồi'
  });
}

// Create bookmark
await query(
  'INSERT INTO bookmarks (user_id, document_id) VALUES ($1, $2)',
  [userId, documentId]
);

res.json({
  success: true,
  message: 'Bookmark tài liệu thành công'
});
  } catch (error) {
  next(error);
  }
};
const removeBookmark = async (req, res, next) => {
try {
const { id: documentId } = req.params;
const userId = req.user.user_id;
const result = await query(
  'DELETE FROM bookmarks WHERE user_id = $1 AND document_id = $2',
  [userId, documentId]
);

if (result.rowCount === 0) {
  return res.status(404).json({
    success: false,
    error: 'Bookmark không tồn tại'
  });
}

res.json({
  success: true,
  message: 'Xóa bookmark thành công'
});
} catch (error) {
next(error);
}
};

const getSuggestedTags = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) return res.json({ success: true, data: [] });

    const tagQuery = `
      SELECT DISTINCT tag_name 
      FROM document_tags 
      WHERE tag_name ILIKE $1 
      ORDER BY tag_name ASC LIMIT 10
    `;
    const result = await query(tagQuery, [`%${q.trim()}%`]);
    res.json({ success: true, data: result.rows.map(row => row.tag_name) });
  } catch (error) {
    next(error);
  }
};

// Get user's bookmarked documents
const getUserBookmarks = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    const { search, subject, minRating, maxCost, verifiedAuthor, year, sortBy = 'created_at', sortOrder = 'DESC', tags } = req.query;

    let whereConditions = ["d.status = 'approved'", "b.user_id = $1"];
    let queryParams = [userId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereConditions.push(`(d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount} OR d.subject ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }
    if (subject) {
      paramCount++;
      whereConditions.push(`d.subject ILIKE $${paramCount}`);
      queryParams.push(`%${subject}%`);
    }
    if (minRating) {
      paramCount++;
      whereConditions.push(`d.average_rating >= $${paramCount}`);
      queryParams.push(parseFloat(minRating));
    }
    if (maxCost) {
      paramCount++;
      whereConditions.push(`d.credit_cost <= $${paramCount}`);
      queryParams.push(parseInt(maxCost));
    }
    if (verifiedAuthor === 'true') {
      whereConditions.push(`u.is_verified_author = true`);
    }
    if (year) {
      paramCount++;
      whereConditions.push(`EXTRACT(YEAR FROM d.created_at) = $${paramCount}`);
      queryParams.push(parseInt(year));
    }

    if (tags) {
      let tagsArray = [];
      if (Array.isArray(tags)) tagsArray = tags;
      else if (typeof tags === 'string') tagsArray = tags.split(',').map(t => t.trim());
      
      tagsArray = tagsArray.filter(tag => tag.length > 0);
      if (tagsArray.length > 0) {
        const existsConditions = tagsArray.map((tag) => {
          paramCount++;
          queryParams.push(`%${tag}%`);
          return `EXISTS (SELECT 1 FROM document_tags t WHERE t.document_id = d.document_id AND t.tag_name ILIKE $${paramCount})`;
        });
        whereConditions.push(`(${existsConditions.join(' OR ')})`);
      }
    }

    queryParams.push(limit, offset);
    const limitParam = ++paramCount;
    const offsetParam = ++paramCount;

    const whereClause = whereConditions.join(' AND ');
    
    const documentsQuery = `
      SELECT 
        d.document_id, d.title, d.description, d.file_name, d.file_size, d.file_type,
        d.university, d.subject, d.download_count, d.view_count, d.credit_cost,
        d.is_public, d.status, d.average_rating, d.rating_count, d.created_at, 
        d.thumbnail_url, d.preview_url, u.user_id, u.username, u.full_name, 
        u.avatar_url, u.is_verified_author, b.created_at as bookmarked_at,
        COALESCE(
          (SELECT array_agg(tag_name) FROM document_tags WHERE document_id = d.document_id), 
          ARRAY[]::text[]
        ) as tags
      FROM bookmarks b
      JOIN documents d ON b.document_id = d.document_id
      JOIN users u ON d.author_id = u.user_id
      WHERE ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await query(documentsQuery, queryParams);

    const countQuery = `
      SELECT COUNT(DISTINCT d.document_id) as total
      FROM bookmarks b
      JOIN documents d ON b.document_id = d.document_id
      JOIN users u ON d.author_id = u.user_id
      WHERE ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        items: result.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          description: row.description,
          fileName: row.file_name,
          fileType: row.file_type,
          subject: row.subject,
          university: row.university,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          viewCount: row.view_count,
          avgRating: row.average_rating ? parseFloat(row.average_rating).toFixed(1) : '0.0',
          ratingCount: row.rating_count || 0,
          tags: row.tags || [],
          createdAt: row.created_at,
          thumbnailUrl: row.thumbnail_url,
          previewUrl: row.preview_url,
          author: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          },
          userInteraction: { isBookmarked: true, canDownload: true }
        })),
        page,
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder functions mappings
const updateDocument = async (req, res) => res.status(501).json({ error: 'Not implemented' });
const deleteDocument = async (req, res) => res.status(501).json({ error: 'Not implemented' });
const reportDocument = async (req, res) => res.status(501).json({ error: 'Not implemented' });

module.exports = {
  getDocuments,
  getDocumentById: getDocument,
  searchDocuments: getDocuments,
  getFeaturedDocuments: getDocuments,
  getRecentDocuments: getDocuments,
  getPopularDocuments: getDocuments,
  getSuggestedTags,
  previewDocument: previewController.servePreview, // Map to actual preview logic
  incrementView: getDocument, 
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  // Note: Rating/Comment functions are now handled by respective controllers and routes
  // Kept here only if routes still point here (which they shouldn't)
  rateDocument: (req, res) => res.status(301).json({error: 'Moved to ratingController'}), 
  getDocumentRatings: (req, res) => res.status(301).json({error: 'Moved to ratingController'}),
  updateRating: (req, res) => res.status(301).json({error: 'Moved to ratingController'}),
  deleteRating: (req, res) => res.status(301).json({error: 'Moved to ratingController'}),
  addComment: (req, res) => res.status(301).json({error: 'Moved to commentController'}),
  getDocumentComments: (req, res) => res.status(301).json({error: 'Moved to commentController'}),
  updateComment: (req, res) => res.status(301).json({error: 'Moved to commentController'}),
  deleteComment: (req, res) => res.status(301).json({error: 'Moved to commentController'}),
  likeComment: (req, res) => res.status(301).json({error: 'Moved to commentController'}),
  unlikeComment: (req, res) => res.status(301).json({error: 'Moved to commentController'}),
  
  bookmarkDocument,
  removeBookmark,
  getUserBookmarks,
  reportDocument,
  getDocumentAnalytics: getDocument
};