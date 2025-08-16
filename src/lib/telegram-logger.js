import { URL_N8N_TELEGRAM } from './env.js';

/**
 * Telegram Logger Service
 * Sends activity logs to Telegram via N8N webhook
 */

export const ActivityType = {
  PAGE_VISIT: 'page_visit',
  BUTTON_CLICK: 'button_click',
  USER_REGISTRATION: 'user_registration',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PREDICTION_ACCESS: 'prediction_access',
  PAYMENT_ATTEMPT: 'payment_attempt',
  PAYMENT_SUCCESS: 'payment_success',
  SUBSCRIPTION_START: 'subscription_start',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  AGE_VERIFICATION: 'age_verification',
  COOKIE_CONSENT: 'cookie_consent',
  ERROR: 'error',
  API_CALL: 'api_call'
};

/**
 * Escape special characters for Telegram
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
const escapeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\*/g, '')  // Remove asterisks that could cause markdown issues
    .replace(/_/g, '')   // Remove underscores that could cause markdown issues
    .replace(/`/g, '');  // Remove backticks that could cause markdown issues
};

/**
 * Format activity data into a readable message
 * @param {Object} activity - Activity data
 * @returns {string} - Formatted message
 */
const formatMessage = (activity) => {
  const timestamp = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const emoji = getActivityEmoji(activity.type);
  const userInfo = activity.userId ? `👤 Usuario: ${escapeText(activity.userId)}` : '👤 Usuario: Anónimo';
  
  // Usar texto plano sin formato especial para evitar errores de parsing
  let message = `${emoji} ${escapeText(activity.type.toUpperCase())}\n`;
  message += `⏰ ${timestamp}\n`;
  message += `${userInfo}\n`;

  if (activity.page) {
    message += `📄 Página: ${escapeText(activity.page)}\n`;
  }

  if (activity.url) {
    message += `🔗 URL: ${escapeText(activity.url)}\n`;
  }

  if (activity.userAgent) {
    const device = getUserDevice(activity.userAgent);
    message += `📱 Dispositivo: ${escapeText(device)}\n`;
  }

  if (activity.ip) {
    message += `🌐 IP: ${escapeText(activity.ip)}\n`;
  }

  if (activity.details) {
    message += `📋 Detalles: ${escapeText(activity.details)}\n`;
  }

  if (activity.element) {
    message += `🎯 Elemento: ${escapeText(activity.element)}\n`;
  }

  if (activity.error) {
    message += `❌ Error: ${escapeText(activity.error)}\n`;
  }

  if (activity.amount) {
    message += `💰 Cantidad: €${escapeText(activity.amount)}\n`;
  }

  if (activity.plan) {
    message += `📦 Plan: ${escapeText(activity.plan)}\n`;
  }

  if (activity.matchId) {
    message += `⚽ Partido ID: ${escapeText(activity.matchId)}\n`;
  }

  if (activity.method) {
    message += `🔐 Método: ${escapeText(activity.method)}\n`;
  }

  if (activity.email) {
    message += `✉️ Email: ${escapeText(activity.email)}\n`;
  }

  return message.trim(); // Remover salto de línea final
};

/**
 * Get emoji for activity type
 * @param {string} type - Activity type
 * @returns {string} - Emoji
 */
const getActivityEmoji = (type) => {
  const emojiMap = {
    [ActivityType.PAGE_VISIT]: '👁️',
    [ActivityType.BUTTON_CLICK]: '🖱️',
    [ActivityType.USER_REGISTRATION]: '📝',
    [ActivityType.USER_LOGIN]: '🔑',
    [ActivityType.USER_LOGOUT]: '🚪',
    [ActivityType.PREDICTION_ACCESS]: '🔮',
    [ActivityType.PAYMENT_ATTEMPT]: '💳',
    [ActivityType.PAYMENT_SUCCESS]: '✅',
    [ActivityType.SUBSCRIPTION_START]: '🎉',
    [ActivityType.SUBSCRIPTION_CANCEL]: '❌',
    [ActivityType.AGE_VERIFICATION]: '🔞',
    [ActivityType.COOKIE_CONSENT]: '🍪',
    [ActivityType.ERROR]: '🚨',
    [ActivityType.API_CALL]: '⚡'
  };
  
  return emojiMap[type] || '📊';
};

/**
 * Extract device info from User-Agent
 * @param {string} userAgent - User-Agent string
 * @returns {string} - Device info
 */
const getUserDevice = (userAgent) => {
  if (!userAgent) return 'Desconocido';
  
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android';
    return 'Móvil';
  }
  
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Mac/i.test(userAgent)) return 'Mac';
  if (/Linux/i.test(userAgent)) return 'Linux';
  
  return 'Escritorio';
};

/**
 * Send activity log to Telegram via N8N webhook
 * @param {Object} activity - Activity data
 * @returns {Promise<boolean>} - Success status
 */
export const logActivity = async (activity) => {
  try {
    if (!URL_N8N_TELEGRAM) {
      console.warn('URL_N8N_TELEGRAM not configured, skipping Telegram log');
      return false;
    }

    const message = formatMessage(activity);
    
    // Crear payload simplificado para N8N
    const payload = {
      text: message,
      type: activity.type,
      timestamp: new Date().toISOString(),
      user_id: activity.userId || null,
      page: activity.page || null,
      ip: activity.ip || null
    };

    console.log('📤 Sending to N8N:', {
      url: URL_N8N_TELEGRAM,
      payload: payload
    });
    
    const response = await fetch(URL_N8N_TELEGRAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('📨 N8N Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error('❌ Failed to send Telegram log:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      return false;
    }

    console.log('✅ Telegram log sent successfully');
    return true;
  } catch (error) {
    console.error('💥 Error sending Telegram log:', error);
    return false;
  }
};

/**
 * Log page visit
 * @param {Object} data - Page visit data
 */
export const logPageVisit = (data) => {
  return logActivity({
    type: ActivityType.PAGE_VISIT,
    page: data.page,
    url: data.url,
    userId: data.userId,
    userAgent: data.userAgent,
    ip: data.ip,
    referrer: data.referrer
  });
};

/**
 * Log button click
 * @param {Object} data - Button click data
 */
export const logButtonClick = (data) => {
  return logActivity({
    type: ActivityType.BUTTON_CLICK,
    element: data.element,
    page: data.page,
    url: data.url,
    userId: data.userId,
    userAgent: data.userAgent,
    ip: data.ip,
    details: data.details
  });
};

/**
 * Log user registration
 * @param {Object} data - Registration data
 */
export const logUserRegistration = (data) => {
  return logActivity({
    type: ActivityType.USER_REGISTRATION,
    userId: data.userId,
    email: data.email,
    method: data.method, // 'google' or 'email'
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log user login
 * @param {Object} data - Login data
 */
export const logUserLogin = (data) => {
  return logActivity({
    type: ActivityType.USER_LOGIN,
    userId: data.userId,
    email: data.email,
    method: data.method,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log user logout
 * @param {Object} data - Logout data
 */
export const logUserLogout = (data) => {
  return logActivity({
    type: ActivityType.USER_LOGOUT,
    userId: data.userId,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log prediction access
 * @param {Object} data - Prediction access data
 */
export const logPredictionAccess = (data) => {
  return logActivity({
    type: ActivityType.PREDICTION_ACCESS,
    userId: data.userId,
    matchId: data.matchId,
    matchName: data.matchName,
    accessType: data.accessType, // 'subscription' or 'individual'
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log payment attempt
 * @param {Object} data - Payment data
 */
export const logPaymentAttempt = (data) => {
  return logActivity({
    type: ActivityType.PAYMENT_ATTEMPT,
    userId: data.userId,
    amount: data.amount,
    currency: data.currency,
    plan: data.plan,
    matchId: data.matchId,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log successful payment
 * @param {Object} data - Payment success data
 */
export const logPaymentSuccess = (data) => {
  return logActivity({
    type: ActivityType.PAYMENT_SUCCESS,
    userId: data.userId,
    amount: data.amount,
    currency: data.currency,
    plan: data.plan,
    matchId: data.matchId,
    transactionId: data.transactionId,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log subscription start
 * @param {Object} data - Subscription data
 */
export const logSubscriptionStart = (data) => {
  return logActivity({
    type: ActivityType.SUBSCRIPTION_START,
    userId: data.userId,
    plan: data.plan,
    amount: data.amount,
    currency: data.currency,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log subscription cancellation
 * @param {Object} data - Cancellation data
 */
export const logSubscriptionCancel = (data) => {
  return logActivity({
    type: ActivityType.SUBSCRIPTION_CANCEL,
    userId: data.userId,
    plan: data.plan,
    reason: data.reason,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log age verification
 * @param {Object} data - Age verification data
 */
export const logAgeVerification = (data) => {
  return logActivity({
    type: ActivityType.AGE_VERIFICATION,
    userId: data.userId,
    verified: data.verified,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log cookie consent
 * @param {Object} data - Cookie consent data
 */
export const logCookieConsent = (data) => {
  return logActivity({
    type: ActivityType.COOKIE_CONSENT,
    userId: data.userId,
    accepted: data.accepted,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log error
 * @param {Object} data - Error data
 */
export const logError = (data) => {
  return logActivity({
    type: ActivityType.ERROR,
    error: data.error,
    stack: data.stack,
    page: data.page,
    url: data.url,
    userId: data.userId,
    userAgent: data.userAgent,
    ip: data.ip
  });
};

/**
 * Log API call
 * @param {Object} data - API call data
 */
export const logApiCall = (data) => {
  return logActivity({
    type: ActivityType.API_CALL,
    endpoint: data.endpoint,
    method: data.method,
    statusCode: data.statusCode,
    userId: data.userId,
    userAgent: data.userAgent,
    ip: data.ip,
    responseTime: data.responseTime
  });
};
