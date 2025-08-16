import { query } from '../../lib/db.js';
import { getOrCreateSubject } from '../../lib/subject.js';
import { getSession } from 'auth-astro/server';
import { getUserIdFromEmail } from '../../lib/access.js';

/**
 * Sincroniza el consentimiento de cookies entre subject y user
 * Se llama cuando un usuario se loguea para transferir consentimientos previos
 */
export async function POST({ request, cookies, clientAddress }) {
  try {
    // Check if user is authenticated
    const session = await getSession(request);
    const userId = session?.user?.email ? await getUserIdFromEmail(session.user.email) : null;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current subject
    const { subjectId } = await getOrCreateSubject({ 
      cookies, 
      request: { url: request.url },
      clientAddress 
    });

    // Get user's cookie consent
    const userRows = await query(
      'SELECT cookies_accepted, cookies_accepted_at FROM users WHERE id = ?',
      [userId]
    );

    // Get subject's cookie consent
    const subjectRows = await query(
      'SELECT cookies_accepted, cookies_accepted_at FROM subjects WHERE id = ?',
      [subjectId]
    );

    const userConsent = userRows[0] || {};
    const subjectConsent = subjectRows[0] || {};

    let syncedFrom = null;
    let consent = null;

    // Priority 1: User has consent, sync to subject
    if (userConsent.cookies_accepted !== null && userConsent.cookies_accepted !== undefined) {
      await query(
        'UPDATE subjects SET cookies_accepted = ?, cookies_accepted_at = ? WHERE id = ?',
        [userConsent.cookies_accepted, userConsent.cookies_accepted_at, subjectId]
      );
      syncedFrom = 'user_to_subject';
      consent = {
        accepted: userConsent.cookies_accepted,
        acceptedAt: userConsent.cookies_accepted_at
      };
    }
    // Priority 2: Subject has consent but user doesn't, sync to user
    else if (subjectConsent.cookies_accepted !== null && subjectConsent.cookies_accepted !== undefined) {
      await query(
        'UPDATE users SET cookies_accepted = ?, cookies_accepted_at = ? WHERE id = ?',
        [subjectConsent.cookies_accepted, subjectConsent.cookies_accepted_at, userId]
      );
      syncedFrom = 'subject_to_user';
      consent = {
        accepted: subjectConsent.cookies_accepted,
        acceptedAt: subjectConsent.cookies_accepted_at
      };
    }
    // No consent found anywhere
    else {
      syncedFrom = 'none';
      consent = {
        accepted: null,
        acceptedAt: null
      };
    }

    return new Response(JSON.stringify({ 
      success: true,
      syncedFrom,
      consent,
      subjectId,
      userId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error syncing cookie consent:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
