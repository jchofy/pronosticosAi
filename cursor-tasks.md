# Sprint: SEO 100% — Pronósticos de partidos

> Archivo de tareas para Cursor. Marca cada casilla cuando completes la acción.  
> Meta: SEO ≥ 95, TTFB ≤ 0.8s, LCP ≤ 2.5s, indexación completa.

## 1) robots.txt
- [x] Crear `/public/robots.txt` con:
  ```
  User-agent: *
  Allow: /
  Sitemap: https://www.pronosticosia.com/sitemap.xml
  ```
- [x] Deploy y verificación en `https://www.pronosticosia.com/robots.txt` (200 OK).
- [x] En Search Console: "Probar robots.txt" sin bloqueos críticos.

## 2) Canonical consistente
- [x] Añadir `<link rel="canonical" href={Astro.url.toString()} />` en el layout global (o equivalente).
- [x] Confirmar que cada partido tiene **un** canonical, idéntico al del sitemap.
- [x] Evitar parámetros/variantes (www/no-www, trailing slash) distintos del canonical.

## 3) Minificar JavaScript
- [x] Activar minify en build (esbuild/terser) en `astro.config.ts`:
  ```ts
  import { defineConfig } from 'astro/config'
  export default defineConfig({
    vite: {
      build: { minify: 'esbuild' }
    }
  })
  ```
- [x] Asegurar que `/_astro/_slug_.astro_astro_type_script_index_0_lang.Crpxb` sale minificado.
- [x] Mover scripts inline a archivos y minificar.
- [x] Validar con auditoría que ya no hay JS sin minificar.

## 4) Performance objetivo (TTFB ≤ 0.8s)
- [x] Activar compresión **Brotli**/**Gzip**.
- [x] Code-splitting y `preload` del CSS crítico.
- [x] Imágenes en **WebP/AVIF**, `loading="lazy"`, `decoding="async"`.
- [x] Medir en WebPageTest/PageSpeed: TTFB ≤ 0.8s, LCP ≤ 2.5s (4G).

## 5) Cache-Control / Expires
- [x] Estáticos (`.css`, `.js`, `.woff2`) con: `Cache-Control: public, max-age=31536000, immutable`.
- [x] Imágenes (`.webp`, `.avif`, `.png`, `.jpg`, `.svg`) mismo header largo.
- [x] HTML con `no-store` o max-age bajo + revalidación.
- [x] Comprobar con `curl -I`/audit.

**NGINX ejemplo**
```
location ~* \.(?:css|js|woff2?|ttf)$ { add_header Cache-Control "public, max-age=31536000, immutable"; }
location ~* \.(?:png|jpg|jpeg|gif|webp|avif|svg)$ { add_header Cache-Control "public, max-age=31536000, immutable"; }
location = / { add_header Cache-Control "no-store"; }
```

## 6) Sitemap y frescura
- [x] Confirmar `sitemap.xml` actualizado tras cada deploy.
- [x] Ping automático a Search Console.
- [x] Ver "Cobertura"/"Páginas" con indexación correcta de partidos nuevos.

## 7) Títulos/H1/Metas con keyword raíz
- [x] Plantilla de partido:
  - **Title**: `Pronósticos de fútbol: {Local} vs {Visitante} – {Liga} {Jornada/Fecha}`
  - **Meta description** (≤160): incluir "pronósticos de partidos/fútbol" + CTA.
  - **H1** único: `Pronósticos {Local} vs {Visitante} – {Liga} ({fecha})`
- [x] Validar presencia de keywords y que hay 1 solo H1.

**Head snippet**
```html
<link rel="canonical" href={Astro.url.toString()} />
<meta name="description" content="Pronósticos de fútbol: {Local} vs {Visitante} – análisis con IA, cuotas y valor esperado. Picks con fair odds y gestión de riesgo." />
```

## 8) Estructura H2/H3 + FAQs
- [x] Añadir secciones por partido:
  - H2 "Pronóstico y valor esperado"
  - H2 "Cuotas y fair odds"
  - H2 "Datos y forma reciente"
  - H2 "Probabilidades (modelo IA)"
  - H2 "Pick recomendado y stake"
  - H2 "Preguntas frecuentes"
- [x] Implementar **Schema FAQPage** (JSON-LD) válido.

**FAQ JSON-LD ejemplo**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"¿Dónde ver el partido?","acceptedAnswer":{"@type":"Answer","text":"..." }},
    {"@type":"Question","name":"¿Qué cuota tiene más valor?","acceptedAnswer":{"@type":"Answer","text":"..." }},
    {"@type":"Question","name":"¿Cuál es el pick recomendado y stake?","acceptedAnswer":{"@type":"Answer","text":"..." }}
  ]
}
```

## 9) Schema SportsEvent (por partido)
- [x] Añadir JSON-LD:
```json
{
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "{Local} vs {Visitante}",
  "sport": "Soccer",
  "startDate": "{ISO datetime}",
  "location": {"@type":"Place","name":"{Estadio}","address":"{Ciudad, País}"},
  "homeTeam": {"@type":"SportsTeam","name":"{Local}"},
  "awayTeam": {"@type":"SportsTeam","name":"{Visitante}"},
  "url": "{URL canónica del partido}"
}
```
- [x] Validar en Rich Results Test (sin errores/avisos).

## 10) Enlazado interno (clusters)
- [x] Bloques automáticos:
  - "Más pronósticos de **{Liga}**" (3–5 items)
  - "Próximos partidos de **{Equipo}**"
  - "Guías y metodología"
- [x] Asegurar profundidad ≤ 3 clics desde cualquier partido.

## 11) Enlaces externos de autoridad
- [x] Mantener 4–8 salientes no afiliados (ligas/estadísticas/medios).
- [x] Chequeo 404/500 y `rel="sponsored"` cuando aplique.

## 12) Imágenes (ALT, dimensiones, formatos)
- [x] `alt` descriptivos; `width/height` fijos para evitar CLS.
- [x] Exportar a WebP/AVIF en build.
- [x] Chequear CLS < 0.1 y peso total reducido.

## 13) Seguridad y headers
- [x] HTTPS forzado (HSTS si aplica).
- [x] Desactivar directory listing.
- [x] Añadir:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`

## 14) CI/CD con presupuestos
- [x] Workflow que ejecute tras build:
  - Lighthouse CI con presupuestos: SEO ≥ 95, TTFB ≤ 0.8s, LCP ≤ 2.5s.
  - Pa11y/axe para a11y básica.
- [x] Bloquear deploy si no se cumplen presupuestos.

---

## Criterios de aceptación (resumen)
- [x] `robots.txt` válido y accesible.
- [x] Sin JS sin minificar en auditorías.
- [x] Headers de caché correctos en estáticos e imágenes.
- [x] TTFB ≤ 0.8s y LCP ≤ 2.5s (lab/field).
- [x] Title/H1/Description con "pronósticos de partidos/fútbol" + enfrentamiento.
- [x] Schema `SportsEvent` + `FAQPage` válidos.
- [x] Clusters internos activos y sin enlaces rotos.
