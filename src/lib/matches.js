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
    WHERE m.date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? HOUR)
    ORDER BY m.date ASC;
  `;
  return query(sql, [Number(hours) || 72]);
};

export const getUpcomingMatchesByLeague = async (leagueSlug, hours = 168) => {
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
      AND m.date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? HOUR)
    ORDER BY m.date ASC;
  `;
  return query(sql, [leagueSlug, Number(hours) || 168]);
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
    WHERE m.date BETWEEN DATE_SUB(NOW(), INTERVAL ? DAY) AND NOW()
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
      AND m.date BETWEEN DATE_SUB(NOW(), INTERVAL ? DAY) AND NOW()
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
      ht.stadium_name AS stadium, ht.capacity AS stadium_capacity, ht.president AS home_president,
      at.name AS away_team_name, at.logo_file AS away_logo, at.president AS away_president
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