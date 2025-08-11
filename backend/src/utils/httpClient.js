import axios from 'axios';
import { logger } from '../config/logger.js';

// Create a shared axios instance
export const http = axios.create({
  timeout: 30000
});

// Simple exponential backoff retry wrapper
export async function requestWithRetry(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  let attempt = 0;
  let lastError;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      // Do not retry on certain client errors
      if (status && status < 500 && status !== 429) {
        break;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      logger.warn(`HTTP request failed (attempt ${attempt + 1}/${retries + 1}): ${err.message}. Retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      attempt += 1;
    }
  }
  throw lastError;
}
