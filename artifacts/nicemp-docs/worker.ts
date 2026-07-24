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
// Tracks AI calls per browser using first-party cookies:
//   ai_obj_rate=YYYY-MM-DD:N   (prompt-objective)
//   ai_asst_rate=YYYY-MM-DD:N  (assistant)
// Both reset automatically at UTC day rollover. 60 calls/day per browser.

const AI_RATE_LIMIT = 60;
const AI_RATE_COOKIE = "ai_obj_rate";
const AI_ASST_RATE_COOKIE = "ai_asst_rate";

function parseRateCookie(cookieHeader: string | null, cookieName: string): { date: string; count: number } {
  if (!cookieHeader) return { date: "", count: 0 };
  const regex = new RegExp(`${cookieName}=([^;]+)`);
  const match = cookieHeader.match(regex);
  if (!match) return { date: "", count: 0 };
  const [date = "", rawCount = "0"] = match[1].split(":");
  return { date, count: parseInt(rawCount, 10) || 0 };
}

function rateSetCookieHeader(cookieName: string, date: string, count: number): string {
  return `${cookieName}=${date}:${count}; Path=/; SameSite=Strict; Max-Age=86400`;
}

/** POST /api/ai/prompt-objective — generates "Objetivo da alteração" text via Workers AI */
async function handlePromptObjective(request: Request, env: Env): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

  // ── Rate limit ────────────────────────────────────────────────────────────
  const { date, count } = parseRateCookie(request.headers.get("Cookie"), AI_RATE_COOKIE);
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
        "Set-Cookie": rateSetCookieHeader(AI_RATE_COOKIE, today, todayCount + 1),
      },
    },
  );
}

/** POST /api/ai/module-summary — plain-language summary of what a module does */
async function handleModuleSummary(request: Request, env: Env): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);

  // ── Rate limit (shared assistant cookie) ──────────────────────────────────
  const AI_MOD_COOKIE = "ai_mod_rate";
  const { date, count } = parseRateCookie(request.headers.get("Cookie"), AI_MOD_COOKIE);
  const todayCount = date === today ? count : 0;
  if (todayCount >= AI_RATE_LIMIT) {
    return new Response(
      JSON.stringify({ summary: null, fallback: true, limitReached: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { moduleName?: string; entities?: { name: string; description?: string }[] };
  try {
    body = await request.json() as typeof body;
  } catch {
    return new Response(
      JSON.stringify({ summary: null, fallback: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const moduleName = (body.moduleName ?? "").trim();
  const entities   = body.entities ?? [];

  if (!moduleName) {
    return new Response(
      JSON.stringify({ summary: null, fallback: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const entityLines = entities
    .slice(0, 30) // cap to keep prompt compact
    .map((e) => `- ${e.name}${e.description ? `: ${e.description.slice(0, 120)}` : ""}`)
    .join("\n");

  const systemPrompt =
    `Você é um assistente que explica o código de um projeto de software para pessoas sem conhecimento técnico. ` +
    `Responda sempre em português, de forma simples, clara e acolhedora.`;

  const userPrompt =
    `O módulo abaixo faz parte de um site ou aplicação. ` +
    `Com base nas telas, componentes, hooks e APIs listados, explique em até 3 frases o que este módulo faz ` +
    `para o usuário final — sem citar nomes técnicos de arquivos, sem listar itens, ` +
    `usando linguagem que qualquer pessoa entenderia.\n\n` +
    `Módulo: ${moduleName}\n` +
    `Elementos:\n${entityLines || "(nenhum elemento descrito)"}\n\n` +
    `Escreva apenas o parágrafo explicativo, sem saudação, sem título.`;

  // ── Call Workers AI ───────────────────────────────────────────────────────
  let summary: string | null = null;
  try {
    if (!env.AI) throw new Error("AI binding unavailable");
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
    }) as { response?: string };
    summary = result.response?.trim() ?? null;
  } catch {
    return new Response(
      JSON.stringify({ summary: null, fallback: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ summary }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": rateSetCookieHeader(AI_MOD_COOKIE, today, todayCount + 1),
      },
    },
  );
}

/** POST /api/ai/assistant — conversational assistant aware of the loaded project */
async function handleAssistant(request: Request, env: Env): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);

  // ── Rate limit ────────────────────────────────────────────────────────────
  const { date, count } = parseRateCookie(request.headers.get("Cookie"), AI_ASST_RATE_COOKIE);
  const todayCount = date === today ? count : 0;
  if (todayCount >= AI_RATE_LIMIT) {
    return new Response(
      JSON.stringify({ reply: null, fallback: true, limitReached: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { message?: string; context?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return new Response(
      JSON.stringify({ reply: null, fallback: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const message = (body.message ?? "").trim();
  const context = (body.context ?? "Nenhum projeto carregado.").trim();

  if (!message) {
    return new Response(
      JSON.stringify({ reply: null, fallback: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Build prompts ─────────────────────────────────────────────────────────
  const systemPrompt =
    `Você é um assistente técnico integrado ao NicEmp Docs, uma plataforma de documentação de projetos de software. ` +
    `Responda sempre em português, de forma clara e objetiva.\n\n` +
    `Contexto do projeto carregado:\n${context}\n\n` +
    `Regras obrigatórias:\n` +
    `1. Responda SOMENTE com base no contexto acima. Não invente nomes de arquivo, módulo, tecnologia ou entidade que não estejam no contexto.\n` +
    `2. Se a pergunta pedir para localizar algo (ex.: "onde fica X"), indique o módulo ou tipo de entidade mais provável com base no contexto, deixando CLARO que é uma sugestão a confirmar no Organograma ou Explorador — nunca afirme com certeza absoluta.\n` +
    `3. Se a pergunta for sobre como formular um prompt para o Replit, oriente o usuário a usar o botão "Gerar Prompt" na página de detalhes da entidade correspondente, em vez de tentar escrever o prompt inteiro no chat.\n` +
    `4. Se a pergunta estiver fora do escopo do projeto (ex.: perguntas gerais de programação sem relação com o contexto), responda brevemente dizendo que só pode ajudar com o projeto carregado e sugira uma busca no Explorador ao vivo.\n` +
    `5. Seja conciso: no máximo 5 frases por resposta, sem markdown pesado.`;

  // ── Call Workers AI ───────────────────────────────────────────────────────
  let reply: string | null = null;
  try {
    if (!env.AI) throw new Error("AI binding unavailable");
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: message },
      ],
    }) as { response?: string };
    reply = result.response?.trim() ?? null;
  } catch {
    return new Response(
      JSON.stringify({ reply: null, fallback: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Success — increment rate counter ──────────────────────────────────────
  return new Response(
    JSON.stringify({ reply }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": rateSetCookieHeader(AI_ASST_RATE_COOKIE, today, todayCount + 1),
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
    if (request.method === "POST" && pathname === "/api/ai/assistant") {
      return handleAssistant(request, env);
    }
    if (request.method === "POST" && pathname === "/api/ai/module-summary") {
      return handleModuleSummary(request, env);
    }

    // ── Static assets (Vite build output) ────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
