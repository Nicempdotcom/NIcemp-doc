import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * POST /github/device/code
 * Initiates the GitHub Device Flow. Reads GITHUB_CLIENT_ID from server env
 * and forwards the device code response to the client.
 */
router.post("/github/device/code", async (_req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({
      error: "server_misconfigured",
      error_description:
        "GITHUB_CLIENT_ID não está configurado no servidor. " +
        "Adicione o secret GITHUB_CLIENT_ID nas configurações do Replit.",
    });
    return;
  }

  try {
    const upstream = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, scope: "repo read:user" }),
    });
    const data = await upstream.json() as Record<string, unknown>;
    res.status(upstream.ok ? 200 : 502).json(data);
  } catch {
    res.status(502).json({
      error: "upstream_error",
      error_description: "Falha ao contactar github.com.",
    });
  }
});

/**
 * POST /github/device/token
 * Polls GitHub for an access token. Reads credentials from server env.
 * Never logs access_token or client_secret.
 */
router.post("/github/device/token", async (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({
      error: "server_misconfigured",
      error_description:
        "GITHUB_CLIENT_ID ou GITHUB_CLIENT_SECRET não estão configurados no servidor.",
    });
    return;
  }

  const { device_code } = req.body as { device_code?: string };
  if (!device_code) {
    res.status(400).json({ error: "bad_request", error_description: "device_code obrigatório." });
    return;
  }

  try {
    const upstream = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    const data = await upstream.json() as Record<string, unknown>;
    // Forward the response (access_token or error fields) without logging sensitive values
    res.status(upstream.ok ? 200 : 502).json(data);
  } catch {
    res.status(502).json({
      error: "upstream_error",
      error_description: "Falha ao contactar github.com.",
    });
  }
});

export default router;
