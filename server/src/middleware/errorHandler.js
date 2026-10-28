export const errorHandler = (err, req, res, next) => {
  // Check for MySQL specific error numbers
  const errno = err.errno || err.number;

  if (errno === 1062) {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'Duplicate entry'
    });
  }

  if (errno === 1452) {
    return res.status(409).json({
      error: 'Referenced record does not exist',
      message: 'Referenced record does not exist'
    });
  }

  if (errno === 3819) {
    return res.status(400).json({
      error: 'Bad Request: Check constraint violated',
      message: err.sqlMessage || err.message
    });
  }

  if (errno === 1644 || err.sqlState === '45000') {
    return res.status(400).json({
      error: err.sqlMessage || err.message
    });
  }

  // Handle explicit HTTP status errors (e.g. 404, 400, 401)
  if (err.status || err.statusCode) {
    const status = err.status || err.statusCode;
    return res.status(status).json({
      error: err.message || 'Error occurred'
    });
  }

  // Log unhandled server error for debugging
  console.error('Unhandled Server Error:', err);

  // Everything else -> 500 with generic message
  return res.status(500).json({
    error: 'Internal Server Error'
  });
};
