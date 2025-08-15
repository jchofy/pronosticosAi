import 'dotenv/config';
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import auth from 'auth-astro';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind(), auth()],
}); 