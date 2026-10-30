import rateLimit from 'express-rate-limit';

const isTest = () => process.env.NODE_ENV === 'test';

/**
 * General rate limiter for auth endpoints (~10 requests per 15 minutes per IP).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  skip: () => isTest()
});

/**
 * Rate limiter for login endpoint (~5-10 requests per 15 minutes per IP).
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  skip: () => isTest()
});

export default {
  authRateLimiter,
  loginRateLimiter
};
