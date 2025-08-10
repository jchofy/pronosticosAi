# PronosticosAI – Astro SSR

Proyecto Astro SSR (Node standalone) que renderiza partidos desde MySQL, con SEO automático (OG/Twitter + JSON-LD SportsEvent) y Tailwind CSS.

## Requisitos
- Node 18+
- MySQL accesible

## Instalación
```bash
npm i
# Si no está añadido automáticamente:
# npx astro add tailwind --yes
cp .env.example .env
# Rellena las credenciales de DB y SITE_URL
```

## Desarrollo
```bash
npm run dev
```

## Producción (Node adapter standalone)
```bash
npm run build
npm run start
```
Puedes usar PM2/Docker para orquestación.

## Estructura
- `src/lib` consultas MySQL y SEO helpers
- `src/layouts/Base.astro` layout global + meta
- `src/pages` rutas SSR: home, liga, clasificación, resultados, partido, sitemap.xml, robots.txt y 404

## Notas
- Todo SSR (sin SSG). Si falla la DB, se responde 503 con mensaje simple.
- Noindex automático para páginas de partido con más de 7 días.
- Tailwind CSS para todo el estilo (utilidades, responsive). 