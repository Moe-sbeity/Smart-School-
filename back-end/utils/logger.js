/**
 * Simple Logger Utility
 * Provides consistent logging across the application
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Log levels
const LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Format log message
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message} ${metaString}`.trim();
};

// Logger object
const logger = {
  error: (message, meta = {}) => {
    console.error(formatMessage(LEVELS.ERROR, message, meta));
  },

  warn: (message, meta = {}) => {
    console.warn(formatMessage(LEVELS.WARN, message, meta));
  },

  info: (message, meta = {}) => {
    console.log(formatMessage(LEVELS.INFO, message, meta));
  },

  debug: (message, meta = {}) => {
    if (isDevelopment) {
      console.log(formatMessage(LEVELS.DEBUG, message, meta));
    }
  },

  // Log error with stack trace
  logError: (message, error, meta = {}) => {
    const errorMeta = {
      ...meta,
      errorMessage: error?.message,
      errorStack: isDevelopment ? error?.stack : undefined
    };
    console.error(formatMessage(LEVELS.ERROR, message, errorMeta));
  },

  // Log security events
  security: (message, meta = {}) => {
    console.log(formatMessage('SECURITY', message, meta));
  },

  // Log API request
  request: (req, meta = {}) => {
    const requestMeta = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...meta
    };
    console.log(formatMessage(LEVELS.INFO, 'API Request', requestMeta));
  }
};

export default logger;
