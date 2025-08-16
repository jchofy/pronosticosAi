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

export const eventJsonLd = (match, siteUrl) => {
  const name = `${match.home_team_name || match.home_team} vs ${match.away_team_name || match.away_team}`;
  const startDate = toISO(match.date);
  const locationName = match.stadium || 'Estadio';
  const capacity = match.stadium_capacity || match.capacity || null;
  const canonical = `${siteUrl.replace(/\/$/, '')}/partido/${match.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name,
    sport: 'Soccer',
    startDate,
    url: canonical,
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
  const title = `Pronósticos de fútbol: ${home} vs ${away}${jornada} – ${league} (${dateEs})`;
  const dash = '–';
  const teamsStr = `${home}${dash}${away}`;
  // Ej.: "Liverpool–Bournemouth Premier League 2025/26: pronóstico con IA centrado en valor esperado. Probabilidades ajustadas, fair odds y análisis de riesgo."
  const description = `Pronósticos de partidos de fútbol: ${teamsStr} ${league} – análisis con IA, cuotas y valor esperado. Picks con fair odds y gestión de riesgo.`;
  const canonical = `${siteUrl.replace(/\/$/, '')}/partido/${match.slug}`;
  const jsonLd = eventJsonLd(match, siteUrl);
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
      { '@type': 'Question', name: '¿A qué hora se juega el partido?', acceptedAnswer: { '@type': 'Answer', text: `El partido ${home} vs ${away} se juega el ${dateStr}.` } },
      { '@type': 'Question', name: '¿Dónde se puede ver el partido?', acceptedAnswer: { '@type': 'Answer', text: `El partido se jugará en ${match.stadium || 'el estadio del equipo local'}. Para ver el partido en televisión, consulta la programación de las cadenas que emiten ${league}.` } },
      { '@type': 'Question', name: '¿Qué cuota tiene más valor?', acceptedAnswer: { '@type': 'Answer', text: 'Nuestro análisis identifica las cuotas con mejor valor esperado comparando precios de mercado con probabilidades justas calculadas por nuestro modelo de IA.' } },
      { '@type': 'Question', name: '¿Cuál es el pick recomendado y stake?', acceptedAnswer: { '@type': 'Answer', text: 'El pick recomendado se muestra en la sección de pronóstico, junto con la gestión de stake sugerida basada en el valor esperado y el riesgo.' } },
    ],
  };
  return { title, description, canonical, jsonLd, og, paywallJsonLd, breadcrumbsJsonLd, faqJsonLd };
}; 