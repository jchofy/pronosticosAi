import 'dotenv/config';
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import auth from 'auth-astro';
import vercel from '@astrojs/vercel/serverless';
import react from '@astrojs/react';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind(), auth(), react()],
  vite: {
    build: {
      minify: 'esbuild',
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          compact: true,
          manualChunks: (id) => {
            if (id.includes('node_modules/react')) return 'react';
            if (id.includes('node_modules/@astrojs')) return 'astro';
            if (id.includes('node_modules/')) return 'vendor';
            return null;
          }
        }
      },
      target: 'es2020',
      modulePreload: { polyfill: false },
      chunkSizeWarningLimit: 1000
    }
  },
  compressHTML: true
}); 