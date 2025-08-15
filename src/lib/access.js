import { query } from './db.js';

export const findActiveSubscription = async (userId) => {
  if (!userId) return null;
  
  const rows = await query(`
    SELECT id, status, current_period_end
    FROM payments 
    WHERE user_id = ? 
      AND type = 'subscription' 
      AND status = 'active' 
      AND (current_period_end IS NULL OR current_period_end > NOW())
    ORDER BY current_period_end DESC
    LIMIT 1
  `, [userId]);
  return rows[0] || null;
};

export const hasMatchPurchase = async (userId, matchId) => {
  if (!userId || !matchId) return false;
  
  const rows = await query(`
    SELECT id 
    FROM payments 
    WHERE user_id = ? 
      AND match_id = ? 
      AND type = 'match' 
      AND status = 'active' 
    LIMIT 1
  `, [userId, matchId]);
  return rows.length > 0;
};

export const canUseDailyFree = async (subjectId, ipHash, uaHash, dateUTC) => {
  const [dfu] = await query(`SELECT count FROM daily_free_uses WHERE subject_id = ? AND date_utc = ? LIMIT 1`, [subjectId, dateUTC]);
  if (dfu && Number(dfu.count) >= 1) return false;
  // Harden: block if same IP already used today (even if UA changed)
  const ipUsed = await query(`SELECT id FROM daily_ipua_uses WHERE date_utc = ? AND ip_hash = ? LIMIT 1`, [dateUTC, ipHash]);
  return ipUsed.length === 0;
};

export const consumeDailyFree = async (subjectId, matchId, ipHash, uaHash, dateUTC) => {
  await query(`INSERT INTO daily_ipua_uses (date_utc, ip_hash, ua_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE date_utc = VALUES(date_utc)`, [dateUTC, ipHash, uaHash]);
  const lastId = Number.isFinite(matchId) ? Number(matchId) : null;
  if (lastId != null) {
    await query(`INSERT INTO daily_free_uses (subject_id, date_utc, count, last_match_id) VALUES (?, ?, 1, ?) ON DUPLICATE KEY UPDATE count = count + 1, last_match_id = VALUES(last_match_id)`, [subjectId, dateUTC, lastId]);
  } else {
    await query(`INSERT INTO daily_free_uses (subject_id, date_utc, count) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE count = count + 1`, [subjectId, dateUTC]);
  }
};

export const consumeSubscriptionDailyQuota = async (subscriptionId, subjectId, dateUTC) => {
  await query(`INSERT INTO subscription_daily_uses (subscription_id, subject_id, date_utc, used_count) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE used_count = used_count + 1`, [subscriptionId, subjectId, dateUTC]);
};

// Nueva función para obtener userId desde email
export const getUserIdFromEmail = async (email) => {
  if (!email) return null;
  const users = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  return users.length > 0 ? users[0].id : null;
};


