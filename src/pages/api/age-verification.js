import { query } from '../../lib/db.js';
import { getOrCreateSubject } from '../../lib/subject.js';
import { getSession } from 'auth-astro/server';
import { getUserIdFromEmail } from '../../lib/access.js';
import { logAgeVerification, logError } from '../../lib/telegram-logger.js';
import { trackApiCall, extractRequestInfo } from '../../lib/activity-tracker.js';

export async function POST({ request, cookies, clientAddress }) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);
  
  try {
    const { isOfAge } = await request.json();
    
    if (typeof isOfAge !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Invalid age verification value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is authenticated
    const session = await getSession(request);
    const userId = session?.user?.email ? await getUserIdFromEmail(session.user.email) : null;

    // Get or create subject (anonymous user tracking)
    const { subjectId } = await getOrCreateSubject({ 
      cookies, 
      request: { url: request.url },
      clientAddress 
    });

    // Save to both subject and user if authenticated
    const updates = [];
    
    // Always update subject
    updates.push(
      query(
        'UPDATE subjects SET age_verified = ?, age_verified_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isOfAge, subjectId]
      )
    );

    // If user is authenticated, also update user table
    if (userId) {
      updates.push(
        query(
          'UPDATE users SET age_verified = ?, age_verified_at = CURRENT_TIMESTAMP WHERE id = ?',
          [isOfAge, userId]
        )
      );
    }

    await Promise.all(updates);

    // Log age verification
    await logAgeVerification({
      userId: userId ? String(userId) : null,
      verified: isOfAge,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip
    });

    // Track successful API call
    await trackApiCall({ request }, '/api/age-verification', 'POST', 200, startTime);

    return new Response(JSON.stringify({ 
      success: true, 
      isOfAge,
      subjectId,
      userId: userId || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error saving age verification:', error);
    
    // Log error
    await logError({
      error: error.message,
      stack: error.stack,
      page: '/api/age-verification',
      url: requestInfo.url,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip
    });

    // Track failed API call
    await trackApiCall({ request }, '/api/age-verification', 'POST', 500, startTime);
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET({ cookies, clientAddress, request }) {
  try {
    // Check if user is authenticated
    const session = await getSession(request);
    const userId = session?.user?.email ? await getUserIdFromEmail(session.user.email) : null;

    // Get subject data
    const { subjectId } = await getOrCreateSubject({ 
      cookies, 
      request: { url: request.url },
      clientAddress 
    });

    let verified = null;
    let verifiedAt = null;
    let source = null;

    // Priority 1: Check user verification (if authenticated)
    if (userId) {
      const userRows = await query(
        'SELECT age_verified, age_verified_at FROM users WHERE id = ?',
        [userId]
      );
      
      if (userRows.length && userRows[0].age_verified !== null) {
        verified = userRows[0].age_verified;
        verifiedAt = userRows[0].age_verified_at;
        source = 'user';
        
        // Sync to subject if not already synced
        if (verified !== null) {
          await query(
            'UPDATE subjects SET age_verified = ?, age_verified_at = ? WHERE id = ? AND age_verified IS NULL',
            [verified, verifiedAt, subjectId]
          );
        }
      }
    }

    // Priority 2: Check subject verification (if no user verification found)
    if (verified === null) {
      const subjectRows = await query(
        'SELECT age_verified, age_verified_at FROM subjects WHERE id = ?',
        [subjectId]
      );
      
      if (subjectRows.length && subjectRows[0].age_verified !== null) {
        verified = subjectRows[0].age_verified;
        verifiedAt = subjectRows[0].age_verified_at;
        source = 'subject';
        
        // Sync to user if authenticated and not already synced
        if (userId && verified !== null) {
          await query(
            'UPDATE users SET age_verified = ?, age_verified_at = ? WHERE id = ? AND age_verified IS NULL',
            [verified, verifiedAt, userId]
          );
        }
      }
    }

    return new Response(JSON.stringify({ 
      verified,
      verifiedAt,
      source,
      subjectId,
      userId: userId || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking age verification:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
