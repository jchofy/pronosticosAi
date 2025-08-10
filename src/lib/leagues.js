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
  // No explicit schema provided for standings; return empty to show placeholder
  return [];
}; 