# CHN Bariatric page — Cloudflare Pages test

A static rebuild of the Community Health Network
["Bariatric and Medical Weight Loss Services"](https://www.ecommunity.com/services/community-bariatric-and-medical-weight-loss-services)
page, built with [Astro](https://astro.build) and deployed on Cloudflare Pages.

This is a deployment pipeline test, not the official site.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs static site to ./dist
npm run preview  # serve the built ./dist locally
```

## Deploy (Cloudflare Pages)

Connected repo: `IndyCrew/cloudflare`. Cloudflare Pages build settings:

| Setting            | Value           |
| ------------------ | --------------- |
| Framework preset   | Astro           |
| Build command      | `npm run build` |
| Build output dir   | `dist`          |
| Node version       | 20 or newer     |

Every push to the production branch triggers a build and deploy; other
branches get preview URLs.
