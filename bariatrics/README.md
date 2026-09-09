# CHN Bariatric page — Cloudflare Pages test

A static rebuild of the Community Health Network
["Bariatric and Medical Weight Loss Services"](https://www.ecommunity.com/services/community-bariatric-and-medical-weight-loss-services)
page, built with [Astro](https://astro.build) and deployed on Cloudflare Pages.

This is a deployment pipeline test, not the official site.

This project lives in the `bariatrics/` subdirectory of the `IndyCrew/cloudflare`
repo. Run all commands from `bariatrics/`.

## Local development

```bash
cd bariatrics
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs static site to ./dist
npm run preview  # serve the built ./dist locally
```

## Deploy (Cloudflare Pages)

Connected repo: `IndyCrew/cloudflare`. Cloudflare Pages build settings:

| Setting                     | Value           |
| --------------------------- | --------------- |
| Root directory (advanced)   | `bariatrics`    |
| Framework preset            | Astro           |
| Build command               | `npm run build` |
| Build output directory      | `dist`          |
| Node version (`NODE_VERSION`) | `20` or newer |

The **Root directory** setting is what makes Cloudflare build from
`bariatrics/` instead of the repo root.

Every push to the production branch triggers a build and deploy; other
branches get preview URLs.
