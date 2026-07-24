/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Worker — NicEmp Docs
 *
 * Handles server-side API routes and delegates everything else to the static
 * asset bundle (Vite build output). This lets the project run fully on
 * Cloudflare without a separate Express backend.
 *
 * Routes handled here:
 *   POST /api/github/device/code      — initiates GitHub Device Flow
 *   POST /api/github/device/token     — polls for an OAuth access token
 *   GET  /api/ai/ping                 — Workers AI smoke-test
 *   POST /api/ai/prompt-objective     — generates "Objetivo da alteração" text via Workers AI
 *
 * Secrets required (set in Cloudflare dashboard or via `wrangler secret put`):
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 */

interface Env {
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  /** Workers AI binding — provisioned by Cloudflare, declared in wrangler.jsonc */
  AI: Ai;
}

// Worker console output is only visible to the developer (wrangler dev / wrangler tail)
// and never reaches end users, so logging is always safe here.
function log(...args: unknown[]): void {
  console.log("[GitHub Worker]", ...args);
}

/** Parse a response body safely — never throws "Unexpected end of JSON input". */
async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  log("GitHub status:", res.status, "body:", text.slice(0, 200));
  if (!text.trim()) {
    throw new Error(`GitHub returned an empty body (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GitHub returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(error: string, message: string, status = 500): Response {
  return jsonResponse({ error, message }, status);
}

/** POST /api/github/device/code */
async function handleDeviceCode(env: Env): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID) {
    return errorResponse(
      "missing_configuration",
      "GITHUB_CLIENT_ID is not configured in this Worker.",
    );
  }

  const targetUrl = "https://github.com/login/device/code";
  const requestBody = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: "repo read:user",
  });
  const requestHeaders = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // ── Pre-flight diagnostic log ──────────────────────────────────────────────
  log("→ Request:", {
    url: targetUrl,
    method: "POST",
    headers: requestHeaders,
    body: `client_id=[REDACTED] scope=${requestBody.get("scope")}`,
  });

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("✗ fetch() threw:", message);
    return errorResponse("github_request_failed", `fetch() threw: ${message}`, 502);
  }

  // ── Full upstream diagnostic log ───────────────────────────────────────────
  const upstreamHeaders: Record<string, string> = {};
  upstream.headers.forEach((value, key) => { upstreamHeaders[key] = value; });
  const upstreamBody = await upstream.text();

  log("← Response:", {
    status: upstream.status,
    statusText: upstream.statusText,
    url: upstream.url,
    headers: upstreamHeaders,
    body: upstreamBody,
  });

  // ── On non-2xx, return full diagnostic payload to the caller ───────────────
  if (!upstream.ok) {
    return jsonResponse(
      {
        error: "upstream_error",
        upstream_status: upstream.status,
        upstream_status_text: upstream.statusText,
        upstream_url: upstream.url,
        upstream_headers: upstreamHeaders,
        upstream_body: upstreamBody,
      },
      502,
    );
  }

  // ── Parse the success body ─────────────────────────────────────────────────
  if (!upstreamBody.trim()) {
    return errorResponse("github_empty_response", `GitHub returned an empty body (HTTP ${upstream.status})`, 502);
  }
  let data: unknown;
  try {
    data = JSON.parse(upstreamBody);
  } catch {
    return errorResponse("github_invalid_json", `GitHub returned non-JSON (HTTP ${upstream.status}): ${upstreamBody.slice(0, 300)}`, 502);
  }

  return jsonResponse(data);
}

/** POST /api/github/device/token */
async function handleDeviceToken(request: Request, env: Env): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return errorResponse(
      "missing_configuration",
      "GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not configured in this Worker.",
    );
  }

  let deviceCode: string | undefined;
  try {
    const body = await request.json() as { device_code?: string };
    deviceCode = body.device_code;
  } catch {
    return errorResponse("bad_request", "Request body must be valid JSON.", 400);
  }

  if (!deviceCode) {
    return errorResponse("bad_request", "device_code is required.", 400);
  }

  let data: unknown;
  try {
    const upstream = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    data = await safeJson(upstream);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("github_request_failed", message, 502);
  }

  // Forward the response — access_token (if present) is never logged
  return jsonResponse(data);
}

// ── Rate-limit helpers ────────────────────────────────────────────────────────
// Tracks AI objective calls per browser using a first-party cookie:
//   ai_obj_rate=YYYY-MM-DD:N
// Resets automatically at UTC day rollover. 60 calls/day per browser.

const AI_RATE_LIMIT = 60;
const AI_RATE_COOKIE = "ai_obj_rate";

function parseRateCookie(cookieHeader: string | null): { date: string; count: number } {
  if (!cookieHeader) return { date: "", count: 0 };
  const match = cookieHeader.match(/ai_obj_rate=([^;]+)/);
  if (!match) return { date: "", count: 0 };
  const [date = "", rawCount = "0"] = match[1].split(":");
  return { date, count: parseInt(rawCount, 10) || 0 };
}

function rateSetCookieHeader(date: string, count: number): string {
  return `${AI_RATE_COOKIE}=${date}:${count}; Path=/; SameSite=Strict; Max-Age=86400`;
}

/** POST /api/ai/prompt-objective — generates "Objetivo da alteração" text via Workers AI */
async function handlePromptObjective(request: Request, env: Env): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

  // ── Rate limit ────────────────────────────────────────────────────────────
  const { date, count } = parseRateCookie(request.headers.get("Cookie"));
  const todayCount = date === today ? count : 0;
  if (todayCount >= AI_RATE_LIMIT) {
    return new Response(
      JSON.stringify({ objective: null, fallback: true, limitReached: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    kind?: string;
    name?: string;
    location?: string;
    module?: string;
    description?: string;
    dependencies?: string;
    userRequest?: string;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    // Malformed JSON — fail silently, never 500
    return new Response(
      JSON.stringify({ objective: null, fallback: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const {
    kind        = "",
    name        = "",
    location    = "",
    module      = "",
    description = "",
    dependencies = "",
    userRequest  = "",
  } = body;

  // ── Build prompt ──────────────────────────────────────────────────────────
  const systemPrompt =
    `Você é um assistente técnico de documentação de software. ` +
    `Sua tarefa é escrever a seção "Objetivo da alteração" de um prompt de engenharia de software.\n\n` +
    `Regras obrigatórias:\n` +
    `1. Escreva um parágrafo objetivo e específico descrevendo a mudança pedida, cruzando com a descrição da entidade fornecida.\n` +
    `2. Nunca invente nomes de arquivo, tecnologia ou dependência que não estejam nos dados recebidos.\n` +
    `3. Nunca sugira mudanças em arquivos de configuração global, banco de dados, migrations ou qualquer escopo fora do que o usuário pediu explicitamente.\n` +
    `4. Responda em no máximo 4 frases. Sem markdown. Sem saudação. Apenas o parágrafo do objetivo.`;

  const userPrompt =
    `Entidade:\n` +
    `- Tipo: ${kind}\n` +
    `- Nome: ${name}\n` +
    `- Localização: ${location}\n` +
    `- Módulo: ${module}\n` +
    `- Descrição: ${description}\n` +
    `- Dependências: ${dependencies}\n\n` +
    `Pedido do usuário: ${userRequest}\n\n` +
    `Escreva o objetivo da alteração.`;

  // ── Call Workers AI ───────────────────────────────────────────────────────
  let objective: string | null = null;
  try {
    if (!env.AI) throw new Error("AI binding unavailable");
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
    }) as { response?: string };
    objective = result.response?.trim() ?? null;
  } catch {
    // Any failure — return fallback, never propagate as 500
    return new Response(
      JSON.stringify({ objective: null, fallback: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Success — increment rate counter ──────────────────────────────────────
  return new Response(
    JSON.stringify({ objective }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": rateSetCookieHeader(today, todayCount + 1),
      },
    },
  );
}

/** GET /api/ai/ping — smoke-test for the Workers AI binding */
async function handleAiPing(env: Env): Promise<Response> {
  if (!env.AI) {
    return errorResponse(
      "missing_configuration",
      "Workers AI binding (AI) is not available in this environment.",
    );
  }

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [{ role: "user", content: "Responda apenas: ok" }],
    }) as { response?: string };

    return jsonResponse({ ok: true, response: result.response ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("ai_error", message, 502);
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // ── API routes ────────────────────────────────────────────────────────────
    if (request.method === "POST" && pathname === "/api/github/device/code") {
      return handleDeviceCode(env);
    }
    if (request.method === "POST" && pathname === "/api/github/device/token") {
      return handleDeviceToken(request, env);
    }
    if (request.method === "GET" && pathname === "/api/ai/ping") {
      return handleAiPing(env);
    }
    if (request.method === "POST" && pathname === "/api/ai/prompt-objective") {
      return handlePromptObjective(request, env);
    }

    // ── Static assets (Vite build output) ────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
