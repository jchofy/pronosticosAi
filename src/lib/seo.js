const toISO = (value) => {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch { return null; }
};

const toDDMMYYYY = (value) => {
  try {
    const d = new Date(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return '' }
};

export const eventJsonLd = (match) => {
  const name = `${match.home_team_name || match.home_team} vs ${match.away_team_name || match.away_team}`;
  const startDate = toISO(match.date);
  const locationName = match.stadium || 'Estadio';
  const capacity = match.stadium_capacity || match.capacity || null;
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name,
    startDate,
    eventStatus: new Date(match.date) < new Date() ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: locationName,
      ...(capacity ? { maximumAttendeeCapacity: Number(capacity) } : {}),
    },
    homeTeam: {
      '@type': 'SportsTeam',
      name: match.home_team_name || match.home_team,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: match.away_team_name || match.away_team,
    },
  };
};

export const metaBasic = (title, description, canonical) => ({ title, description, canonical });

export const pageMetaForMatch = (match, siteUrl) => {
  const dateStr = toDDMMYYYY(match.date);
  const title = `${match.home_team_name || match.home_team} vs ${match.away_team_name || match.away_team} | ${match.league_name} – ${dateStr}`;
  const description = `Previa, datos y pronóstico de ${match.league_name} (${match.league_country}). Estadio: ${match.stadium || 'N/D'}${match.stadium_capacity ? `, aforo ${Number(match.stadium_capacity).toLocaleString('es-ES')}` : ''}. Fecha: ${dateStr}.`;
  const canonical = `${siteUrl.replace(/\/$/, '')}/partido/${match.slug}`;
  const jsonLd = eventJsonLd(match);
  const og = {
    title,
    description,
    type: 'article',
    url: canonical,
  };
  // Extra: paywalled content marker (to be merged at page level)
  const paywallJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Pronóstico del partido',
    isAccessibleForFree: 'false',
    hasPart: {
      '@type': 'WebPageElement',
      isAccessibleForFree: 'false',
      cssSelector: '.paywall'
    }
  };
  return { title, description, canonical, jsonLd, og, paywallJsonLd };
}; 