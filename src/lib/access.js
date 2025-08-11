import { query } from './db.js';

export const findActiveSubscription = async (subjectId) => {
  const rows = await query(`
    SELECT s.id AS subscription_id, s.status, s.current_period_end,
           p.id AS plan_id, p.code, p.interval, p.quota_per_day
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.subject_id = ? AND s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
    ORDER BY s.current_period_end DESC
    LIMIT 1
  `, [subjectId]);
  return rows[0] || null;
};

export const hasMatchPurchase = async (subjectId, matchId) => {
  const rows = await query(`SELECT id FROM purchases WHERE subject_id = ? AND match_id = ? AND status = 'paid' LIMIT 1`, [subjectId, matchId]);
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


