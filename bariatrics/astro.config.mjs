// @ts-check
import { defineConfig } from 'astro/config';

// Static output — Cloudflare Pages serves the contents of ./dist directly.
export default defineConfig({
  site: 'https://cloudflare.pages.dev',
  output: 'static',
});
