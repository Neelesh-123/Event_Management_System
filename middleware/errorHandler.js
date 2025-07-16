const config = require('../config/config');

/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: `File size cannot exceed ${config.upload.limits.fileSize / (1024 * 1024)}MB`
    });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid input data',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  // Handle mongoose duplicate key errors
  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry found'
    });
  }

  // Handle custom API errors
  if (err instanceof APIError) {
    return res.status(err.status).json({
      success: false,
      message: err.message
    });
  }

  // Handle all other errors
  const status = err.status || 500;
  const message = config.server.env === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(status).json({
    success: false,
    message
  });
};

module.exports = {
  APIError,
  errorHandler
};