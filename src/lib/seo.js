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

const toEsShortDate = (value) => {
  try {
    const d = new Date(value);
    // e.g., "11 ago 2025"
    // Ensure lowercase month and remove trailing dot if present
    const parts = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return String(parts).replace(/\.$/, '');
  } catch { return ''; }
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
  const dateEs = toEsShortDate(match.date);
  const league = match.league_name;
  const home = match.home_team_name || match.home_team;
  const away = match.away_team_name || match.away_team;
  const jornada = match.matchday ? ` (J${match.matchday})` : '';
  const title = `${home} vs ${away}${jornada}: Pronóstico con IA  - ${dateEs}`;
  const dash = '–';
  const teamsStr = `${home}${dash}${away}`;
  // Ej.: "Liverpool–Bournemouth Premier League 2025/26: pronóstico con IA centrado en valor esperado. Probabilidades ajustadas, fair odds y análisis de riesgo."
  const description = `${teamsStr} ${league}: pronóstico con IA centrado en valor esperado. Probabilidades ajustadas, fair odds y análisis de riesgo.`;
  const canonical = `${siteUrl.replace(/\/$/, '')}/partido/${match.slug}`;
  const jsonLd = eventJsonLd(match);
  const ogImage = `${siteUrl.replace(/\/$/, '')}/og/partido/${match.slug}.png`;
  const og = {
    title,
    description,
    type: 'article',
    url: canonical,
    image: ogImage,
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
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl.replace(/\/$/, '') + '/' },
      { '@type': 'ListItem', position: 2, name: 'Ligas', item: siteUrl.replace(/\/$/, '') + '/ligas' },
      { '@type': 'ListItem', position: 3, name: league, item: siteUrl.replace(/\/$/, '') + `/liga/${match.league_slug}` },
      { '@type': 'ListItem', position: 4, name: `${home} vs ${away}`, item: canonical },
    ],
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '¿A qué hora se juega?', acceptedAnswer: { '@type': 'Answer', text: dateStr } },
      { '@type': 'Question', name: '¿Dónde se juega?', acceptedAnswer: { '@type': 'Answer', text: `${match.stadium || 'N/D'}` } },
      { '@type': 'Question', name: '¿Cuál es el pronóstico?', acceptedAnswer: { '@type': 'Answer', text: 'El contenido del pronóstico es de pago; disponible con 1 acceso gratis al día o suscripción.' } },
    ],
  };
  return { title, description, canonical, jsonLd, og, paywallJsonLd, breadcrumbsJsonLd, faqJsonLd };
}; 