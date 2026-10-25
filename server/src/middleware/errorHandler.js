export function handleError(err, req, res, next) {
  const status = err?.status || 500;
  const code = err?.code || 'INTERNAL_ERROR';
  const message = err?.message || 'Something went wrong.';

  res.status(status).json({
    error: {
      code,
      message,
      details: err?.details ?? null,
    },
  });
}