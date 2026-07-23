/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Worker — NicEmp Docs
 *
 * Handles server-side API routes and delegates everything else to the static
 * asset bundle (Vite build output). This lets the project run fully on
 * Cloudflare without a separate Express backend.
 *
 * Routes handled here:
 *   POST /api/github/device/code   — initiates GitHub Device Flow
 *   POST /api/github/device/token  — polls for an OAuth access token
 *
 * Secrets required (set in Cloudflare dashboard or via `wrangler secret put`):
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 */

interface Env {
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
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

    // ── Static assets (Vite build output) ────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
