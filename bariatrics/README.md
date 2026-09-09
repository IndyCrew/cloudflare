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
npm run dev      # http://localhost:4321  (static pages only)
npm run build    # outputs static site to ./dist
```

The "Information at a glance" panel calls `/api/genie`, a Cloudflare Pages
Function (`functions/api/genie.ts`). `astro dev` does not run it — to exercise
the function locally, build first and serve with Wrangler:

```bash
npm run build
cp .dev.vars.example .dev.vars   # then paste the Databricks client secret
npx wrangler pages dev dist --compatibility-date=2026-09-01   # http://localhost:8788
```

## Databricks Genie ("Information at a glance")

`functions/api/genie.ts` authenticates a Microsoft Entra service principal and
proxies questions to a Databricks Genie space. All identifiers have defaults
baked into the function; **only the client secret must be configured**:

| Variable | Where | Notes |
| --- | --- | --- |
| `DATABRICKS_CLIENT_SECRET` | Pages → Settings → Variables and Secrets → **Secret** | required |
| `DATABRICKS_TENANT_ID` | optional plaintext var | overrides the default |
| `DATABRICKS_CLIENT_ID` | optional plaintext var | overrides the default |
| `DATABRICKS_WORKSPACE_URL` | optional plaintext var | overrides the default |
| `DATABRICKS_GENIE_SPACE_ID` | optional plaintext var | overrides the default |

Set the secret for **both** Production and Preview environments, then redeploy.

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
