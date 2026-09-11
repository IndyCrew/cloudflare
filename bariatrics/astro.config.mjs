// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Static by default; individual routes opt into server rendering with
// `export const prerender = false` (see src/pages/api/genie.ts). Deployed to
// Cloudflare Workers with static assets — the adapter emits dist/_worker.js.
//
// ASTRO_BASE_PATH lets the same build be mounted under a subpath (e.g. `/app`
// for the Webflow Cloud deploy) without affecting the root-path Cloudflare
// Workers deploy, which doesn't set it.
const rawBase = process.env.ASTRO_BASE_PATH;
const base = rawBase && !rawBase.endsWith('/') ? `${rawBase}/` : rawBase;

export default defineConfig({
  site: 'https://cloudflare.indyadrian.workers.dev',
  output: 'static',
  ...(base ? { base } : {}),
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
});
