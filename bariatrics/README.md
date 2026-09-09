# CHN Bariatric page — Cloudflare Workers test

A rebuild of the Community Health Network
["Bariatric and Medical Weight Loss Services"](https://www.ecommunity.com/services/community-bariatric-and-medical-weight-loss-services)
page, built with [Astro](https://astro.build) and deployed to Cloudflare
Workers (static assets + one server route).

This is a deployment pipeline test, not the official site.

This project lives in the `bariatrics/` subdirectory of the `IndyCrew/cloudflare`
repo. Run all commands from `bariatrics/`.

## Local development

```bash
cd bariatrics
npm install
cp .dev.vars.example .dev.vars   # then paste the Databricks client secret

npm run dev      # http://localhost:4321 — pages + /api/genie (via platformProxy)
npm run build    # -> ./dist  (dist/client static assets, dist/server worker)
```

`npm run dev` serves the API route too, reading secrets from `.dev.vars`. To run
it under the real Workers runtime instead:

```bash
npm run build && npx wrangler dev   # http://localhost:8788
```

## Architecture

- `src/pages/index.astro` is prerendered (static).
- `src/pages/api/genie.ts` sets `export const prerender = false` and runs as a
  Cloudflare Worker route. `@astrojs/cloudflare` emits the Worker; the rest of
  `dist/` is served as static assets.

## Databricks Genie ("Information at a glance")

`src/pages/api/genie.ts` authenticates a Microsoft Entra service principal
(`client_credentials`, scope `2ff814a6-…/.default`) and proxies questions to a
Databricks Genie space: `start-conversation` → poll the message → return the
`attachments[].text.content`. The tenant ID, client ID, workspace URL and space
ID have defaults baked in; **only the client secret must be configured**.

| Variable | Where | Notes |
| --- | --- | --- |
| `DATABRICKS_CLIENT_SECRET` | Worker → Settings → Variables and Secrets → **Secret (encrypted)** | required |
| `DATABRICKS_TENANT_ID` | optional plaintext var | overrides the default |
| `DATABRICKS_CLIENT_ID` | optional plaintext var | overrides the default |
| `DATABRICKS_WORKSPACE_URL` | optional plaintext var | overrides the default |
| `DATABRICKS_GENIE_SPACE_ID` | optional plaintext var | overrides the default |
| `DATABRICKS_GENIE_MODE` | optional | `CHAT` (default) or `AGENT` |

Genie in this space answers from Community's website-content dataset, so it
handles content questions well and declines pure medical questions. Its answer
quality/consistency is tuned on the Databricks side, not here.

## Deploy (Cloudflare Workers, connected to Git)

Connected repo: `IndyCrew/cloudflare`. Worker build settings:

| Setting | Value |
| --- | --- |
| Root directory | `bariatrics` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

`wrangler.jsonc` pins the Worker name (`cloudflare`), `compatibility_date`, and
`nodejs_compat`. `@astrojs/cloudflare` v14 supplies the Worker entrypoint and
assets binding — no `main`/`assets` fields needed.

Every push to `main` triggers a build + deploy.
