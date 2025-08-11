import { query } from './db.js';

export const getActiveBettingHouses = async () => {
  const sql = `
    SELECT id, name, website_url, affiliate_code, affiliate_url,
           contact_email, color, logo_file, active
    FROM betting_houses
    WHERE active = 1
    ORDER BY name;
  `;
  return query(sql);
};


