// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Static by default; individual routes opt into server rendering with
// `export const prerender = false` (see src/pages/api/genie.ts). Deployed to
// Cloudflare Workers with static assets — the adapter emits dist/_worker.js.
//
// Also deployed to Webflow Cloud under a `/app` subpath — Webflow's builder
// discards this file and generates its own astro.config.mjs, setting `base`
// itself from its COSMIC_MOUNT_PATH env var, so that mount point isn't
// configured here. Asset/link paths use src/lib/base.ts's `withBase()`
// instead of hardcoding root-relative paths, so they work under either base.
export default defineConfig({
  site: 'https://cloudflare.indyadrian.workers.dev',
  output: 'static',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
});
