export function validateRequest(schema, target = 'body') {
  return (req, res, next) => {
    const payload = req[target];
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => issue.message)
        .join('; ');

      return next({ status: 400, code: 'VALIDATION_ERROR', message: issues || 'Invalid request data.', details: null });
    }

    req[target] = parsed.data;
    return next();
  };
}