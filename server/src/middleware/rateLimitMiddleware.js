import rateLimit from 'express-rate-limit';

const isTest = () => process.env.NODE_ENV === 'test';

/**
 * General rate limiter for auth endpoints (~10 requests per 15 minutes per IP).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  skip: () => isTest()
});

/**
 * Rate limiter for real-time username & email availability checks.
 * Generous limits so interactive typing validation never blocks normal users.
 */
export const availabilityRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many availability checks, please try again shortly.'
  },
  skip: () => isTest()
});

/**
 * Rate limiter for login endpoint (~10 requests per 15 minutes per IP).
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes.'
  },
  skip: () => isTest()
});

export default {
  authRateLimiter,
  availabilityRateLimiter,
  loginRateLimiter
};
