/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 */

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error to console
  console.error('❌ Error:', err.stack);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Không tìm thấy tài nguyên';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Dữ liệu đã tồn tại';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error = { 
          message: 'Dữ liệu đã tồn tại trong hệ thống', 
          statusCode: 409 
        };
        break;
      case '23503': // Foreign key violation
        error = { 
          message: 'Không thể thực hiện thao tác do ràng buộc dữ liệu', 
          statusCode: 400 
        };
        break;
      case '23502': // Not null violation
        error = { 
          message: 'Thiếu thông tin bắt buộc', 
          statusCode: 400 
        };
        break;
      case '42P01': // Undefined table
        error = { 
          message: 'Lỗi hệ thống: Bảng dữ liệu không tồn tại', 
          statusCode: 500 
        };
        break;
      default:
        error = { 
          message: 'Lỗi cơ sở dữ liệu', 
          statusCode: 500 
        };
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Token không hợp lệ', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token đã hết hạn', statusCode: 401 };
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = { message: 'File quá lớn, vui lòng chọn file nhỏ hơn', statusCode: 400 };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = { message: 'Quá nhiều file được tải lên', statusCode: 400 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = { message: 'Loại file không được hỗ trợ', statusCode: 400 };
  }

  // Rate limit errors
  if (err.status === 429) {
    error = { message: 'Quá nhiều requests, vui lòng thử lại sau', statusCode: 429 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Lỗi server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;