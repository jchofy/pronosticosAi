import { logPageVisit, logButtonClick, logError, logApiCall } from './telegram-logger.js';

/**
 * Activity Tracker - Client-side and Server-side activity tracking utilities
 */

/**
 * Extract request information for logging
 * @param {Request} request - Astro request object
 * @returns {Object} - Request info
 */
export const extractRequestInfo = (request) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip') || 
             'unknown';

  return {
    url: url.href,
    pathname: url.pathname,
    userAgent,
    ip: ip.split(',')[0].trim(), // Take first IP if multiple
    referrer: request.headers.get('referer') || undefined
  };
};

/**
 * Get user ID from session (Astro context)
 * @param {Object} Astro - Astro global object
 * @returns {string|null} - User ID
 */
export const getUserId = (Astro) => {
  try {
    const session = Astro.locals.session;
    return session?.user?.id || null;
  } catch (error) {
    return null;
  }
};

/**
 * Track page visit - Server-side
 * @param {Object} Astro - Astro global object
 * @param {string} pageName - Optional page name
 */
export const trackPageVisit = async (Astro, pageName = null) => {
  try {
    const requestInfo = extractRequestInfo(Astro.request);
    const userId = getUserId(Astro);
    
    await logPageVisit({
      page: pageName || requestInfo.pathname,
      url: requestInfo.url,
      userId,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip,
      referrer: requestInfo.referrer
    });
  } catch (error) {
    console.error('Error tracking page visit:', error);
  }
};

/**
 * Track API call - Server-side
 * @param {Object} context - API context
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {number} statusCode - Response status code
 * @param {number} startTime - Request start time
 */
export const trackApiCall = async (context, endpoint, method, statusCode, startTime = Date.now()) => {
  try {
    const requestInfo = extractRequestInfo(context.request);
    const userId = getUserId(context);
    const responseTime = Date.now() - startTime;
    
    await logApiCall({
      endpoint,
      method,
      statusCode,
      userId,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip,
      responseTime
    });
  } catch (error) {
    console.error('Error tracking API call:', error);
  }
};

/**
 * Track error - Server-side
 * @param {Object} Astro - Astro global object
 * @param {Error} error - Error object
 * @param {string} context - Error context
 */
export const trackError = async (Astro, error, context = 'unknown') => {
  try {
    const requestInfo = extractRequestInfo(Astro.request);
    const userId = getUserId(Astro);
    
    await logError({
      error: error.message,
      stack: error.stack,
      page: context,
      url: requestInfo.url,
      userId,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip
    });
  } catch (trackingError) {
    console.error('Error tracking error:', trackingError);
  }
};

/**
 * Client-side activity tracking utilities
 * These functions should be called from the browser
 */

/**
 * Initialize client-side tracking
 * @param {string} userId - Current user ID (if logged in)
 * @deprecated This function is deprecated - tracking is now handled in Base.astro
 */
export const initClientTracking = (userId = null) => {
  // This function is now deprecated
  // All tracking is handled in Base.astro to prevent duplicates
  console.warn('initClientTracking is deprecated - tracking handled in Base.astro');
  return;
};

/**
 * Track client-side button click
 * @param {Event} event - Click event
 * @param {string} userId - User ID
 * @deprecated This function is deprecated - tracking is now handled in Base.astro
 */
const trackClientClick = async (event, userId) => {
  // Deprecated - tracking handled in Base.astro
  return;
};

/**
 * Track client-side form submission
 * @param {Event} event - Submit event
 * @param {string} userId - User ID
 * @deprecated This function is deprecated - tracking is now handled in Base.astro
 */
const trackClientFormSubmission = async (event, userId) => {
  // Deprecated - tracking handled in Base.astro
  return;
};

/**
 * Track client-side page exit
 * @param {string} userId - User ID
 * @deprecated This function is deprecated - tracking is now handled in Base.astro
 */
const trackClientPageExit = async (userId) => {
  // Deprecated - tracking handled in Base.astro
  return;
};

/**
 * Get element information for tracking
 * @param {Element} element - DOM element
 * @returns {string} - Element description
 */
const getElementInfo = (element) => {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
  const text = element.textContent?.trim().substring(0, 50) || '';
  const href = element.href || '';
  
  let info = tag + id + classes;
  if (text) info += ` "${text}"`;
  if (href) info += ` -> ${href}`;
  
  return info;
};

/**
 * Manual client-side tracking function
 * @param {string} type - Activity type
 * @param {Object} data - Activity data
 */
export const trackClientActivity = async (type, data = {}) => {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/track-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        page: window.location.pathname,
        url: window.location.href,
        ...data
      })
    });
  } catch (error) {
    console.error('Error tracking client activity:', error);
  }
};
