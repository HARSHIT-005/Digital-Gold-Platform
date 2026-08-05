export const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Error:', err.stack || err.message);
  }
  const status = err.status || 500
  const body = {
    success: false,
    message: err.message || 'Internal Server Error',
  }
  if (process.env.NODE_ENV === 'development') {
    body.stack = err.stack
  }
  res.status(status).json(body)
};
