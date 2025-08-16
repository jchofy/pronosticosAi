import bcrypt from 'bcrypt';
import { query } from '../../../lib/db.js';
import { logUserRegistration, logError } from '../../../lib/telegram-logger.js';
import { trackApiCall, extractRequestInfo } from '../../../lib/activity-tracker.js';

/**
 * POST /api/auth/register
 * Body: { email, password, name }
 * Creates a new user account with email/password
 */
export async function POST({ request, clientAddress }) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);
  
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Basic validation
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400 });
    }

    // Enhanced password validation
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'password_too_short' }), { status: 400 });
    }
    
    if (!/[A-Z]/.test(password)) {
      return new Response(JSON.stringify({ error: 'password_missing_uppercase' }), { status: 400 });
    }
    
    if (!/[a-z]/.test(password)) {
      return new Response(JSON.stringify({ error: 'password_missing_lowercase' }), { status: 400 });
    }
    
    if (!/\d/.test(password)) {
      return new Response(JSON.stringify({ error: 'password_missing_number' }), { status: 400 });
    }

    if (name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'name_too_short' }), { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400 });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existingUser.length > 0) {
      return new Response(JSON.stringify({ error: 'email_already_exists' }), { status: 400 });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await query(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
      [email, name, passwordHash]
    );

    const userId = result.insertId;

    // Log successful registration
    await logUserRegistration({
      userId: String(userId),
      email,
      method: 'email',
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip
    });

    // Track API call
    await trackApiCall({ request }, '/api/auth/register', 'POST', 201, startTime);

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: userId, email, name } 
    }), { status: 201 });

  } catch (e) {
    console.error('Registration error:', e);
    
    // Log error
    await logError({
      error: e.message,
      stack: e.stack,
      page: '/api/auth/register',
      url: requestInfo.url,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip
    });

    // Track failed API call
    await trackApiCall({ request }, '/api/auth/register', 'POST', 500, startTime);
    
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
}
