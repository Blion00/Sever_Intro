const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors?.map(e => e.message).join(', ') || 'Validation error';
    error = { message, statusCode: 400 };
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = err.errors?.map(e => e.message).join(', ') || 'Duplicate value';
    error = { message, statusCode: 409 };
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Invalid reference';
    error = { message, statusCode: 400 };
  }
  if (err.name === 'SequelizeDatabaseError') {
    const message = 'Database error';
    error = { message, statusCode: 500 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
