import { query } from '../../lib/db.js';
import { getOrCreateSubject } from '../../lib/subject.js';
import { getSession } from 'auth-astro/server';
import { getUserIdFromEmail } from '../../lib/access.js';

/**
 * Sincroniza la verificación de edad entre subject y user
 * Se llama cuando un usuario se loguea para transferir verificaciones previas
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

    // Get user's age verification
    const userRows = await query(
      'SELECT age_verified, age_verified_at FROM users WHERE id = ?',
      [userId]
    );

    // Get subject's age verification
    const subjectRows = await query(
      'SELECT age_verified, age_verified_at FROM subjects WHERE id = ?',
      [subjectId]
    );

    const userVerification = userRows[0] || {};
    const subjectVerification = subjectRows[0] || {};

    let syncedFrom = null;
    let verification = null;

    // Priority 1: User has verification, sync to subject
    if (userVerification.age_verified !== null && userVerification.age_verified !== undefined) {
      await query(
        'UPDATE subjects SET age_verified = ?, age_verified_at = ? WHERE id = ?',
        [userVerification.age_verified, userVerification.age_verified_at, subjectId]
      );
      syncedFrom = 'user_to_subject';
      verification = {
        verified: userVerification.age_verified,
        verifiedAt: userVerification.age_verified_at
      };
    }
    // Priority 2: Subject has verification but user doesn't, sync to user
    else if (subjectVerification.age_verified !== null && subjectVerification.age_verified !== undefined) {
      await query(
        'UPDATE users SET age_verified = ?, age_verified_at = ? WHERE id = ?',
        [subjectVerification.age_verified, subjectVerification.age_verified_at, userId]
      );
      syncedFrom = 'subject_to_user';
      verification = {
        verified: subjectVerification.age_verified,
        verifiedAt: subjectVerification.age_verified_at
      };
    }
    // No verification found anywhere
    else {
      syncedFrom = 'none';
      verification = {
        verified: null,
        verifiedAt: null
      };
    }

    return new Response(JSON.stringify({ 
      success: true,
      syncedFrom,
      verification,
      subjectId,
      userId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error syncing age verification:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
