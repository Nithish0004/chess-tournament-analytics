export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.errors;
      const message = issues.map((e) => `${e.path.join('.') || 'body'}: ${e.message}`).join(', ');
      return res.status(400).json({
        error: 'Validation Error',
        message,
        details: issues
      });
    }
    req.body = result.data;
    next();
  };
};
