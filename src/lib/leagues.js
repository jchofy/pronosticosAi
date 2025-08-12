import { query } from './db.js';

export const getLeagues = async () => {
  const sql = 'SELECT id, scrapper_slug AS slug, name, country, logo_file AS league_logo FROM leagues ORDER BY country, name';
  return query(sql);
};

export const getLeagueBySlug = async (slug) => {
  const sql = 'SELECT id, scrapper_slug AS slug, name, country, logo_file AS league_logo FROM leagues WHERE scrapper_slug = ? LIMIT 1';
  const rows = await query(sql, [slug]);
  return rows[0] || null;
};

export const getLeagueTable = async (slug) => {
  const sql = `
    SELECT
      ls.season,
      ls.position,
      ls.points,
      ls.played,
      ls.wins AS won,
      ls.draws AS drawn,
      ls.losses AS lost,
      ls.goals_for,
      ls.goals_against,
      (ls.goals_for - ls.goals_against) AS goal_diff,
      COALESCE(NULLIF(t.short_name, ''), t.name) AS team_name,
      t.logo_file AS team_logo,
      l.scrapper_slug AS league_slug
    FROM league_standings ls
    INNER JOIN teams t ON ls.team_id = t.id
    INNER JOIN leagues l ON l.id = ls.league_id
    WHERE l.scrapper_slug = ?
      AND ls.season = (
        SELECT MAX(ls2.season)
        FROM league_standings ls2
        WHERE ls2.league_id = l.id
      )
    ORDER BY ls.position ASC
  `;
  return query(sql, [slug]);
}; 