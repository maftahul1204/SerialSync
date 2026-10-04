function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const message =
      err.keyPattern && err.keyPattern.name
        ? 'A chamber with this name already exists'
        : 'Duplicate key error';
    return res.status(409).json({ success: false, message });
  }

  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}

module.exports = { errorHandler };
