import { query } from '../../lib/db.js';
import { getOrCreateSubject } from '../../lib/subject.js';
import { getSession } from 'auth-astro/server';
import { getUserIdFromEmail } from '../../lib/access.js';

export async function POST({ request, cookies, clientAddress }) {
  try {
    const { accepted } = await request.json();
    
    if (typeof accepted !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Invalid cookie consent value' }), {
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
        'UPDATE subjects SET cookies_accepted = ?, cookies_accepted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [accepted, subjectId]
      )
    );

    // If user is authenticated, also update user table
    if (userId) {
      updates.push(
        query(
          'UPDATE users SET cookies_accepted = ?, cookies_accepted_at = CURRENT_TIMESTAMP WHERE id = ?',
          [accepted, userId]
        )
      );
    }

    await Promise.all(updates);

    return new Response(JSON.stringify({ 
      success: true, 
      accepted,
      subjectId,
      userId: userId || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error saving cookie consent:', error);
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

    let accepted = null;
    let acceptedAt = null;
    let source = null;

    // Priority 1: Check user consent (if authenticated)
    if (userId) {
      const userRows = await query(
        'SELECT cookies_accepted, cookies_accepted_at FROM users WHERE id = ?',
        [userId]
      );
      
      if (userRows.length && userRows[0].cookies_accepted !== null) {
        accepted = userRows[0].cookies_accepted;
        acceptedAt = userRows[0].cookies_accepted_at;
        source = 'user';
        
        // Sync to subject if not already synced
        if (accepted !== null) {
          await query(
            'UPDATE subjects SET cookies_accepted = ?, cookies_accepted_at = ? WHERE id = ? AND cookies_accepted IS NULL',
            [accepted, acceptedAt, subjectId]
          );
        }
      }
    }

    // Priority 2: Check subject consent (if no user consent found)
    if (accepted === null) {
      const subjectRows = await query(
        'SELECT cookies_accepted, cookies_accepted_at FROM subjects WHERE id = ?',
        [subjectId]
      );
      
      if (subjectRows.length && subjectRows[0].cookies_accepted !== null) {
        accepted = subjectRows[0].cookies_accepted;
        acceptedAt = subjectRows[0].cookies_accepted_at;
        source = 'subject';
        
        // Sync to user if authenticated and not already synced
        if (userId && accepted !== null) {
          await query(
            'UPDATE users SET cookies_accepted = ?, cookies_accepted_at = ? WHERE id = ? AND cookies_accepted IS NULL',
            [accepted, acceptedAt, userId]
          );
        }
      }
    }

    return new Response(JSON.stringify({ 
      accepted,
      acceptedAt,
      source,
      subjectId,
      userId: userId || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking cookie consent:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
