/**
 * POST /api/genie   { "question": "...", "conversationId"?: "..." }
 *
 * Proxies a question to a Databricks Genie space using a Microsoft Entra
 * (Azure AD) service principal. Runs as a Cloudflare Worker route (the rest of
 * the site is prerendered).
 *
 * Configure on the Worker (dashboard → Settings → Variables and Secrets, or
 * `wrangler secret put`):
 *   DATABRICKS_CLIENT_SECRET    secret / encrypted — required
 *   DATABRICKS_TENANT_ID        plaintext, optional override
 *   DATABRICKS_CLIENT_ID        plaintext, optional override
 *   DATABRICKS_WORKSPACE_URL    plaintext, optional override
 *   DATABRICKS_GENIE_SPACE_ID   plaintext, optional override
 *   DATABRICKS_GENIE_MODE       "CHAT" (default) or "AGENT"
 */
import type { APIRoute } from "astro";
import { env as runtimeEnv } from "cloudflare:workers";

export const prerender = false;

interface Env {
  DATABRICKS_CLIENT_SECRET?: string;
  DATABRICKS_TENANT_ID?: string;
  DATABRICKS_CLIENT_ID?: string;
  DATABRICKS_WORKSPACE_URL?: string;
  DATABRICKS_GENIE_SPACE_ID?: string;
  DATABRICKS_GENIE_MODE?: string;
}

// Fixed Azure application ID for the Azure Databricks programmatic-access API.
const DATABRICKS_RESOURCE_ID = "2ff814a6-3304-4ab8-85cb-cd0e6f879c1d";

const DEFAULTS = {
  tenantId: "2bec672b-29a0-4df5-ab85-f37e050b36ef",
  clientId: "3d662f3a-21b8-4ee5-90e7-7b3f756cf1bc",
  workspaceUrl: "https://adb-353723785162120.0.azuredatabricks.net",
  spaceId: "01f10540b4b1184db8db686e85766343",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Cheap per-isolate token cache. Not durable, just avoids re-auth on bursts.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(env: Env): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;

  const tenantId = env.DATABRICKS_TENANT_ID || DEFAULTS.tenantId;
  const clientId = env.DATABRICKS_CLIENT_ID || DEFAULTS.clientId;
  const clientSecret = env.DATABRICKS_CLIENT_SECRET;
  if (!clientSecret) {
    throw new HttpError(500, "DATABRICKS_CLIENT_SECRET is not configured.");
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: `${DATABRICKS_RESOURCE_ID}/.default`,
      }),
    },
  );
  if (!res.ok) {
    throw new HttpError(502, `Azure AD token request failed (${res.status}).`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

interface GenieMessage {
  status: string;
  content?: string;
  error?: { error?: string; type?: string };
  attachments?: Array<{
    attachment_id?: string;
    text?: { content?: string };
    query?: { description?: string; query?: string };
  }>;
}

async function genieFetch(
  env: Env,
  token: string,
  path: string,
  init?: RequestInit,
): Promise<any> {
  const base = (env.DATABRICKS_WORKSPACE_URL || DEFAULTS.workspaceUrl).replace(/\/$/, "");
  const res = await fetch(`${base}/api/2.0/genie${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(502, `Genie API ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

function answerFromMessage(msg: GenieMessage): string | null {
  const parts: string[] = [];
  for (const a of msg.attachments || []) {
    if (a.text?.content) parts.push(a.text.content);
    else if (a.query?.description) parts.push(a.query.description);
  }
  if (!parts.length && msg.content) parts.push(msg.content);
  return parts.length ? parts.join("\n\n") : null;
}

async function pollMessage(
  env: Env,
  token: string,
  spaceId: string,
  conversationId: string,
  messageId: string,
): Promise<GenieMessage> {
  const deadline = Date.now() + 55_000;
  let delay = 800;
  while (Date.now() < deadline) {
    const msg = (await genieFetch(
      env,
      token,
      `/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}`,
    )) as GenieMessage;
    if (msg.status === "COMPLETED") return msg;
    if (msg.status === "FAILED" || msg.status === "CANCELLED") {
      throw new HttpError(502, msg.error?.error || `Genie message ${msg.status}.`);
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 3000);
  }
  throw new HttpError(504, "Genie took too long to respond.");
}

export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: CORS });

// GET /api/genie — readiness check. Booleans only, never names or values.
export const GET: APIRoute = () => {
  const env = runtimeEnv as unknown as Env;
  return json({ ready: Boolean(env.DATABRICKS_CLIENT_SECRET) });
};

export const POST: APIRoute = async ({ request }) => {
  const env = runtimeEnv as unknown as Env;

  let body: { question?: string; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const question = (body.question || "").trim();
  if (!question) return json({ error: "A question is required." }, 400);
  if (question.length > 1000) return json({ error: "Question is too long." }, 400);

  const spaceId = env.DATABRICKS_GENIE_SPACE_ID || DEFAULTS.spaceId;
  // CHAT = lightweight conversational retrieval over the space's content
  // (better fit for this public panel). Set DATABRICKS_GENIE_MODE=AGENT for
  // Genie's full tool/SQL reasoning path.
  const mode = (env.DATABRICKS_GENIE_MODE || "CHAT").toUpperCase();

  try {
    const token = await getToken(env);

    let conversationId = body.conversationId;
    let messageId: string | undefined;

    if (conversationId) {
      const created = await genieFetch(
        env,
        token,
        `/spaces/${spaceId}/conversations/${conversationId}/messages`,
        { method: "POST", body: JSON.stringify({ content: question }) },
      );
      messageId = created.message_id || created.id;
    } else {
      const started = await genieFetch(
        env,
        token,
        `/spaces/${spaceId}/start-conversation`,
        {
          method: "POST",
          body: JSON.stringify({ content: question, conversation_type: mode }),
        },
      );
      conversationId = started.conversation_id;
      messageId =
        started.message_id || started.message?.id || started.message?.message_id;
    }

    if (!conversationId || !messageId) {
      throw new HttpError(502, "Genie did not return a conversation handle.");
    }

    const msg = await pollMessage(env, token, spaceId, conversationId, messageId);
    const answer = answerFromMessage(msg);
    if (!answer) throw new HttpError(502, "Genie returned an empty response.");

    return json({ answer, conversationId });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message =
      err instanceof HttpError ? err.message : "Unexpected error contacting Genie.";
    return json({ error: message }, status);
  }
};
