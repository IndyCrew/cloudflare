// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Static by default; individual routes opt into server rendering with
// `export const prerender = false` (see src/pages/api/genie.ts). Deployed to
// Cloudflare Workers with static assets — the adapter emits dist/_worker.js.
export default defineConfig({
  site: 'https://cloudflare.indyadrian.workers.dev',
  output: 'static',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
});
