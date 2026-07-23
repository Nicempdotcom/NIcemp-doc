---
name: Vite proxy / api-server port alignment
description: In Replit multi-artifact setup, all browser traffic goes through the nicemp-docs Vite dev server; the Vite proxy must target the same port the api-server binds to.
---

## Rule
The nicemp-docs Vite proxy (`/api` → `localhost:${API_PORT ?? 3001}`) and the api-server must agree on the same port. The api-server reads `API_PORT` first, then falls back to the Replit-assigned `PORT`.

**Why:** In Replit's artifact routing, Replit's internal pid1 proxy connects all browser traffic to the nicemp-docs Vite server (port 26009). Vite then proxies `/api` requests to the target port. If the api-server is on a different port (e.g., Replit-assigned 8080) the requests silently fail and the browser sees the Cloudflare Worker's `missing_configuration` error from stale React state.

**How to apply:** Set `API_PORT=3001` as a shared env var. Update `artifacts/api-server/.replit-artifact/artifact.toml` `localPort` to 3001. Both the api-server and the Vite proxy then use port 3001. Restart both workflows after changing.
