/**
 * Application Configuration
 */

// Check if we're in development mode
export const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Check if we're in production mode
export const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

/**
 * Logger utility that only logs in development mode
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

export default {
  isDevelopment,
  isProduction,
  logger,
};
