/**
 * File upload middleware using multer
 * Handles document uploads with validation
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directories exist
const documentsDir = path.join(__dirname, '../../uploads/documents');
const avatarDir = path.join(__dirname, '../../uploads/avatars');

if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
  console.log('✅ Created documents upload directory:', documentsDir);
}

if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
  console.log('✅ Created avatar upload directory:', avatarDir);
}

// Configure storage - save directly to permanent documents folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Upload directly to documents folder (no temp folder needed)
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and UUID
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || 
    ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Loại file .${fileExtension} không được hỗ trợ. Chỉ chấp nhận: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only one file per upload
  },
  fileFilter: fileFilter
});

// Middleware for single file upload
const uploadDocument = upload.single('document');

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File quá lớn. Kích thước tối đa cho phép là 10MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Chỉ được phép tải lên 1 file'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Field name không đúng. Vui lòng sử dụng field "document"'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Lỗi tải file: ' + err.message
        });
    }
  }

  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Lỗi tải file'
    });
  }

  next();
};

// Avatar upload for user profiles (smaller size limit)
const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `avatar-${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for avatars
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Chỉ chấp nhận file ảnh: ${allowedTypes.join(', ')}`), false);
    }
  }
}).single('avatar');

module.exports = {
  uploadDocument,
  uploadAvatar,
  handleUploadError
};