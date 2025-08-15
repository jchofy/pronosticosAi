import { query } from './db.js';

const pageClamp = (page) => Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
const clampSize = (size) => Math.min(100, Math.max(1, Number(size) || 50));

export const getUpcomingMatches = async (hours = 72) => {
  const sql = `
    SELECT m.slug, m.date, m.matchday,
           l.scrapper_slug AS league_slug, l.name AS league_name, l.country AS league_country,
           l.logo_file AS league_logo,
            ht.name AS home_team, at.name AS away_team,
            ht.logo_file AS home_logo, at.logo_file AS away_logo,
           ht.stadium_name AS stadium, ht.capacity AS capacity
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN leagues l ON m.league_id = l.id
    WHERE m.prediccion = '1'
      AND CONVERT_TZ(m.date, 'UTC', 'Europe/Madrid')
          BETWEEN CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Europe/Madrid')
              AND DATE_ADD(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Europe/Madrid'), INTERVAL ? HOUR)
    ORDER BY m.date ASC;
  `;
  return query(sql, [Number(hours) || 72]);
};

export const getUpcomingMatchesByLeague = async (leagueSlug) => {
  // Mostrar solo partidos con predicción activa (prediccion = '1') y cuya fecha en horario de Madrid sea >= (ahora_ES - 30 minutos)
  const sql = `
    SELECT m.slug, m.date, m.matchday,
           l.scrapper_slug AS league_slug, l.name AS league_name, l.country AS league_country,
           l.logo_file AS league_logo,
           ht.name AS home_team, at.name AS away_team,
           ht.logo_file AS home_logo, at.logo_file AS away_logo,
           ht.stadium_name AS stadium, ht.capacity AS capacity
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN leagues l ON m.league_id = l.id
    WHERE l.scrapper_slug = ?
      AND m.prediccion = '1'
      AND CONVERT_TZ(m.date, 'UTC', 'Europe/Madrid') >= DATE_SUB(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Europe/Madrid'), INTERVAL 30 MINUTE)
    ORDER BY m.date ASC;
  `;
  return query(sql, [leagueSlug]);
};

export const getUpcomingPredictedMatches = async () => {
  // Partidos de todas las ligas con predicción activa y fecha en horario de Madrid >= ahora - 30 min
  const sql = `
    SELECT m.slug, m.date, m.matchday,
           l.scrapper_slug AS league_slug, l.name AS league_name, l.country AS league_country,
           l.logo_file AS league_logo,
           ht.name AS home_team, at.name AS away_team,
           ht.logo_file AS home_logo, at.logo_file AS away_logo,
           ht.stadium_name AS stadium, ht.capacity AS capacity
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN leagues l ON m.league_id = l.id
    WHERE m.prediccion = '1'
      AND CONVERT_TZ(m.date, 'UTC', 'Europe/Madrid') >= DATE_SUB(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Europe/Madrid'), INTERVAL 30 MINUTE)
    ORDER BY m.date ASC;
  `;
  return query(sql);
};

export const getRecentMatches = async (days = 30, page = 1, pageSize = 50) => {
  const safePage = pageClamp(page);
  const safeSize = clampSize(pageSize);
  const offset = (safePage - 1) * safeSize;
  const sql = `
    SELECT m.slug, m.date, m.matchday,
           l.scrapper_slug AS league_slug, l.name AS league_name, l.country AS league_country,
           ht.name AS home_team, at.name AS away_team
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN leagues l ON m.league_id = l.id
    WHERE CONVERT_TZ(m.date, 'UTC', 'Europe/Madrid')
          BETWEEN DATE_SUB(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Europe/Madrid'), INTERVAL ? DAY)
              AND CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Europe/Madrid')
    ORDER BY m.date DESC
    LIMIT ? OFFSET ?;
  `;
  const rows = await query(sql, [Number(days) || 30, safeSize, offset]);
  const hasNext = rows.length === safeSize; // heuristic without COUNT(*)
  return { rows, page: safePage, pageSize: safeSize, hasNext };
};

export const getRecentMatchesByLeague = async (leagueSlug, days = 30, page = 1, pageSize = 50) => {
  const safePage = pageClamp(page);
  const safeSize = clampSize(pageSize);
  const offset = (safePage - 1) * safeSize;
  const sql = `
    SELECT m.slug, m.date, m.matchday,
           l.scrapper_slug AS league_slug, l.name AS league_name, l.country AS league_country,
           ht.name AS home_team, at.name AS away_team
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN leagues l ON m.league_id = l.id
    WHERE l.scrapper_slug = ?
      AND CONVERT_TZ(m.date, 'UTC', 'Europe/Madrid')
          BETWEEN DATE_SUB(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Europe/Madrid'), INTERVAL ? DAY)
              AND CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'Europe/Madrid')
    ORDER BY m.date DESC
    LIMIT ? OFFSET ?;
  `;
  const rows = await query(sql, [leagueSlug, Number(days) || 30, safeSize, offset]);
  const hasNext = rows.length === safeSize;
  return { rows, page: safePage, pageSize: safeSize, hasNext };
};

export const getMatchBySlug = async (slug) => {
  const sql = `
    SELECT 
      m.*, l.scrapper_slug AS league_slug, l.name AS league_name, l.country AS league_country,
      l.logo_file AS league_logo,
      ht.name AS home_team_name, ht.logo_file AS home_logo,
      ht.stadium_name AS stadium, ht.capacity AS stadium_capacity, ht.president AS home_president, ht.coach AS home_coach,
      at.name AS away_team_name, at.logo_file AS away_logo, at.president AS away_president, at.coach AS away_coach
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN leagues l ON m.league_id = l.id
    WHERE m.slug = ?
    LIMIT 1;
  `;
  const rows = await query(sql, [slug]);
  return rows[0] || null;
};

export const getPredictionForMatch = async (matchId) => {
  try {
    const preds = await query(
      'SELECT id, prediction_text, generated_at FROM predictions WHERE match_id = ? ORDER BY generated_at DESC LIMIT 1',
      [matchId]
    );
    if (!preds.length) return null;
    const pred = preds[0];
    const bets = await query(
      'SELECT bet_type, selection, odds FROM bets WHERE prediction_id = ? ORDER BY id ASC',
      [pred.id]
    );
    const normalizedBets = (bets || []).map((b) => ({
      ...b,
      // Ensure odds is a number for rendering/formatting
      odds: b?.odds != null && b?.odds !== '' ? Number(b.odds) : null,
    }));
    return {
      text: pred.prediction_text || null,
      generatedAt: pred.generated_at,
      bets: normalizedBets,
    };
  } catch {
    return null;
  }
}; 